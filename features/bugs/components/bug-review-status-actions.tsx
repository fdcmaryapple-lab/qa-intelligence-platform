"use client";

import * as React from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateBugReviewStatusAction } from "@/features/bugs/actions";

export function BugReviewStatusActions({ bugId }: { bugId: string }) {
  const [pending, setPending] = React.useState<"ACCEPTED" | "REJECTED" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function setStatus(reviewStatus: "ACCEPTED" | "REJECTED") {
    setPending(reviewStatus);
    setError(null);

    const result = await updateBugReviewStatusAction({ bugId, reviewStatus });

    setPending(null);
    if (!result.success) {
      setError(result.error.message);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-pass hover:bg-pass/10 hover:text-pass"
        onClick={() => setStatus("ACCEPTED")}
        disabled={pending !== null}
      >
        {pending === "ACCEPTED" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
        Accept
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-fail hover:bg-fail/10 hover:text-fail"
        onClick={() => setStatus("REJECTED")}
        disabled={pending !== null}
      >
        {pending === "REJECTED" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <X className="h-3.5 w-3.5" />
        )}
        Reject
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
