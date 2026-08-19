import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as projectService from "@/server/services/project-service";
import { computeProjectRisk, type RiskLevel } from "@/server/services/risk-service";
import { NotFoundError } from "@/lib/errors";

export const metadata: Metadata = { title: "Risk Prediction — QA Intelligence Platform" };

const levelVariant: Record<RiskLevel, "pass" | "warn" | "fail"> = {
  LOW: "pass",
  MEDIUM: "warn",
  HIGH: "fail",
  CRITICAL: "fail",
};

export default async function RiskPage({
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

  const risks = await computeProjectRisk(userId, projectId);

  const counts = risks.reduce<Record<RiskLevel, number>>(
    (acc, r) => {
      acc[r.level] += 1;
      return acc;
    },
    { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
  );

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/projects/${projectId}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {project.name}
      </Link>

      <div className="flex items-center gap-2">
        <h2 className="font-display text-xl font-semibold tracking-tight">Risk Prediction</h2>
        <Badge variant="secondary">{risks.length}</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        A deterministic score (0–100) per requirement, based on open bug severity, unreviewed
        test cases, and recent regression failures — not AI-generated, and fully explained below.
      </p>

      {risks.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as RiskLevel[])
            .filter((level) => counts[level] > 0)
            .map((level) => (
              <Badge key={level} variant={levelVariant[level]}>
                {counts[level]} {level}
              </Badge>
            ))}
        </div>
      ) : null}

      {risks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            <p className="font-display text-base font-semibold">No requirements yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add requirements and test cases to see risk scores here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {risks.map((risk) => (
            <Card key={risk.requirementId}>
              <CardContent className="space-y-2.5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-semibold">{risk.requirementTitle}</h3>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-semibold">{risk.score}</span>
                    <Badge variant={levelVariant[risk.level]}>{risk.level}</Badge>
                  </div>
                </div>

                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    Score breakdown
                  </summary>
                  <div className="mt-2 space-y-2">
                    {risk.factors.map((factor) => (
                      <div key={factor.label} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{factor.label}</span>
                          <span className="font-mono text-muted-foreground">
                            {factor.points}/{factor.maxPoints}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${(factor.points / factor.maxPoints) * 100}%` }}
                          />
                        </div>
                        <p className="text-muted-foreground">{factor.detail}</p>
                      </div>
                    ))}
                  </div>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
