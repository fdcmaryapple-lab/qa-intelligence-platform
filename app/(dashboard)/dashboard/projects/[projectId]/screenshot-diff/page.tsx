import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as projectService from "@/server/services/project-service";
import * as screenshotService from "@/server/services/screenshot-service";
import { BaselineList } from "@/features/screenshot-diff/components/baseline-list";
import { UploadBaselineDialog } from "@/features/screenshot-diff/components/upload-baseline-dialog";
import { NotFoundError } from "@/lib/errors";

export const metadata: Metadata = { title: "Screenshot Diff — QA Intelligence Platform" };

export default async function ScreenshotDiffPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const userId = await getCurrentUserId();

  let project;
  try {
    project = await projectService.getProject(userId, projectId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  if (!project) {
    notFound();
  }

  const baselines = await screenshotService.listBaselines(userId, projectId);

  const baselineItems = baselines.map((b) => ({
    id: b.id,
    name: b.name,
    width: b.width,
    height: b.height,
    imageBase64: Buffer.from(b.image).toString("base64"),
    comparisons: b.comparisons.map((c) => ({
      id: c.id,
      result: c.result,
      diffPercentage: c.diffPercentage,
      threshold: c.threshold,
      error: c.error,
      diffImageBase64: c.diffImage ? Buffer.from(c.diffImage).toString("base64") : null,
    })),
  }));

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/projects/${projectId}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {project.name}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-semibold tracking-tight">Screenshot Diff</h2>
          <Badge variant="secondary">{baselines.length}</Badge>
        </div>
        <UploadBaselineDialog projectId={projectId} />
      </div>

      <BaselineList baselines={baselineItems} />
    </div>
  );
}
