import { zodToJsonSchema } from "zod-to-json-schema";
import * as testCaseRepository from "@/server/repositories/test-case-repository";
import { requireProjectAccess } from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";
import { getAnthropicClient, AI_MODEL, AI_MAX_TOKENS } from "@/server/ai/client";
import {
  testCaseGenerationResponseSchema,
} from "@/server/ai/schemas/test-case-generation";
import {
  buildTestCaseGenerationPrompt,
  TEST_CASE_GENERATION_PROMPT_VERSION,
} from "@/server/ai/prompts/test-case-generation";
import { AiGenerationError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { CreateTestCaseInput } from "@/features/test-cases/schemas/test-case-schemas";
import type { Prisma, ReviewStatus } from "@prisma/client";

const GENERATION_TOOL_NAME = "submit_test_cases";

// zodToJsonSchema(schema) with no "name" argument inlines the schema
// directly instead of producing a { $ref, definitions } indirection —
// deliberate, since $ref-based schemas are the kind of thing that broke
// Anthropic's newer native Structured Outputs helper (zodOutputFormat)
// for this same schema. A flat, inlined JSON Schema passed as a tool's
// input_schema is the older, more broadly-compatible pattern.
const testCaseGenerationToolSchema = zodToJsonSchema(testCaseGenerationResponseSchema);

/** Test cases for a project — throws if the user isn't at least a VIEWER on it. */
export async function listTestCases(userId: string, projectId: string) {
  await requireProjectAccess(userId, projectId, "VIEWER");
  return testCaseRepository.findTestCasesForProject(projectId);
}

export async function countTestCasesForUser(userId: string) {
  return testCaseRepository.countTestCasesForUser(userId);
}

/** Manually authoring a test case needs at least EDITOR. */
export async function createTestCase(userId: string, input: CreateTestCaseInput) {
  await requireProjectAccess(userId, input.projectId, "EDITOR");

  return prisma.$transaction(async (tx) => {
    const testCase = await tx.testCase.create({
      data: {
        projectId: input.projectId,
        requirementId: input.requirementId,
        title: input.title,
        description: input.description,
        preconditions: input.preconditions,
        steps: input.steps,
        expectedResult: input.expectedResult,
        type: input.type,
        priority: input.priority,
        createdById: userId,
        reviewStatus: "ACCEPTED",
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "test_case.created",
        targetType: "TestCase",
        targetId: testCase.id,
        projectId: input.projectId,
        metadata: { title: testCase.title, source: "manual" },
      },
    });

    return testCase;
  });
}

/**
 * A human reviewing an AI-drafted (or any) test case — accept, edit-mark,
 * or reject it. This is the enforcement point for "never blindly trust
 * AI output": a test case's reviewStatus only ever changes through this
 * function, driven by an explicit user action, never automatically.
 */
export async function updateReviewStatus(
  userId: string,
  testCaseId: string,
  reviewStatus: ReviewStatus,
) {
  const testCase = await testCaseRepository.findTestCaseById(testCaseId);
  if (!testCase) {
    throw new NotFoundError("TestCase", testCaseId);
  }

  await requireProjectAccess(userId, testCase.projectId, "EDITOR");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.testCase.update({
      where: { id: testCaseId },
      data: { reviewStatus },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "test_case.review_status_changed",
        targetType: "TestCase",
        targetId: testCaseId,
        projectId: testCase.projectId,
        metadata: { from: testCase.reviewStatus, to: reviewStatus },
      },
    });

    return updated;
  });
}

/**
 * Generates test cases for a requirement via the Claude API.
 *
 * Uses the "forced tool call" pattern for structured output — a single
 * tool is offered whose input_schema mirrors our Zod schema exactly, and
 * tool_choice forces the model to call it, so the API itself constrains
 * the response shape rather than us just asking nicely for JSON in the
 * prompt. This is the older, more broadly-compatible structured-output
 * pattern (vs. Anthropic's newer native messages.parse/zodOutputFormat,
 * which hit real interop friction against this exact schema during
 * development).
 *
 * Every generated test case is created with reviewStatus=DRAFT and linked
 * to the AiGeneration row that produced it — nothing here is presented as
 * verified until a human calls updateReviewStatus.
 */
export async function generateTestCasesForRequirement(userId: string, requirementId: string) {
  const requirement = await prisma.requirement.findUnique({ where: { id: requirementId } });
  if (!requirement) {
    throw new NotFoundError("Requirement", requirementId);
  }

  await requireProjectAccess(userId, requirement.projectId, "EDITOR");

  const { system, user } = buildTestCaseGenerationPrompt(requirement);
  const client = getAnthropicClient();

  let response;
  try {
    response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: AI_MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
      tools: [
        {
          name: GENERATION_TOOL_NAME,
          description: "Submit the generated test cases in the required structured format.",
          // zod-to-json-schema's output type and the SDK's expected
          // Tool.input_schema type don't line up structurally even
          // though the actual JSON shape is correct — a narrow,
          // deliberate `any` at this one interop boundary rather than
          // asserting a specific nested SDK type name we can't verify.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          input_schema: testCaseGenerationToolSchema as any,
        },
      ],
      tool_choice: { type: "tool", name: GENERATION_TOOL_NAME },
    });
  } catch (error) {
    logger.error({ err: error, requirementId }, "AI test case generation request failed");
    throw new AiGenerationError(
      "Failed to generate test cases right now. You can try again, or add test cases manually.",
    );
  }

  const toolUseBlock = response.content.find(
    (block) => block.type === "tool_use" && block.name === GENERATION_TOOL_NAME,
  );
  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    logger.error(
      { requirementId, stopReason: response.stop_reason },
      "AI response did not include the expected tool call",
    );
    throw new AiGenerationError("The AI response didn't match the expected format. Please try again.");
  }

  const revalidated = testCaseGenerationResponseSchema.safeParse(toolUseBlock.input);
  if (!revalidated.success) {
    logger.error({ requirementId, issues: revalidated.error.issues }, "AI output failed re-validation");
    throw new AiGenerationError("The AI response didn't pass validation. Please try again.");
  }

  return prisma.$transaction(async (tx) => {
    const aiGeneration = await tx.aiGeneration.create({
      data: {
        targetType: "TestCase",
        promptVersion: TEST_CASE_GENERATION_PROMPT_VERSION,
        model: AI_MODEL,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        rawResponse: response as unknown as Prisma.InputJsonValue,
        status: "SUCCESS",
        createdById: userId,
        projectId: requirement.projectId,
      },
    });

    const created = [];
    for (const tc of revalidated.data.testCases) {
      const testCase = await tx.testCase.create({
        data: {
          projectId: requirement.projectId,
          requirementId: requirement.id,
          title: tc.title,
          description: tc.description,
          preconditions: tc.preconditions,
          steps: tc.steps,
          expectedResult: tc.expectedResult,
          type: tc.type,
          priority: tc.priority,
          reviewStatus: "DRAFT",
          createdById: userId,
          aiGenerationId: aiGeneration.id,
        },
      });
      created.push(testCase);
    }

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "test_case.ai_generated",
        targetType: "Requirement",
        targetId: requirement.id,
        projectId: requirement.projectId,
        metadata: { count: created.length, aiGenerationId: aiGeneration.id },
      },
    });

    return created;
  });
}
