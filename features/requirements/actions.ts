"use server";

import { revalidatePath } from "next/cache";
import { parseOrThrow } from "@/lib/validation";
import { withActionErrorHandling } from "@/lib/action-response";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as requirementService from "@/server/services/requirement-service";
import { createRequirementSchema } from "@/features/requirements/schemas/requirement-schemas";

export async function createRequirementAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(createRequirementSchema, input);
    const userId = await getCurrentUserId();
    const requirement = await requirementService.createRequirement(userId, parsed);
    revalidatePath(`/dashboard/projects/${parsed.projectId}`);
    revalidatePath("/dashboard");
    return requirement;
  });
}
