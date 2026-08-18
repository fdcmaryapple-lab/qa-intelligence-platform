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
import { createAutomationScriptAction } from "@/features/automation/actions";

type FormValues = {
  title: string;
  code: string;
};

const defaultValues: FormValues = { title: "", code: "" };

export function CreateAutomationScriptDialog({ projectId }: { projectId: string }) {
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

    const result = await createAutomationScriptAction({
      projectId,
      title: values.title,
      code: values.code,
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
          New script
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add an automation script</DialogTitle>
          <DialogDescription>
            Written manually — checked for TypeScript syntax errors and starts as Accepted, not a
            draft.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="script-title">Title</Label>
            <Input
              id="script-title"
              placeholder="Login with valid credentials"
              aria-invalid={!!errors.title}
              {...register("title", { required: "Title is required" })}
            />
            {errors.title ? (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="script-code">Code</Label>
            <Textarea
              id="script-code"
              rows={12}
              className="font-mono text-xs"
              placeholder={"import { test, expect } from '@playwright/test';\n\ntest('...', async ({ page }) => {\n  // ...\n});"}
              aria-invalid={!!errors.code}
              {...register("code", { required: "Code is required" })}
            />
            {errors.code ? (
              <p className="text-xs text-destructive">{errors.code.message}</p>
            ) : null}
          </div>

          {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save script
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
