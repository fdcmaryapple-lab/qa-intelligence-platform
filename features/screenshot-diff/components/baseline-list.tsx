import { Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BaselineCard, type BaselineCardItem } from "@/features/screenshot-diff/components/baseline-card";

export function BaselineList({ baselines }: { baselines: BaselineCardItem[] }) {
  if (baselines.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
          <p className="font-display text-base font-semibold">No baselines yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Upload a reference screenshot to start comparing future captures against it.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {baselines.map((baseline) => (
        <BaselineCard key={baseline.id} baseline={baseline} />
      ))}
    </div>
  );
}
