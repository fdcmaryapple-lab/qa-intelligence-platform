import { ClipboardCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TestRunCard, type TestRunCardItem } from "@/features/regression/components/test-run-card";

export function TestRunList({ testRuns }: { testRuns: TestRunCardItem[] }) {
  if (testRuns.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
          <p className="font-display text-base font-semibold">No regression runs yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Create a run and pick the test cases to check against a build.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {testRuns.map((testRun) => (
        <TestRunCard key={testRun.id} testRun={testRun} />
      ))}
    </div>
  );
}
