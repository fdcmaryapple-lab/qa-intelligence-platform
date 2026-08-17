"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { Loader2, Bug as BugIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { generateBugReportAction } from "@/features/bugs/actions";

export function GenerateBugReportDialog({
  testCaseId,
  testCaseTitle,
}: {
  testCaseId: string;
  testCaseTitle: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ actualBehaviorDescription: string }>({
    defaultValues: { actualBehaviorDescription: "" },
  });

  async function onSubmit(values: { actualBehaviorDescription: string }) {
    setSubmitError(null);

    const result = await generateBugReportAction({
      testCaseId,
      actualBehaviorDescription: values.actualBehaviorDescription,
    });

    if (!result.success) {
      setSubmitError(result.error.message);
      return;
    }

    reset();
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
          setSubmitError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BugIcon className="h-3.5 w-3.5" />
          Report bug
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report a bug from &ldquo;{testCaseTitle}&rdquo;</DialogTitle>
          <DialogDescription>
            Describe what actually happened — AI drafts the rest (steps, severity, priority)
            from the test case&apos;s expected behavior and your description.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="actual-behavior">What actually happened?</Label>
            <Textarea
              id="actual-behavior"
              rows={4}
              placeholder="e.g. The filter applied but results outside the selected range still appeared in the list."
              aria-invalid={!!errors.actualBehaviorDescription}
              {...register("actualBehaviorDescription", {
                required: "Describe what actually happened",
                minLength: { value: 10, message: "Add a bit more detail" },
              })}
            />
            {errors.actualBehaviorDescription ? (
              <p className="text-xs text-destructive">
                {errors.actualBehaviorDescription.message}
              </p>
            ) : null}
          </div>

          {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Generate bug report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
