import { z } from "zod";

/**
 * The shape we require the model to return. Enforced via forcing a
 * single tool call (see server/services/test-case-service.ts) whose
 * input_schema is generated from this exact schema — not just "asked
 * nicely for JSON." Also re-validated with this same schema after the
 * tool call returns, since JSON-Schema-level enforcement guarantees
 * shape but not business-sensible content (e.g. it won't stop the model
 * from writing an empty steps array if the schema technically allows it
 * — .min(1) below does).
 */
export const generatedTestCaseSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1000),
  preconditions: z.string().max(500).optional(),
  steps: z.array(z.string().min(1)).min(1).max(15),
  expectedResult: z.string().min(1).max(500),
  type: z.enum(["FUNCTIONAL", "NEGATIVE", "BOUNDARY", "EDGE", "SECURITY", "REGRESSION"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
});

export const testCaseGenerationResponseSchema = z.object({
  testCases: z.array(generatedTestCaseSchema).min(1).max(10),
});

export type GeneratedTestCase = z.infer<typeof generatedTestCaseSchema>;
export type TestCaseGenerationResponse = z.infer<typeof testCaseGenerationResponseSchema>;
