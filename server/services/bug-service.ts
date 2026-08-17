import { zodToJsonSchema } from "zod-to-json-schema";
import * as bugRepository from "@/server/repositories/bug-repository";
import { requireProjectAccess } from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";
import { getAnthropicClient, AI_MODEL, AI_MAX_TOKENS } from "@/server/ai/client";
import { bugReportGenerationSchema } from "@/server/ai/schemas/bug-report-generation";
import {
  buildBugReportGenerationPrompt,
  BUG_REPORT_GENERATION_PROMPT_VERSION,
} from "@/server/ai/prompts/bug-report-generation";
import { AiGenerationError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { CreateBugInput } from "@/features/bugs/schemas/bug-schemas";
import type { BugStatus, Prisma, ReviewStatus } from "@prisma/client";

const GENERATION_TOOL_NAME = "submit_bug_report";

const bugReportToolSchema = zodToJsonSchema(bugReportGenerationSchema);

export async function listBugs(userId: string, projectId: string) {
  await requireProjectAccess(userId, projectId, "VIEWER");
  return bugRepository.findBugsForProject(projectId);
}

export async function countBugsForUser(userId: string) {
  return bugRepository.countBugsForUser(userId);
}

export async function countOpenBugsForUser(userId: string) {
  return bugRepository.countOpenBugsForUser(userId);
}

export async function createBug(userId: string, input: CreateBugInput) {
  await requireProjectAccess(userId, input.projectId, "EDITOR");

  return prisma.$transaction(async (tx) => {
    const bug = await tx.bug.create({
      data: {
        projectId: input.projectId,
        testCaseId: input.testCaseId,
        title: input.title,
        description: input.description,
        preconditions: input.preconditions,
        stepsToReproduce: input.stepsToReproduce,
        expectedResult: input.expectedResult,
        actualResult: input.actualResult,
        severity: input.severity,
        priority: input.priority,
        createdById: userId,
        reviewStatus: "ACCEPTED",
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "bug.created",
        targetType: "Bug",
        targetId: bug.id,
        projectId: input.projectId,
        metadata: { title: bug.title, source: "manual" },
      },
    });

    return bug;
  });
}

export async function updateReviewStatus(userId: string, bugId: string, reviewStatus: ReviewStatus) {
  const bug = await bugRepository.findBugById(bugId);
  if (!bug) {
    throw new NotFoundError("Bug", bugId);
  }

  await requireProjectAccess(userId, bug.projectId, "EDITOR");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.bug.update({
      where: { id: bugId },
      data: { reviewStatus },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "bug.review_status_changed",
        targetType: "Bug",
        targetId: bugId,
        projectId: bug.projectId,
        metadata: { from: bug.reviewStatus, to: reviewStatus },
      },
    });

    return updated;
  });
}

export async function updateStatus(userId: string, bugId: string, status: BugStatus) {
  const bug = await bugRepository.findBugById(bugId);
  if (!bug) {
    throw new NotFoundError("Bug", bugId);
  }

  await requireProjectAccess(userId, bug.projectId, "EDITOR");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.bug.update({
      where: { id: bugId },
      data: { status },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "bug.status_changed",
        targetType: "Bug",
        targetId: bugId,
        projectId: bug.projectId,
        metadata: { from: bug.status, to: status },
      },
    });

    return updated;
  });
}

export async function generateBugReportFromTestCase(
  userId: string,
  testCaseId: string,
  actualBehaviorDescription: string,
) {
  const testCase = await prisma.testCase.findUnique({ where: { id: testCaseId } });
  if (!testCase) {
    throw new NotFoundError("TestCase", testCaseId);
  }

  await requireProjectAccess(userId, testCase.projectId, "EDITOR");

  const { system, user } = buildBugReportGenerationPrompt({
    testCaseTitle: testCase.title,
    testCaseExpectedResult: testCase.expectedResult,
    testCaseSteps: testCase.steps,
    actualBehaviorDescription,
  });
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
          description: "Submit the generated bug report in the required structured format.",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          input_schema: bugReportToolSchema as any,
        },
      ],
      tool_choice: { type: "tool", name: GENERATION_TOOL_NAME },
    });
  } catch (error) {
    logger.error({ err: error, testCaseId }, "AI bug report generation request failed");
    throw new AiGenerationError(
      "Failed to generate a bug report right now. You can try again, or add one manually.",
    );
  }

  const toolUseBlock = response.content.find(
    (block) => block.type === "tool_use" && block.name === GENERATION_TOOL_NAME,
  );
  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    logger.error(
      { testCaseId, stopReason: response.stop_reason },
      "AI response did not include the expected tool call",
    );
    throw new AiGenerationError("The AI response didn't match the expected format. Please try again.");
  }

  const revalidated = bugReportGenerationSchema.safeParse(toolUseBlock.input);
  if (!revalidated.success) {
    logger.error({ testCaseId, issues: revalidated.error.issues }, "AI output failed re-validation");
    throw new AiGenerationError("The AI response didn't pass validation. Please try again.");
  }

  return prisma.$transaction(async (tx) => {
    const aiGeneration = await tx.aiGeneration.create({
      data: {
        targetType: "Bug",
        promptVersion: BUG_REPORT_GENERATION_PROMPT_VERSION,
        model: AI_MODEL,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        rawResponse: response as unknown as Prisma.InputJsonValue,
        status: "SUCCESS",
        createdById: userId,
        projectId: testCase.projectId,
      },
    });

    const data = revalidated.data;
    const bug = await tx.bug.create({
      data: {
        projectId: testCase.projectId,
        testCaseId: testCase.id,
        title: data.title,
        description: data.description,
        preconditions: data.preconditions,
        stepsToReproduce: data.stepsToReproduce,
        expectedResult: data.expectedResult,
        actualResult: data.actualResult,
        severity: data.severity,
        priority: data.priority,
        reviewStatus: "DRAFT",
        createdById: userId,
        aiGenerationId: aiGeneration.id,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "bug.ai_generated",
        targetType: "TestCase",
        targetId: testCase.id,
        projectId: testCase.projectId,
        metadata: { bugId: bug.id, aiGenerationId: aiGeneration.id },
      },
    });

    return bug;
  });
}
