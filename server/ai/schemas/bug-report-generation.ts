import { z } from "zod";

export const bugReportGenerationSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1000),
  preconditions: z.string().max(500).optional(),
  stepsToReproduce: z.array(z.string().min(1)).min(1).max(15),
  expectedResult: z.string().min(1).max(500),
  actualResult: z.string().min(1).max(500),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
});

export type BugReportGeneration = z.infer<typeof bugReportGenerationSchema>;
