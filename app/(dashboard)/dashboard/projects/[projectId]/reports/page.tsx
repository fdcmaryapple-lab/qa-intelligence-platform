import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as projectService from "@/server/services/project-service";
import { getProjectReport } from "@/server/services/reports-service";
import { BreakdownChart } from "@/features/reports/components/breakdown-chart";
import { NotFoundError } from "@/lib/errors";

export const metadata: Metadata = { title: "QA Reports — QA Intelligence Platform" };

export default async function ReportsPage({
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

  const report = await getProjectReport(userId, projectId);

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/projects/${projectId}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {project.name}
      </Link>

      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight">QA Reports</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Counted across everything recorded in this project — every regression result ever run,
          not just the current state.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <BreakdownChart title="Test cases by review status" data={report.testCasesByReviewStatus} />
        <BreakdownChart title="Bugs by status" data={report.bugsByStatus} />
        <BreakdownChart title="Bugs by severity" data={report.bugsBySeverity} />
        <BreakdownChart title="Regression results (all runs)" data={report.regressionResults} />
        <BreakdownChart title="API test executions" data={report.apiExecutionResults} />
        <BreakdownChart title="Automation script validity" data={report.automationValidity} />
      </div>
    </div>
  );
}
