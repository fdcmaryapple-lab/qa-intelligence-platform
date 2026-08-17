import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as projectService from "@/server/services/project-service";
import * as requirementService from "@/server/services/requirement-service";
import { RequirementList } from "@/features/requirements/components/requirement-list";
import { CreateRequirementDialog } from "@/features/requirements/components/create-requirement-dialog";
import { NotFoundError } from "@/lib/errors";

export const metadata: Metadata = { title: "Project — QA Intelligence Platform" };

export default async function ProjectDetailPage({
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

  const requirements = await requirementService.listRequirements(userId, projectId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{project.slug}</p>
          <h2 className="font-display text-xl font-semibold tracking-tight">{project.name}</h2>
          {project.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
          ) : null}
        </div>
        <Link
          href={`/dashboard/projects/${project.id}/test-cases`}
          className="text-sm text-primary hover:underline"
        >
          View all test cases →
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base font-semibold">Requirements</h3>
          <Badge variant="secondary">{requirements.length}</Badge>
        </div>
        <CreateRequirementDialog projectId={project.id} />
      </div>

      <RequirementList requirements={requirements} projectId={project.id} />
    </div>
  );
}
