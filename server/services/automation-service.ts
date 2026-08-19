import { zodToJsonSchema } from "zod-to-json-schema";
import * as automationRepository from "@/server/repositories/automation-repository";
import { requireProjectAccess } from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";
import { getAnthropicClient, AI_MODEL, AI_MAX_TOKENS } from "@/server/ai/client";
import { automationScriptGenerationSchema } from "@/server/ai/schemas/automation-script-generation";
import {
  buildAutomationScriptGenerationPrompt,
  AUTOMATION_SCRIPT_GENERATION_PROMPT_VERSION,
} from "@/server/ai/prompts/automation-script-generation";
import { validateScriptSyntax } from "@/server/automation/validate-script";
import { executeAutomationScript } from "@/server/automation/execute-script";
import { AiGenerationError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { CreateAutomationScriptInput } from "@/features/automation/schemas/automation-schemas";
import type { Prisma, ReviewStatus } from "@prisma/client";

const GENERATION_TOOL_NAME = "submit_automation_script";
const automationScriptToolSchema = zodToJsonSchema(automationScriptGenerationSchema);

export async function listAutomationScripts(userId: string, projectId: string) {
  await requireProjectAccess(userId, projectId, "VIEWER");
  return automationRepository.findAutomationScriptsForProject(projectId);
}

export async function countAutomationScriptsForUser(userId: string) {
  return automationRepository.countAutomationScriptsForUser(userId);
}

export async function createAutomationScript(userId: string, input: CreateAutomationScriptInput) {
  await requireProjectAccess(userId, input.projectId, "EDITOR");

  const validation = validateScriptSyntax(input.code);

  return prisma.$transaction(async (tx) => {
    const script = await tx.automationScript.create({
      data: {
        projectId: input.projectId,
        testCaseId: input.testCaseId,
        title: input.title,
        code: input.code,
        reviewStatus: "ACCEPTED",
        isValid: validation.isValid,
        validationErrors: validation.isValid ? null : validation.errors.join("\n"),
        createdById: userId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "automation_script.created",
        targetType: "AutomationScript",
        targetId: script.id,
        projectId: input.projectId,
        metadata: { title: script.title, source: "manual", isValid: validation.isValid },
      },
    });

    return script;
  });
}

export async function updateReviewStatus(
  userId: string,
  scriptId: string,
  reviewStatus: ReviewStatus,
) {
  const script = await automationRepository.findAutomationScriptById(scriptId);
  if (!script) {
    throw new NotFoundError("AutomationScript", scriptId);
  }

  await requireProjectAccess(userId, script.projectId, "EDITOR");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.automationScript.update({
      where: { id: scriptId },
      data: { reviewStatus },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "automation_script.review_status_changed",
        targetType: "AutomationScript",
        targetId: scriptId,
        projectId: script.projectId,
        metadata: { from: script.reviewStatus, to: reviewStatus },
      },
    });

    return updated;
  });
}

export async function generateAutomationScriptFromTestCase(userId: string, testCaseId: string) {
  const testCase = await prisma.testCase.findUnique({ where: { id: testCaseId } });
  if (!testCase) {
    throw new NotFoundError("TestCase", testCaseId);
  }

  await requireProjectAccess(userId, testCase.projectId, "EDITOR");

  const { system, user } = buildAutomationScriptGenerationPrompt({
    testCaseTitle: testCase.title,
    testCasePreconditions: testCase.preconditions,
    testCaseSteps: testCase.steps,
    testCaseExpectedResult: testCase.expectedResult,
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
          description: "Submit the generated Playwright test script.",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          input_schema: automationScriptToolSchema as any,
        },
      ],
      tool_choice: { type: "tool", name: GENERATION_TOOL_NAME },
    });
  } catch (error) {
    logger.error({ err: error, testCaseId }, "AI automation script generation request failed");
    throw new AiGenerationError(
      "Failed to generate an automation script right now. You can try again, or write one manually.",
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

  const revalidated = automationScriptGenerationSchema.safeParse(toolUseBlock.input);
  if (!revalidated.success) {
    logger.error({ testCaseId, issues: revalidated.error.issues }, "AI output failed re-validation");
    throw new AiGenerationError("The AI response didn't pass validation. Please try again.");
  }

  const validation = validateScriptSyntax(revalidated.data.code);

  return prisma.$transaction(async (tx) => {
    const aiGeneration = await tx.aiGeneration.create({
      data: {
        targetType: "AutomationScript",
        promptVersion: AUTOMATION_SCRIPT_GENERATION_PROMPT_VERSION,
        model: AI_MODEL,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        rawResponse: response as unknown as Prisma.InputJsonValue,
        status: "SUCCESS",
        createdById: userId,
        projectId: testCase.projectId,
      },
    });

    const script = await tx.automationScript.create({
      data: {
        projectId: testCase.projectId,
        testCaseId: testCase.id,
        title: `Automation: ${testCase.title}`,
        code: revalidated.data.code,
        reviewStatus: "DRAFT",
        isValid: validation.isValid,
        validationErrors: validation.isValid ? null : validation.errors.join("\n"),
        createdById: userId,
        aiGenerationId: aiGeneration.id,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "automation_script.ai_generated",
        targetType: "TestCase",
        targetId: testCase.id,
        projectId: testCase.projectId,
        metadata: {
          scriptId: script.id,
          aiGenerationId: aiGeneration.id,
          isValid: validation.isValid,
        },
      },
    });

    return script;
  });
}

export async function runAutomationScript(userId: string, scriptId: string) {
  const script = await automationRepository.findAutomationScriptById(scriptId);
  if (!script) {
    throw new NotFoundError("AutomationScript", scriptId);
  }

  await requireProjectAccess(userId, script.projectId, "ADMIN");

  const result = await executeAutomationScript(script.code);

  return prisma.$transaction(async (tx) => {
    const run = await tx.automationRun.create({
      data: {
        automationScriptId: script.id,
        projectId: script.projectId,
        status: result.status,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        durationMs: result.durationMs,
        executedById: userId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "automation_script.run",
        targetType: "AutomationScript",
        targetId: script.id,
        projectId: script.projectId,
        metadata: { runId: run.id, status: result.status, exitCode: result.exitCode },
      },
    });

    return run;
  });
}
