"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { bugSeverityValues, bugPriorityValues } from "@/features/bugs/schemas/bug-schemas";
import { createBugAction } from "@/features/bugs/actions";

type FormValues = {
  title: string;
  description: string;
  preconditions: string;
  stepsText: string;
  expectedResult: string;
  actualResult: string;
  severity: (typeof bugSeverityValues)[number];
  priority: (typeof bugPriorityValues)[number];
};

const defaultValues: FormValues = {
  title: "",
  description: "",
  preconditions: "",
  stepsText: "",
  expectedResult: "",
  actualResult: "",
  severity: "MEDIUM",
  priority: "MEDIUM",
};

export function CreateBugDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);

    const stepsToReproduce = values.stepsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (stepsToReproduce.length === 0) {
      setSubmitError("Add at least one step.");
      return;
    }

    const result = await createBugAction({
      projectId,
      title: values.title,
      description: values.description || undefined,
      preconditions: values.preconditions || undefined,
      stepsToReproduce,
      expectedResult: values.expectedResult || undefined,
      actualResult: values.actualResult || undefined,
      severity: values.severity,
      priority: values.priority,
    });

    if (!result.success) {
      setSubmitError(result.error.message);
      return;
    }

    reset(defaultValues);
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset(defaultValues);
          setSubmitError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-3.5 w-3.5" />
          New bug
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report a bug</DialogTitle>
          <DialogDescription>Written manually — starts as Accepted, not a draft.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="bug-title">Title</Label>
            <Input
              id="bug-title"
              placeholder="Date filter includes results outside the selected range"
              aria-invalid={!!errors.title}
              {...register("title", { required: "Title is required", minLength: 3 })}
            />
            {errors.title ? <p className="text-xs text-destructive">{errors.title.message}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="bug-severity">Severity</Label>
              <select
                id="bug-severity"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                {...register("severity")}
              >
                {bugSeverityValues.map((v) => (
                  <option key={v} value={v}>
                    {v.charAt(0) + v.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bug-priority">Priority</Label>
              <select
                id="bug-priority"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                {...register("priority")}
              >
                {bugPriorityValues.map((v) => (
                  <option key={v} value={v}>
                    {v.charAt(0) + v.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bug-preconditions">Preconditions (optional)</Label>
            <Input id="bug-preconditions" {...register("preconditions")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bug-steps">Steps to reproduce (one per line)</Label>
            <Textarea
              id="bug-steps"
              rows={4}
              placeholder={"Open the results list\nSet a date range\nApply the filter"}
              {...register("stepsText")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bug-expected">Expected result</Label>
            <Textarea id="bug-expected" rows={2} {...register("expectedResult")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bug-actual">Actual result</Label>
            <Textarea id="bug-actual" rows={2} {...register("actualResult")} />
          </div>

          {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Add bug
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
