"use client";

import * as React from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  recordTestRunResultAction,
  completeTestRunAction,
} from "@/features/regression/actions";
import { testRunResultStatusValues } from "@/features/regression/schemas/regression-schemas";

type ResultStatus = (typeof testRunResultStatusValues)[number];

type TestRunResultItem = {
  id: string;
  result: ResultStatus;
  notes: string | null;
  testCase: { id: string; title: string };
};

export type TestRunCardItem = {
  id: string;
  name: string;
  status: "IN_PROGRESS" | "COMPLETED";
  results: TestRunResultItem[];
};

const resultBadgeVariant: Record<ResultStatus, "secondary" | "pass" | "fail" | "warn"> = {
  NOT_RUN: "secondary",
  PASS: "pass",
  FAIL: "fail",
  BLOCKED: "warn",
  SKIPPED: "secondary",
};

function ResultRow({ item }: { item: TestRunResultItem }) {
  const [result, setResult] = React.useState<ResultStatus>(item.result);
  const [notes, setNotes] = React.useState(item.notes ?? "");
  const [saving, setSaving] = React.useState(false);

  async function save(nextResult: ResultStatus, nextNotes: string) {
    setSaving(true);
    await recordTestRunResultAction({
      testRunResultId: item.id,
      result: nextResult,
      notes: nextNotes || undefined,
    });
    setSaving(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t py-2 first:border-t-0">
      <span className="flex-1 text-sm">{item.testCase.title}</span>
      <select
        value={result}
        onChange={(e) => {
          const next = e.target.value as ResultStatus;
          setResult(next);
          void save(next, notes);
        }}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm"
      >
        {testRunResultStatusValues.map((v) => (
          <option key={v} value={v}>
            {v.replace("_", " ")}
          </option>
        ))}
      </select>
      <Input
        placeholder="Notes"
        defaultValue={notes}
        onBlur={(e) => {
          const next = e.target.value;
          setNotes(next);
          void save(result, next);
        }}
        className="h-8 w-40 text-xs"
      />
      {saving ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" /> : null}
    </div>
  );
}

export function TestRunCard({ testRun }: { testRun: TestRunCardItem }) {
  const [completing, setCompleting] = React.useState(false);
  const [status, setStatus] = React.useState(testRun.status);

  const counts = testRun.results.reduce<Record<ResultStatus, number>>(
    (acc, r) => {
      acc[r.result] += 1;
      return acc;
    },
    { NOT_RUN: 0, PASS: 0, FAIL: 0, BLOCKED: 0, SKIPPED: 0 },
  );

  async function handleComplete() {
    setCompleting(true);
    const result = await completeTestRunAction({ testRunId: testRun.id });
    setCompleting(false);
    if (result.success) {
      setStatus("COMPLETED");
    }
  }

  return (
    <Card>
      <CardContent className="space-y-2.5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold">{testRun.name}</h3>
          <div className="flex items-center gap-1.5">
            <Badge variant={status === "COMPLETED" ? "pass" : "warn"}>{status}</Badge>
            {status === "IN_PROGRESS" ? (
              <Button size="sm" variant="outline" onClick={handleComplete} disabled={completing}>
                {completing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Complete run
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(counts) as [ResultStatus, number][])
            .filter(([, count]) => count > 0)
            .map(([status, count]) => (
              <Badge key={status} variant={resultBadgeVariant[status]}>
                {count} {status.replace("_", " ")}
              </Badge>
            ))}
        </div>

        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            {testRun.results.length} test case{testRun.results.length === 1 ? "" : "s"}
          </summary>
          <div className="mt-1">
            {testRun.results.map((r) => (
              <ResultRow key={r.id} item={r} />
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
