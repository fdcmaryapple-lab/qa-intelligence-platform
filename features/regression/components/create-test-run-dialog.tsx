"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTestRunAction } from "@/features/regression/actions";

type AvailableTestCase = { id: string; title: string };

export function CreateTestRunDialog({
  projectId,
  testCases,
}: {
  projectId: string;
  testCases: AvailableTestCase[];
}) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string }>({ defaultValues: { name: "" } });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function onSubmit(values: { name: string }) {
    setSubmitError(null);

    if (selected.size === 0) {
      setSubmitError("Select at least one test case.");
      return;
    }

    const result = await createTestRunAction({
      projectId,
      name: values.name,
      testCaseIds: Array.from(selected),
    });

    if (!result.success) {
      setSubmitError(result.error.message);
      return;
    }

    reset({ name: "" });
    setSelected(new Set());
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset({ name: "" });
          setSelected(new Set());
          setSubmitError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-3.5 w-3.5" />
          New run
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New regression run</DialogTitle>
          <DialogDescription>
            Pick the test cases to check against this build — you&apos;ll record a result for
            each one afterward.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="run-name">Name</Label>
            <Input
              id="run-name"
              placeholder="Regression — Release 1.2"
              aria-invalid={!!errors.name}
              {...register("name", { required: "Name is required" })}
            />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Test cases</Label>
            {testCases.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No test cases in this project yet — add some first.
              </p>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
                {testCases.map((tc) => (
                  <label
                    key={tc.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(tc.id)}
                      onChange={() => toggle(tc.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    {tc.title}
                  </label>
                ))}
              </div>
            )}
          </div>

          {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || testCases.length === 0}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create run
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
