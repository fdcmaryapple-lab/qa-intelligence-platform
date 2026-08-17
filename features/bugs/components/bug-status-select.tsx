"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { bugStatusValues } from "@/features/bugs/schemas/bug-schemas";
import { updateBugStatusAction } from "@/features/bugs/actions";

type BugStatus = (typeof bugStatusValues)[number];

export function BugStatusSelect({
  bugId,
  status,
}: {
  bugId: string;
  status: BugStatus;
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleChange(next: BugStatus) {
    setPending(true);
    setError(null);

    const result = await updateBugStatusAction({ bugId, status: next });

    setPending(false);
    if (!result.success) {
      setError(result.error.message);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={status}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value as BugStatus)}
        className="h-7 rounded-md border border-input bg-background px-2 text-xs shadow-sm disabled:opacity-50"
      >
        {bugStatusValues.map((value) => (
          <option key={value} value={value}>
            {value.replace("_", " ")}
          </option>
        ))}
      </select>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
