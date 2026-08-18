import { FlaskConical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  AutomationScriptCard,
  type AutomationScriptCardItem,
} from "@/features/automation/components/automation-script-card";

export function AutomationScriptList({ scripts }: { scripts: AutomationScriptCardItem[] }) {
  if (scripts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <FlaskConical className="h-8 w-8 text-muted-foreground" />
          <p className="font-display text-base font-semibold">No automation scripts yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Generate a Playwright script from a test case with AI, or write one manually.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {scripts.map((script) => (
        <AutomationScriptCard key={script.id} script={script} />
      ))}
    </div>
  );
}
