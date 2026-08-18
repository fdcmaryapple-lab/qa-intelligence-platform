"use client";

import * as React from "react";
import { Play, Loader2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { runApiRequestAction, deleteApiRequestAction } from "@/features/api-testing/actions";

type AssertionResult = {
  assertionId: string;
  type: string;
  passed: boolean;
  actual: string;
  expected: string;
};

type Execution = {
  id: string;
  responseStatus: number | null;
  responseBody: string | null;
  responseTruncated: boolean;
  durationMs: number | null;
  error: string | null;
  assertionResults: unknown;
  result: "PASS" | "FAIL" | "ERROR";
};

export type ApiRequestCardItem = {
  id: string;
  name: string;
  method: string;
  url: string;
  assertions: { id: string; type: string; jsonPath: string | null; expected: string }[];
  executions: Execution[];
};

const methodVariant: Record<string, "secondary" | "pass" | "warn" | "fail"> = {
  GET: "pass",
  POST: "secondary",
  PUT: "warn",
  PATCH: "warn",
  DELETE: "fail",
  HEAD: "secondary",
  OPTIONS: "secondary",
};

const resultVariant = {
  PASS: "pass",
  FAIL: "fail",
  ERROR: "fail",
} as const;

export function ApiRequestCard({ apiRequest }: { apiRequest: ApiRequestCardItem }) {
  const [running, setRunning] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [latestExecution, setLatestExecution] = React.useState<Execution | null>(
    apiRequest.executions[0] ?? null,
  );
  const [error, setError] = React.useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setError(null);

    const result = await runApiRequestAction({ apiRequestId: apiRequest.id });

    setRunning(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setLatestExecution(result.data as unknown as Execution);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${apiRequest.name}"? This can't be undone.`)) return;

    setDeleting(true);
    const result = await deleteApiRequestAction({ apiRequestId: apiRequest.id });
    setDeleting(false);

    if (!result.success) {
      setError(result.error.message);
    }
  }

  const assertionResults: AssertionResult[] = Array.isArray(latestExecution?.assertionResults)
    ? (latestExecution!.assertionResults as AssertionResult[])
    : [];

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={methodVariant[apiRequest.method] ?? "secondary"}>
              {apiRequest.method}
            </Badge>
            <h3 className="font-display text-sm font-semibold">{apiRequest.name}</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={handleRun} disabled={running}>
              {running ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Run
            </Button>
            <Button size="icon" variant="ghost" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        <p className="break-all font-mono text-xs text-muted-foreground">{apiRequest.url}</p>

        {apiRequest.assertions.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {apiRequest.assertions.length} assertion{apiRequest.assertions.length === 1 ? "" : "s"}
          </p>
        ) : null}

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        {latestExecution ? (
          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={resultVariant[latestExecution.result]}>{latestExecution.result}</Badge>
              {latestExecution.responseStatus !== null ? (
                <span className="font-mono text-xs text-muted-foreground">
                  {latestExecution.responseStatus}
                </span>
              ) : null}
              {latestExecution.durationMs !== null ? (
                <span className="font-mono text-xs text-muted-foreground">
                  {latestExecution.durationMs}ms
                </span>
              ) : null}
            </div>

            {latestExecution.error ? (
              <p className="text-xs text-destructive">{latestExecution.error}</p>
            ) : null}

            {assertionResults.length > 0 ? (
              <ul className="space-y-1">
                {assertionResults.map((a, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-xs">
                    {a.passed ? (
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-pass" />
                    ) : (
                      <XCircle className="h-3 w-3 shrink-0 text-fail" />
                    )}
                    <span className="font-mono">{a.type}</span>
                    <span className="text-muted-foreground">
                      expected &ldquo;{a.expected}&rdquo;, got &ldquo;{a.actual}&rdquo;
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {latestExecution.responseBody ? (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">Response body</summary>
                <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-background p-2 font-mono">
                  {latestExecution.responseBody}
                  {latestExecution.responseTruncated ? "\n… (truncated)" : ""}
                </pre>
              </details>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
