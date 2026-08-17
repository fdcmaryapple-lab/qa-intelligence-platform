"use server";

import { revalidatePath } from "next/cache";
import { parseOrThrow } from "@/lib/validation";
import { withActionErrorHandling } from "@/lib/action-response";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as testCaseService from "@/server/services/test-case-service";
import {
  createTestCaseSchema,
  generateTestCasesSchema,
  updateReviewStatusSchema,
} from "@/features/test-cases/schemas/test-case-schemas";

export async function createTestCaseAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(createTestCaseSchema, input);
    const userId = await getCurrentUserId();
    const testCase = await testCaseService.createTestCase(userId, parsed);
    revalidatePath(`/dashboard/projects/${parsed.projectId}/test-cases`);
    revalidatePath("/dashboard");
    return testCase;
  });
}

export async function generateTestCasesAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(generateTestCasesSchema, input);
    const userId = await getCurrentUserId();
    const testCases = await testCaseService.generateTestCasesForRequirement(
      userId,
      parsed.requirementId,
    );
    revalidatePath("/dashboard", "layout");
    return testCases;
  });
}

export async function updateReviewStatusAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(updateReviewStatusSchema, input);
    const userId = await getCurrentUserId();
    const testCase = await testCaseService.updateReviewStatus(
      userId,
      parsed.testCaseId,
      parsed.reviewStatus,
    );
    revalidatePath(`/dashboard/projects/${testCase.projectId}/test-cases`);
    return testCase;
  });
}
