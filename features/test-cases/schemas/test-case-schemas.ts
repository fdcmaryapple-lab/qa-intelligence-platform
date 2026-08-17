import { z } from "zod";

export const testCaseTypeValues = [
  "FUNCTIONAL",
  "NEGATIVE",
  "BOUNDARY",
  "EDGE",
  "SECURITY",
  "REGRESSION",
] as const;

export const testCasePriorityValues = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const createTestCaseSchema = z.object({
  projectId: z.string().min(1),
  requirementId: z.string().min(1).optional(),
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().max(1000).optional(),
  preconditions: z.string().max(500).optional(),
  steps: z
    .array(z.string().min(1))
    .min(1, "At least one step is required"),
  expectedResult: z.string().min(1, "Expected result is required").max(500),
  type: z.enum(testCaseTypeValues).default("FUNCTIONAL"),
  priority: z.enum(testCasePriorityValues).default("MEDIUM"),
});

export type CreateTestCaseInput = z.infer<typeof createTestCaseSchema>;

export const generateTestCasesSchema = z.object({
  requirementId: z.string().min(1),
});

export type GenerateTestCasesInput = z.infer<typeof generateTestCasesSchema>;

export const reviewStatusValues = ["DRAFT", "ACCEPTED", "EDITED", "REJECTED"] as const;

export const updateReviewStatusSchema = z.object({
  testCaseId: z.string().min(1),
  reviewStatus: z.enum(reviewStatusValues),
});

export type UpdateReviewStatusInput = z.infer<typeof updateReviewStatusSchema>;
