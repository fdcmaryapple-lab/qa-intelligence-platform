import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as projectService from "@/server/services/project-service";
import { requireProjectAccess } from "@/server/auth/access-control";
import { EditProjectForm } from "@/features/projects/components/edit-project-form";
import { DeleteProjectDialog } from "@/features/projects/components/delete-project-dialog";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

export const metadata: Metadata = { title: "Settings — QA Intelligence Platform" };

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const userId = await getCurrentUserId();

  let membership;
  try {
    membership = await requireProjectAccess(userId, projectId, "ADMIN");
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    if (error instanceof ForbiddenError) {
      return (
        <div className="space-y-4">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
          <p className="text-sm text-muted-foreground">
            You need the ADMIN role or higher to view project settings.
          </p>
        </div>
      );
    }
    throw error;
  }

  const project = await projectService.getProject(userId, projectId);
  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/projects/${projectId}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {project.name}
      </Link>

      <h2 className="font-display text-xl font-semibold tracking-tight">Settings</h2>

      <EditProjectForm
        projectId={projectId}
        initialName={project.name}
        initialDescription={project.description ?? ""}
      />

      {membership.role === "OWNER" ? (
        <DeleteProjectDialog projectId={projectId} projectName={project.name} />
      ) : null}
    </div>
  );
}
