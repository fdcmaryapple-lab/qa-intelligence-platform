import { z } from "zod";

export const testRunResultStatusValues = ["NOT_RUN", "PASS", "FAIL", "BLOCKED", "SKIPPED"] as const;

export const createTestRunSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1, "Name is required").max(200),
  testCaseIds: z.array(z.string().min(1)).min(1, "Select at least one test case"),
});

export type CreateTestRunInput = z.infer<typeof createTestRunSchema>;

export const recordTestRunResultSchema = z.object({
  testRunResultId: z.string().min(1),
  result: z.enum(testRunResultStatusValues),
  notes: z.string().max(1000).optional(),
});

export type RecordTestRunResultInput = z.infer<typeof recordTestRunResultSchema>;

export const completeTestRunSchema = z.object({
  testRunId: z.string().min(1),
});
