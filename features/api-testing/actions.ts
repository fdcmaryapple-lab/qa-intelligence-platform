"use server";

import { revalidatePath } from "next/cache";
import { parseOrThrow } from "@/lib/validation";
import { withActionErrorHandling } from "@/lib/action-response";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as apiTestingService from "@/server/services/api-testing-service";
import {
  createApiRequestSchema,
  runApiRequestSchema,
  deleteApiRequestSchema,
} from "@/features/api-testing/schemas/api-request-schemas";

export async function createApiRequestAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(createApiRequestSchema, input);
    const userId = await getCurrentUserId();
    const apiRequest = await apiTestingService.createApiRequest(userId, parsed);
    revalidatePath(`/dashboard/projects/${parsed.projectId}/api-testing`);
    return apiRequest;
  });
}

export async function runApiRequestAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(runApiRequestSchema, input);
    const userId = await getCurrentUserId();
    const execution = await apiTestingService.runApiRequest(userId, parsed.apiRequestId);
    revalidatePath("/dashboard", "layout");
    return execution;
  });
}

export async function deleteApiRequestAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(deleteApiRequestSchema, input);
    const userId = await getCurrentUserId();
    await apiTestingService.deleteApiRequest(userId, parsed.apiRequestId);
    revalidatePath("/dashboard", "layout");
    return { deleted: true };
  });
}
