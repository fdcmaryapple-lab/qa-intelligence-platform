import Link from "next/link";
import { ListChecks, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReviewStatusActions } from "@/features/test-cases/components/review-status-actions";
import { GenerateBugReportDialog } from "@/features/bugs/components/generate-bug-report-dialog";
import { GenerateAutomationButton } from "@/features/automation/components/generate-automation-button";

type TestCaseListItem = {
  id: string;
  title: string;
  description: string | null;
  preconditions: string | null;
  steps: string[];
  expectedResult: string | null;
  type: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reviewStatus: "DRAFT" | "ACCEPTED" | "EDITED" | "REJECTED";
  aiGenerationId: string | null;
  requirement: { id: string; title: string } | null;
};

const priorityVariant = {
  LOW: "secondary",
  MEDIUM: "secondary",
  HIGH: "warn",
  CRITICAL: "fail",
} as const;

const reviewStatusVariant = {
  DRAFT: "warn",
  ACCEPTED: "pass",
  EDITED: "secondary",
  REJECTED: "fail",
} as const;

export function TestCaseList({
  testCases,
  projectId,
}: {
  testCases: TestCaseListItem[];
  projectId: string;
}) {
  if (testCases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ListChecks className="h-8 w-8 text-muted-foreground" />
          <p className="font-display text-base font-semibold">No test cases yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Generate test cases from a requirement with AI, or add one manually.
          </p>
        </CardContent>
      </Card>
    );
  }

  const grouped = new Map<string, { title: string; items: TestCaseListItem[] }>();
  for (const tc of testCases) {
    const key = tc.requirement?.id ?? "unlinked";
    const title = tc.requirement?.title ?? "Not linked to a requirement";
    if (!grouped.has(key)) {
      grouped.set(key, { title, items: [] });
    }
    grouped.get(key)!.items.push(tc);
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.values()).map((group) => (
        <div key={group.title} className="space-y-3">
          <h4 className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            {group.title}
          </h4>
          <div className="space-y-3">
            {group.items.map((tc) => (
              <Card key={tc.id}>
                <CardContent className="space-y-2.5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {tc.aiGenerationId ? (
                        <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                      ) : null}
                      <h3 className="font-display text-sm font-semibold">{tc.title}</h3>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Badge variant={reviewStatusVariant[tc.reviewStatus]}>
                        {tc.reviewStatus}
                      </Badge>
                      <Badge variant={priorityVariant[tc.priority]}>{tc.priority}</Badge>
                      <Badge variant="secondary">{tc.type}</Badge>
                    </div>
                  </div>

                  {tc.description ? (
                    <p className="text-sm text-muted-foreground">{tc.description}</p>
                  ) : null}

                  {tc.preconditions ? (
                    <p className="font-mono text-xs text-muted-foreground">
                      <span className="font-semibold">Preconditions:</span> {tc.preconditions}
                    </p>
                  ) : null}

                  {tc.steps.length > 0 ? (
                    <ol className="list-decimal space-y-0.5 pl-5 text-sm">
                      {tc.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  ) : null}

                  {tc.expectedResult ? (
                    <p className="text-sm">
                      <span className="font-semibold">Expected:</span> {tc.expectedResult}
                    </p>
                  ) : null}

                  {tc.reviewStatus === "DRAFT" ? (
                    <div className="pt-1">
                      <ReviewStatusActions testCaseId={tc.id} />
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <GenerateBugReportDialog testCaseId={tc.id} testCaseTitle={tc.title} />
                    <Link
                      href={`/dashboard/projects/${projectId}/bugs`}
                      className="text-xs text-primary hover:underline"
                    >
                      View bugs
                    </Link>
                    <GenerateAutomationButton testCaseId={tc.id} />
                    <Link
                      href={`/dashboard/projects/${projectId}/automation`}
                      className="text-xs text-primary hover:underline"
                    >
                      View automation
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
