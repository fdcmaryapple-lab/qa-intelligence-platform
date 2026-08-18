import * as screenshotRepository from "@/server/repositories/screenshot-repository";
import { requireProjectAccess } from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";
import { diffImages, getPngDimensions } from "@/server/screenshot/diff-images";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type {
  CreateBaselineInput,
  CompareScreenshotInput,
} from "@/features/screenshot-diff/schemas/screenshot-schemas";

export async function listBaselines(userId: string, projectId: string) {
  await requireProjectAccess(userId, projectId, "VIEWER");
  return screenshotRepository.findBaselinesForProject(projectId);
}

export async function countBaselinesForUser(userId: string) {
  return screenshotRepository.countBaselinesForUser(userId);
}

export async function createBaseline(userId: string, input: CreateBaselineInput) {
  await requireProjectAccess(userId, input.projectId, "EDITOR");

  const imageBuffer = Buffer.from(input.imageBase64, "base64");
  const dimensions = getPngDimensions(imageBuffer);
  if (!dimensions) {
    throw new ValidationError("The uploaded file isn't a valid PNG image.");
  }

  return prisma.$transaction(async (tx) => {
    const baseline = await tx.screenshotBaseline.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        image: imageBuffer,
        width: dimensions.width,
        height: dimensions.height,
        createdById: userId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "screenshot_baseline.created",
        targetType: "ScreenshotBaseline",
        targetId: baseline.id,
        projectId: input.projectId,
        metadata: { name: baseline.name, width: dimensions.width, height: dimensions.height },
      },
    });

    return baseline;
  });
}

export async function compareScreenshot(userId: string, input: CompareScreenshotInput) {
  const baseline = await screenshotRepository.findBaselineById(input.baselineId);
  if (!baseline) {
    throw new NotFoundError("ScreenshotBaseline", input.baselineId);
  }

  await requireProjectAccess(userId, baseline.projectId, "EDITOR");

  const candidateBuffer = Buffer.from(input.imageBase64, "base64");
  const diffResult = diffImages(Buffer.from(baseline.image), candidateBuffer);

  return prisma.$transaction(async (tx) => {
    const comparison = diffResult.ok
      ? await tx.screenshotComparison.create({
          data: {
            baselineId: baseline.id,
            projectId: baseline.projectId,
            candidateImage: candidateBuffer,
            diffImage: diffResult.diffImage,
            diffPixelCount: diffResult.diffPixelCount,
            diffPercentage: diffResult.diffPercentage,
            threshold: input.threshold,
            result: diffResult.diffPercentage > input.threshold ? "FAIL" : "PASS",
            createdById: userId,
          },
        })
      : await tx.screenshotComparison.create({
          data: {
            baselineId: baseline.id,
            projectId: baseline.projectId,
            candidateImage: candidateBuffer,
            threshold: input.threshold,
            result: "ERROR",
            error: diffResult.error,
            createdById: userId,
          },
        });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "screenshot_comparison.created",
        targetType: "ScreenshotBaseline",
        targetId: baseline.id,
        projectId: baseline.projectId,
        metadata: { comparisonId: comparison.id, result: comparison.result },
      },
    });

    return comparison;
  });
}
