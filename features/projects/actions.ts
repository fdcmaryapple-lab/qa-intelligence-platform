"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseOrThrow } from "@/lib/validation";
import { withActionErrorHandling } from "@/lib/action-response";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as projectService from "@/server/services/project-service";
import {
  createProjectSchema,
  updateProjectSchema,
  deleteProjectSchema,
} from "@/features/projects/schemas/project-schemas";

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

export async function updateProjectAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(updateProjectSchema, input);
    const userId = await getCurrentUserId();
    const project = await projectService.updateProject(userId, parsed);
    revalidatePath(`/dashboard/projects/${parsed.projectId}`);
    revalidatePath(`/dashboard/projects/${parsed.projectId}/settings`);
    return project;
  });
}

export async function deleteProjectAction(input: unknown) {
  const result = await withActionErrorHandling(async () => {
    const parsed = parseOrThrow(deleteProjectSchema, input);
    const userId = await getCurrentUserId();
    await projectService.deleteProject(userId, parsed.projectId, parsed.confirmName);
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard");
    return { deleted: true };
  });

  if (result.success) {
    redirect("/dashboard/projects");
  }

  return result;
}
