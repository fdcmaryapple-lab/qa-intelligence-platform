"use server";

import { revalidatePath } from "next/cache";
import { parseOrThrow } from "@/lib/validation";
import { withActionErrorHandling } from "@/lib/action-response";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as testRunService from "@/server/services/test-run-service";
import {
  createTestRunSchema,
  recordTestRunResultSchema,
  completeTestRunSchema,
} from "@/features/regression/schemas/regression-schemas";

export async function createTestRunAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(createTestRunSchema, input);
    const userId = await getCurrentUserId();
    const testRun = await testRunService.createTestRun(userId, parsed);
    revalidatePath(`/dashboard/projects/${parsed.projectId}/regression`);
    return testRun;
  });
}

export async function recordTestRunResultAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(recordTestRunResultSchema, input);
    const userId = await getCurrentUserId();
    const result = await testRunService.recordResult(
      userId,
      parsed.testRunResultId,
      parsed.result,
      parsed.notes,
    );
    revalidatePath("/dashboard", "layout");
    return result;
  });
}

export async function completeTestRunAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(completeTestRunSchema, input);
    const userId = await getCurrentUserId();
    const testRun = await testRunService.completeTestRun(userId, parsed.testRunId);
    revalidatePath(`/dashboard/projects/${testRun.projectId}/regression`);
    return testRun;
  });
}
