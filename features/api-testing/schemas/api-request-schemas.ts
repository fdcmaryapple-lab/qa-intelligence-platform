import { z } from "zod";

export const httpMethodValues = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
export const apiBodyTypeValues = ["NONE", "JSON", "TEXT", "FORM"] as const;
export const assertionTypeValues = ["STATUS_EQUALS", "BODY_CONTAINS", "JSON_PATH_EQUALS"] as const;

export const headerPairSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export type HeaderPair = z.infer<typeof headerPairSchema>;

export const assertionInputSchema = z.object({
  type: z.enum(assertionTypeValues),
  jsonPath: z.string().optional(),
  expected: z.string().min(1, "Expected value is required"),
});

export const createApiRequestSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1, "Name is required").max(200),
  method: z.enum(httpMethodValues),
  url: z.string().min(1, "URL is required").url("Must be a valid URL"),
  headers: z.array(headerPairSchema).default([]),
  queryParams: z.array(headerPairSchema).default([]),
  bodyType: z.enum(apiBodyTypeValues).default("NONE"),
  body: z.string().optional(),
  assertions: z.array(assertionInputSchema).default([]),
});

export type CreateApiRequestInput = z.infer<typeof createApiRequestSchema>;

export const runApiRequestSchema = z.object({
  apiRequestId: z.string().min(1),
});

export const deleteApiRequestSchema = z.object({
  apiRequestId: z.string().min(1),
});
