"use server";

import { revalidatePath } from "next/cache";
import { parseOrThrow } from "@/lib/validation";
import { withActionErrorHandling } from "@/lib/action-response";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as screenshotService from "@/server/services/screenshot-service";
import {
  createBaselineSchema,
  compareScreenshotSchema,
} from "@/features/screenshot-diff/schemas/screenshot-schemas";

export async function createBaselineAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(createBaselineSchema, input);
    const userId = await getCurrentUserId();
    const baseline = await screenshotService.createBaseline(userId, parsed);
    revalidatePath(`/dashboard/projects/${parsed.projectId}/screenshot-diff`);
    return {
      id: baseline.id,
      name: baseline.name,
      width: baseline.width,
      height: baseline.height,
      imageBase64: Buffer.from(baseline.image).toString("base64"),
    };
  });
}

export async function compareScreenshotAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(compareScreenshotSchema, input);
    const userId = await getCurrentUserId();
    const comparison = await screenshotService.compareScreenshot(userId, parsed);
    revalidatePath("/dashboard", "layout");
    return {
      id: comparison.id,
      result: comparison.result,
      diffPixelCount: comparison.diffPixelCount,
      diffPercentage: comparison.diffPercentage,
      threshold: comparison.threshold,
      error: comparison.error,
      diffImageBase64: comparison.diffImage ? Buffer.from(comparison.diffImage).toString("base64") : null,
    };
  });
}
