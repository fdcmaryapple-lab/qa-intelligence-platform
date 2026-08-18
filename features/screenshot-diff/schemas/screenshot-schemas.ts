import { z } from "zod";

const imageBase64Schema = z
  .string()
  .min(1, "An image is required")
  .max(8_000_000, "Image is too large (max ~6MB)");

export const createBaselineSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1, "Name is required").max(200),
  imageBase64: imageBase64Schema,
});

export type CreateBaselineInput = z.infer<typeof createBaselineSchema>;

export const compareScreenshotSchema = z.object({
  baselineId: z.string().min(1),
  imageBase64: imageBase64Schema,
  threshold: z.number().min(0).max(100).default(1),
});

export type CompareScreenshotInput = z.infer<typeof compareScreenshotSchema>;
