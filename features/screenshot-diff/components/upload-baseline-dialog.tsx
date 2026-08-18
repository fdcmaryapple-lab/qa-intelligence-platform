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
import { createBaselineAction } from "@/features/screenshot-diff/actions";

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

export function UploadBaselineDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ name: string; file: FileList }>();

  async function onSubmit(values: { name: string; file: FileList }) {
    setSubmitError(null);

    const file = values.file?.[0];
    if (!file) {
      setSubmitError("Choose a PNG image.");
      return;
    }
    if (file.type !== "image/png") {
      setSubmitError("Only PNG images are supported.");
      return;
    }

    setIsSubmitting(true);
    const imageBase64 = await readFileAsBase64(file);

    const result = await createBaselineAction({ projectId, name: values.name, imageBase64 });
    setIsSubmitting(false);

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
          <Plus className="h-3.5 w-3.5" />
          New baseline
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a baseline screenshot</DialogTitle>
          <DialogDescription>
            PNG only. Future uploads get pixel-diffed against this reference image.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="baseline-name">Name</Label>
            <Input
              id="baseline-name"
              placeholder="Login page — desktop"
              aria-invalid={!!errors.name}
              {...register("name", { required: "Name is required" })}
            />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseline-file">Image</Label>
            <input
              id="baseline-file"
              type="file"
              accept="image/png"
              className="block w-full text-sm"
              {...register("file", { required: "An image is required" })}
            />
          </div>

          {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
