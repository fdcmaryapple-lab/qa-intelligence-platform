import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as projectService from "@/server/services/project-service";
import * as testRunService from "@/server/services/test-run-service";
import * as testCaseService from "@/server/services/test-case-service";
import { TestRunList } from "@/features/regression/components/test-run-list";
import { CreateTestRunDialog } from "@/features/regression/components/create-test-run-dialog";
import { NotFoundError } from "@/lib/errors";

export const metadata: Metadata = { title: "Regression — QA Intelligence Platform" };

export default async function RegressionPage({
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

  const [testRuns, testCases] = await Promise.all([
    testRunService.listTestRuns(userId, projectId),
    testCaseService.listTestCases(userId, projectId),
  ]);

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
          <h2 className="font-display text-xl font-semibold tracking-tight">Regression</h2>
          <Badge variant="secondary">{testRuns.length}</Badge>
        </div>
        <CreateTestRunDialog
          projectId={projectId}
          testCases={testCases.map((tc) => ({ id: tc.id, title: tc.title }))}
        />
      </div>

      <TestRunList testRuns={testRuns} />
    </div>
  );
}
