import { z } from "zod";

export const projectRoleValues = ["VIEWER", "EDITOR", "ADMIN", "OWNER"] as const;

export const addMemberSchema = z.object({
  projectId: z.string().min(1),
  email: z.string().email("Enter a valid email"),
  role: z.enum(projectRoleValues),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const updateMemberRoleSchema = z.object({
  projectId: z.string().min(1),
  memberId: z.string().min(1),
  role: z.enum(projectRoleValues),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const removeMemberSchema = z.object({
  projectId: z.string().min(1),
  memberId: z.string().min(1),
});

export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
