import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban, FileSearch, ListChecks, Bug } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as projectService from "@/server/services/project-service";
import * as requirementService from "@/server/services/requirement-service";
import * as testCaseService from "@/server/services/test-case-service";
import { ProjectList } from "@/features/projects/components/project-list";

export const metadata: Metadata = { title: "Dashboard — QA Intelligence Platform" };

export default async function DashboardPage() {
  const userId = await getCurrentUserId();

  const [projects, projectCount, requirementCount, testCaseCount] = await Promise.all([
    projectService.listProjectsForUser(userId),
    projectService.countProjectsForUser(userId),
    requirementService.countRequirementsForUser(userId),
    testCaseService.countTestCasesForUser(userId),
  ]);

  const summaryCards = [
    { label: "Projects", value: projectCount, icon: FolderKanban },
    { label: "Requirements", value: requirementCount, icon: FileSearch },
    { label: "Test cases", value: testCaseCount, icon: ListChecks },
    { label: "Open bugs", value: 0, icon: Bug },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Overview</h2>
          <p className="text-sm text-muted-foreground">
            Bug reports arrive in a later phase.
          </p>
        </div>
        <Badge variant="secondary" className="font-mono">
          Phase 4 · Test Cases &amp; AI Generation
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Your projects</h3>
        <Link href="/dashboard/projects" className="text-sm text-primary hover:underline">
          View all
        </Link>
      </div>

      <ProjectList projects={projects.slice(0, 6)} />
    </div>
  );
}
