"use client";

import * as React from "react";
import { Sparkles, Copy, Check, Download, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AutomationReviewStatusActions } from "@/features/automation/components/automation-review-status-actions";

export type AutomationScriptCardItem = {
  id: string;
  title: string;
  code: string;
  reviewStatus: "DRAFT" | "ACCEPTED" | "EDITED" | "REJECTED";
  isValid: boolean | null;
  validationErrors: string | null;
  aiGenerationId: string | null;
  testCase: { id: string; title: string } | null;
};

const reviewStatusVariant = {
  DRAFT: "warn",
  ACCEPTED: "pass",
  EDITED: "secondary",
  REJECTED: "fail",
} as const;

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "automation-script"
  );
}

export function AutomationScriptCard({ script }: { script: AutomationScriptCardItem }) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(script.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([script.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(script.title)}.spec.ts`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardContent className="space-y-2.5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {script.aiGenerationId ? (
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
            ) : null}
            <h3 className="font-display text-sm font-semibold">{script.title}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant={reviewStatusVariant[script.reviewStatus]}>{script.reviewStatus}</Badge>
            {script.isValid === true ? (
              <Badge variant="pass">
                <CheckCircle2 className="h-3 w-3" /> Valid
              </Badge>
            ) : script.isValid === false ? (
              <Badge variant="fail">
                <AlertTriangle className="h-3 w-3" /> Invalid
              </Badge>
            ) : null}
          </div>
        </div>

        {script.testCase ? (
          <p className="font-mono text-xs text-muted-foreground">
            From test case: {script.testCase.title}
          </p>
        ) : null}

        {script.isValid === false && script.validationErrors ? (
          <pre className="whitespace-pre-wrap rounded-md border border-destructive/30 bg-destructive/5 p-2 font-mono text-xs text-destructive">
            {script.validationErrors}
          </pre>
        ) : null}

        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">View code</summary>
          <pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 font-mono">
            {script.code}
          </pre>
        </details>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            {copied ? <Check className="h-3 w-3 text-pass" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            <Download className="h-3 w-3" />
            Download .spec.ts
          </button>
        </div>

        {script.reviewStatus === "DRAFT" ? (
          <div className="pt-1">
            <AutomationReviewStatusActions scriptId={script.id} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
