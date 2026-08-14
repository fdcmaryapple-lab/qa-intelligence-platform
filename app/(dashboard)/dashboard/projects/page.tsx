import type { Metadata } from "next";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as projectService from "@/server/services/project-service";
import { ProjectList } from "@/features/projects/components/project-list";
import { CreateProjectDialog } from "@/features/projects/components/create-project-dialog";

export const metadata: Metadata = { title: "Projects — QA Intelligence Platform" };

export default async function ProjectsPage() {
  const userId = await getCurrentUserId();
  const projects = await projectService.listProjectsForUser(userId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Projects</h2>
          <p className="text-sm text-muted-foreground">QA workspaces you&apos;re a member of.</p>
        </div>
        <CreateProjectDialog />
      </div>

      <ProjectList projects={projects} />
    </div>
  );
}
