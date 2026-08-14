import { z } from "zod";

export const requirementStatusValues = ["DRAFT", "IN_REVIEW", "APPROVED", "REJECTED"] as const;
export const requirementPriorityValues = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const createRequirementSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(requirementPriorityValues).default("MEDIUM"),
});

export type CreateRequirementInput = z.infer<typeof createRequirementSchema>;
