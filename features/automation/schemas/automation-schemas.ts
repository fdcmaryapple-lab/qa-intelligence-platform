import { z } from "zod";

export const reviewStatusValues = ["DRAFT", "ACCEPTED", "EDITED", "REJECTED"] as const;

export const createAutomationScriptSchema = z.object({
  projectId: z.string().min(1),
  testCaseId: z.string().min(1).optional(),
  title: z.string().min(1, "Title is required").max(200),
  code: z.string().min(1, "Code is required"),
});

export type CreateAutomationScriptInput = z.infer<typeof createAutomationScriptSchema>;

export const generateAutomationScriptSchema = z.object({
  testCaseId: z.string().min(1),
});

export type GenerateAutomationScriptInput = z.infer<typeof generateAutomationScriptSchema>;

export const updateAutomationReviewStatusSchema = z.object({
  scriptId: z.string().min(1),
  reviewStatus: z.enum(reviewStatusValues),
});

export type UpdateAutomationReviewStatusInput = z.infer<typeof updateAutomationReviewStatusSchema>;
