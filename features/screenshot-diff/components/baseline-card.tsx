"use client";

import * as React from "react";
import { Loader2, ImageIcon, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { compareScreenshotAction } from "@/features/screenshot-diff/actions";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Couldn't read the file."));
    reader.readAsDataURL(file);
  });
}

type ComparisonItem = {
  id: string;
  result: "PASS" | "FAIL" | "ERROR";
  diffPercentage: number | null;
  threshold: number;
  error: string | null;
  diffImageBase64: string | null;
};

export type BaselineCardItem = {
  id: string;
  name: string;
  width: number;
  height: number;
  imageBase64: string;
  comparisons: ComparisonItem[];
};

const resultVariant = { PASS: "pass", FAIL: "fail", ERROR: "fail" } as const;

export function BaselineCard({ baseline }: { baseline: BaselineCardItem }) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isComparing, setIsComparing] = React.useState(false);
  const [compareError, setCompareError] = React.useState<string | null>(null);
  const [threshold, setThreshold] = React.useState("1");
  const [latestComparison, setLatestComparison] = React.useState<ComparisonItem | null>(
    baseline.comparisons[0] ?? null,
  );

  async function handleCompare(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCompareError(null);

    const fileInput = e.currentTarget.elements.namedItem("candidate") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setCompareError("Choose a PNG image.");
      return;
    }

    setIsComparing(true);
    const imageBase64 = await readFileAsBase64(file);
    const result = await compareScreenshotAction({
      baselineId: baseline.id,
      imageBase64,
      threshold: Number(threshold) || 1,
    });
    setIsComparing(false);

    if (!result.success) {
      setCompareError(result.error.message);
      return;
    }

    setLatestComparison(result.data);
    setDialogOpen(false);
  }

  return (
    <Card>
      <CardContent className="space-y-2.5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-display text-sm font-semibold">{baseline.name}</h3>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <ImageIcon className="h-3.5 w-3.5" />
                Compare
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Compare against &ldquo;{baseline.name}&rdquo;</DialogTitle>
                <DialogDescription>
                  Upload a candidate PNG — must match the baseline&apos;s exact dimensions
                  ({baseline.width}×{baseline.height}).
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCompare} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`candidate-${baseline.id}`}>Candidate image</Label>
                  <input
                    id={`candidate-${baseline.id}`}
                    name="candidate"
                    type="file"
                    accept="image/png"
                    className="block w-full text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`threshold-${baseline.id}`}>Fail threshold (% pixels different)</Label>
                  <Input
                    id={`threshold-${baseline.id}`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                  />
                </div>
                {compareError ? <p className="text-sm text-destructive">{compareError}</p> : null}
                <DialogFooter>
                  <Button type="submit" disabled={isComparing}>
                    {isComparing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Compare
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <p className="font-mono text-xs text-muted-foreground">
          {baseline.width}×{baseline.height}
        </p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/png;base64,${baseline.imageBase64}`}
          alt={baseline.name}
          className="max-h-40 rounded-md border object-contain"
        />

        {latestComparison ? (
          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={resultVariant[latestComparison.result]}>
                {latestComparison.result === "PASS" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : latestComparison.result === "FAIL" ? (
                  <XCircle className="h-3 w-3" />
                ) : (
                  <AlertTriangle className="h-3 w-3" />
                )}
                {latestComparison.result}
              </Badge>
              {latestComparison.diffPercentage !== null ? (
                <span className="font-mono text-xs text-muted-foreground">
                  {latestComparison.diffPercentage.toFixed(2)}% different (threshold{" "}
                  {latestComparison.threshold}%)
                </span>
              ) : null}
            </div>

            {latestComparison.error ? (
              <p className="text-xs text-destructive">{latestComparison.error}</p>
            ) : null}

            {latestComparison.diffImageBase64 ? (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">View diff</summary>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${latestComparison.diffImageBase64}`}
                  alt="Diff"
                  className="mt-1 max-h-64 rounded-md border object-contain"
                />
              </details>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
