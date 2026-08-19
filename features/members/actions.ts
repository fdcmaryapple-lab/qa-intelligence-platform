"use server";

import { revalidatePath } from "next/cache";
import { parseOrThrow } from "@/lib/validation";
import { withActionErrorHandling } from "@/lib/action-response";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as memberService from "@/server/services/project-member-service";
import {
  addMemberSchema,
  updateMemberRoleSchema,
  removeMemberSchema,
} from "@/features/members/schemas/member-schemas";

export async function addMemberAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(addMemberSchema, input);
    const userId = await getCurrentUserId();
    const member = await memberService.addMember(userId, parsed.projectId, parsed);
    revalidatePath(`/dashboard/projects/${parsed.projectId}/members`);
    return member;
  });
}

export async function updateMemberRoleAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(updateMemberRoleSchema, input);
    const userId = await getCurrentUserId();
    const member = await memberService.updateMemberRole(userId, parsed.projectId, parsed);
    revalidatePath(`/dashboard/projects/${parsed.projectId}/members`);
    return member;
  });
}

export async function removeMemberAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(removeMemberSchema, input);
    const userId = await getCurrentUserId();
    await memberService.removeMember(userId, parsed.projectId, parsed.memberId);
    revalidatePath(`/dashboard/projects/${parsed.projectId}/members`);
    return { removed: true };
  });
}
