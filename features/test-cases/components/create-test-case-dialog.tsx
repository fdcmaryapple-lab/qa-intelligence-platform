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
import {
  testCaseTypeValues,
  testCasePriorityValues,
} from "@/features/test-cases/schemas/test-case-schemas";
import { createTestCaseAction } from "@/features/test-cases/actions";

type FormValues = {
  title: string;
  description: string;
  preconditions: string;
  stepsText: string;
  expectedResult: string;
  type: (typeof testCaseTypeValues)[number];
  priority: (typeof testCasePriorityValues)[number];
};

const defaultValues: FormValues = {
  title: "",
  description: "",
  preconditions: "",
  stepsText: "",
  expectedResult: "",
  type: "FUNCTIONAL",
  priority: "MEDIUM",
};

export function CreateTestCaseDialog({
  projectId,
  requirementId,
}: {
  projectId: string;
  requirementId?: string;
}) {
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

    const steps = values.stepsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (steps.length === 0) {
      setSubmitError("Add at least one step.");
      return;
    }

    const result = await createTestCaseAction({
      projectId,
      requirementId,
      title: values.title,
      description: values.description || undefined,
      preconditions: values.preconditions || undefined,
      steps,
      expectedResult: values.expectedResult,
      type: values.type,
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
          New test case
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a test case</DialogTitle>
          <DialogDescription>Written manually — starts as Accepted, not a draft.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="tc-title">Title</Label>
            <Input
              id="tc-title"
              placeholder="Rejects checkout with an expired card"
              aria-invalid={!!errors.title}
              {...register("title", { required: "Title is required", minLength: 3 })}
            />
            {errors.title ? <p className="text-xs text-destructive">{errors.title.message}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tc-type">Type</Label>
              <select
                id="tc-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                {...register("type")}
              >
                {testCaseTypeValues.map((v) => (
                  <option key={v} value={v}>
                    {v.charAt(0) + v.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tc-priority">Priority</Label>
              <select
                id="tc-priority"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                {...register("priority")}
              >
                {testCasePriorityValues.map((v) => (
                  <option key={v} value={v}>
                    {v.charAt(0) + v.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tc-preconditions">Preconditions (optional)</Label>
            <Input id="tc-preconditions" {...register("preconditions")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tc-steps">Steps (one per line)</Label>
            <Textarea
              id="tc-steps"
              rows={4}
              placeholder={"Go to checkout\nEnter an expired card\nSubmit the order"}
              {...register("stepsText")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tc-expected">Expected result</Label>
            <Textarea
              id="tc-expected"
              rows={2}
              aria-invalid={!!errors.expectedResult}
              {...register("expectedResult", { required: "Expected result is required" })}
            />
            {errors.expectedResult ? (
              <p className="text-xs text-destructive">{errors.expectedResult.message}</p>
            ) : null}
          </div>

          {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Add test case
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
