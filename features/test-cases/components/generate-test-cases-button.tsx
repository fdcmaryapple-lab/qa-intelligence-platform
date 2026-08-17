"use client";

import * as React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateTestCasesAction } from "@/features/test-cases/actions";

export function GenerateTestCasesButton({ requirementId }: { requirementId: string }) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);

    const result = await generateTestCasesAction({ requirementId });

    setIsGenerating(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }
  }

  return (
    <div className="space-y-1.5">
      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {isGenerating ? "Generating…" : "Generate test cases"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
