import { Bug as BugIcon, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BugReviewStatusActions } from "@/features/bugs/components/bug-review-status-actions";
import { BugStatusSelect } from "@/features/bugs/components/bug-status-select";

type BugListItem = {
  id: string;
  title: string;
  description: string | null;
  preconditions: string | null;
  stepsToReproduce: string[];
  expectedResult: string | null;
  actualResult: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "WONT_FIX";
  reviewStatus: "DRAFT" | "ACCEPTED" | "EDITED" | "REJECTED";
  aiGenerationId: string | null;
  testCase: { id: string; title: string } | null;
};

const severityVariant = {
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

export function BugList({ bugs }: { bugs: BugListItem[] }) {
  if (bugs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <BugIcon className="h-8 w-8 text-muted-foreground" />
          <p className="font-display text-base font-semibold">No bugs reported</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Report a bug from a test case with AI, or add one manually.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {bugs.map((bug) => (
        <Card key={bug.id}>
          <CardContent className="space-y-2.5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {bug.aiGenerationId ? (
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : null}
                <h3 className="font-display text-sm font-semibold">{bug.title}</h3>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <Badge variant={reviewStatusVariant[bug.reviewStatus]}>{bug.reviewStatus}</Badge>
                <Badge variant={severityVariant[bug.severity]}>{bug.severity}</Badge>
                <BugStatusSelect bugId={bug.id} status={bug.status} />
              </div>
            </div>

            {bug.testCase ? (
              <p className="font-mono text-xs text-muted-foreground">
                From test case: {bug.testCase.title}
              </p>
            ) : null}

            {bug.description ? (
              <p className="text-sm text-muted-foreground">{bug.description}</p>
            ) : null}

            {bug.preconditions ? (
              <p className="font-mono text-xs text-muted-foreground">
                <span className="font-semibold">Preconditions:</span> {bug.preconditions}
              </p>
            ) : null}

            {bug.stepsToReproduce.length > 0 ? (
              <ol className="list-decimal space-y-0.5 pl-5 text-sm">
                {bug.stepsToReproduce.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            ) : null}

            {bug.expectedResult ? (
              <p className="text-sm">
                <span className="font-semibold">Expected:</span> {bug.expectedResult}
              </p>
            ) : null}
            {bug.actualResult ? (
              <p className="text-sm">
                <span className="font-semibold">Actual:</span> {bug.actualResult}
              </p>
            ) : null}

            {bug.reviewStatus === "DRAFT" ? (
              <div className="pt-1">
                <BugReviewStatusActions bugId={bug.id} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
