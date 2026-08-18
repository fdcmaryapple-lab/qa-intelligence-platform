import { z } from "zod";

export const automationScriptGenerationSchema = z.object({
  code: z.string().min(1),
});

export type AutomationScriptGeneration = z.infer<typeof automationScriptGenerationSchema>;
