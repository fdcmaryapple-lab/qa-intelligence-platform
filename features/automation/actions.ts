"use server";

import { revalidatePath } from "next/cache";
import { parseOrThrow } from "@/lib/validation";
import { withActionErrorHandling } from "@/lib/action-response";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as automationService from "@/server/services/automation-service";
import {
  createAutomationScriptSchema,
  generateAutomationScriptSchema,
  updateAutomationReviewStatusSchema,
} from "@/features/automation/schemas/automation-schemas";

export async function createAutomationScriptAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(createAutomationScriptSchema, input);
    const userId = await getCurrentUserId();
    const script = await automationService.createAutomationScript(userId, parsed);
    revalidatePath(`/dashboard/projects/${parsed.projectId}/automation`);
    return script;
  });
}

export async function generateAutomationScriptAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(generateAutomationScriptSchema, input);
    const userId = await getCurrentUserId();
    const script = await automationService.generateAutomationScriptFromTestCase(
      userId,
      parsed.testCaseId,
    );
    revalidatePath("/dashboard", "layout");
    return script;
  });
}

export async function updateAutomationReviewStatusAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(updateAutomationReviewStatusSchema, input);
    const userId = await getCurrentUserId();
    const script = await automationService.updateReviewStatus(
      userId,
      parsed.scriptId,
      parsed.reviewStatus,
    );
    revalidatePath(`/dashboard/projects/${script.projectId}/automation`);
    return script;
  });
}
