"use server";

import { revalidatePath } from "next/cache";
import { parseOrThrow } from "@/lib/validation";
import { withActionErrorHandling } from "@/lib/action-response";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as bugService from "@/server/services/bug-service";
import {
  createBugSchema,
  generateBugReportSchema,
  updateBugReviewStatusSchema,
  updateBugStatusSchema,
} from "@/features/bugs/schemas/bug-schemas";

export async function createBugAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(createBugSchema, input);
    const userId = await getCurrentUserId();
    const bug = await bugService.createBug(userId, parsed);
    revalidatePath(`/dashboard/projects/${parsed.projectId}/bugs`);
    revalidatePath("/dashboard");
    return bug;
  });
}

export async function generateBugReportAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(generateBugReportSchema, input);
    const userId = await getCurrentUserId();
    const bug = await bugService.generateBugReportFromTestCase(
      userId,
      parsed.testCaseId,
      parsed.actualBehaviorDescription,
    );
    revalidatePath("/dashboard", "layout");
    return bug;
  });
}

export async function updateBugReviewStatusAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(updateBugReviewStatusSchema, input);
    const userId = await getCurrentUserId();
    const bug = await bugService.updateReviewStatus(userId, parsed.bugId, parsed.reviewStatus);
    revalidatePath(`/dashboard/projects/${bug.projectId}/bugs`);
    return bug;
  });
}

export async function updateBugStatusAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(updateBugStatusSchema, input);
    const userId = await getCurrentUserId();
    const bug = await bugService.updateStatus(userId, parsed.bugId, parsed.status);
    revalidatePath(`/dashboard/projects/${bug.projectId}/bugs`);
    return bug;
  });
}
