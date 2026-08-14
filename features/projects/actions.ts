"use server";

import { revalidatePath } from "next/cache";
import { parseOrThrow } from "@/lib/validation";
import { withActionErrorHandling } from "@/lib/action-response";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as projectService from "@/server/services/project-service";
import { createProjectSchema } from "@/features/projects/schemas/project-schemas";

export async function createProjectAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(createProjectSchema, input);
    const userId = await getCurrentUserId();
    const project = await projectService.createProject(userId, parsed);
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard");
    return project;
  });
}
