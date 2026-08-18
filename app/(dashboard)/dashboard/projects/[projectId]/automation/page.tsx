import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as projectService from "@/server/services/project-service";
import * as automationService from "@/server/services/automation-service";
import { AutomationScriptList } from "@/features/automation/components/automation-script-list";
import { CreateAutomationScriptDialog } from "@/features/automation/components/create-automation-script-dialog";
import { NotFoundError } from "@/lib/errors";

export const metadata: Metadata = { title: "Automation — QA Intelligence Platform" };

export default async function AutomationPage({
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

  const scripts = await automationService.listAutomationScripts(userId, projectId);

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
          <h2 className="font-display text-xl font-semibold tracking-tight">Automation</h2>
          <Badge variant="secondary">{scripts.length}</Badge>
        </div>
        <CreateAutomationScriptDialog projectId={projectId} />
      </div>

      <AutomationScriptList scripts={scripts} />
    </div>
  );
}
