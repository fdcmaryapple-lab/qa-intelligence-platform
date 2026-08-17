import { z } from "zod";

export const bugSeverityValues = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const bugPriorityValues = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const bugStatusValues = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "WONT_FIX"] as const;
export const reviewStatusValues = ["DRAFT", "ACCEPTED", "EDITED", "REJECTED"] as const;

export const createBugSchema = z.object({
  projectId: z.string().min(1),
  testCaseId: z.string().min(1).optional(),
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().max(1000).optional(),
  preconditions: z.string().max(500).optional(),
  stepsToReproduce: z.array(z.string().min(1)).min(1, "At least one step is required"),
  expectedResult: z.string().max(500).optional(),
  actualResult: z.string().max(500).optional(),
  severity: z.enum(bugSeverityValues).default("MEDIUM"),
  priority: z.enum(bugPriorityValues).default("MEDIUM"),
});

export type CreateBugInput = z.infer<typeof createBugSchema>;

export const generateBugReportSchema = z.object({
  testCaseId: z.string().min(1),
  actualBehaviorDescription: z
    .string()
    .min(10, "Describe what actually happened (at least 10 characters)")
    .max(2000),
});

export type GenerateBugReportInput = z.infer<typeof generateBugReportSchema>;

export const updateBugReviewStatusSchema = z.object({
  bugId: z.string().min(1),
  reviewStatus: z.enum(reviewStatusValues),
});

export type UpdateBugReviewStatusInput = z.infer<typeof updateBugReviewStatusSchema>;

export const updateBugStatusSchema = z.object({
  bugId: z.string().min(1),
  status: z.enum(bugStatusValues),
});

export type UpdateBugStatusInput = z.infer<typeof updateBugStatusSchema>;
