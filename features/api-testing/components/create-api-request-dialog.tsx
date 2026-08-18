"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Loader2, Plus, X } from "lucide-react";
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
  httpMethodValues,
  apiBodyTypeValues,
  assertionTypeValues,
} from "@/features/api-testing/schemas/api-request-schemas";
import { createApiRequestAction } from "@/features/api-testing/actions";

type FormValues = {
  name: string;
  method: (typeof httpMethodValues)[number];
  url: string;
  headers: { key: string; value: string }[];
  queryParams: { key: string; value: string }[];
  bodyType: (typeof apiBodyTypeValues)[number];
  body: string;
  assertions: { type: (typeof assertionTypeValues)[number]; jsonPath: string; expected: string }[];
};

const defaultValues: FormValues = {
  name: "",
  method: "GET",
  url: "",
  headers: [],
  queryParams: [],
  bodyType: "NONE",
  body: "",
  assertions: [],
};

export function CreateApiRequestDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues });

  const headerFields = useFieldArray({ control, name: "headers" });
  const queryParamFields = useFieldArray({ control, name: "queryParams" });
  const assertionFields = useFieldArray({ control, name: "assertions" });

  const bodyType = watch("bodyType");

  async function onSubmit(values: FormValues) {
    setSubmitError(null);

    const result = await createApiRequestAction({
      projectId,
      name: values.name,
      method: values.method,
      url: values.url,
      headers: values.headers.filter((h) => h.key),
      queryParams: values.queryParams.filter((q) => q.key),
      bodyType: values.bodyType,
      body: values.bodyType === "NONE" ? undefined : values.body || undefined,
      assertions: values.assertions.filter((a) => a.expected),
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
          New request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New API request</DialogTitle>
          <DialogDescription>
            Sent from the server, so it can reach any API regardless of CORS — including your
            own local/internal ones.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="req-name">Name</Label>
            <Input
              id="req-name"
              placeholder="Get user profile"
              aria-invalid={!!errors.name}
              {...register("name", { required: "Name is required" })}
            />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="flex gap-2">
            <select
              className="h-10 w-28 shrink-0 rounded-md border border-input bg-background px-2 text-sm shadow-sm"
              {...register("method")}
            >
              {httpMethodValues.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <Input
              placeholder="https://api.example.com/users/1"
              aria-invalid={!!errors.url}
              {...register("url", { required: "URL is required" })}
            />
          </div>
          {errors.url ? <p className="text-xs text-destructive">{errors.url.message}</p> : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Headers</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => headerFields.append({ key: "", value: "" })}
              >
                <Plus className="h-3 w-3" /> Add header
              </Button>
            </div>
            {headerFields.fields.map((field, i) => (
              <div key={field.id} className="flex gap-2">
                <Input placeholder="Key" {...register(`headers.${i}.key` as const)} />
                <Input placeholder="Value" {...register(`headers.${i}.value` as const)} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => headerFields.remove(i)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Query parameters</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => queryParamFields.append({ key: "", value: "" })}
              >
                <Plus className="h-3 w-3" /> Add param
              </Button>
            </div>
            {queryParamFields.fields.map((field, i) => (
              <div key={field.id} className="flex gap-2">
                <Input placeholder="Key" {...register(`queryParams.${i}.key` as const)} />
                <Input placeholder="Value" {...register(`queryParams.${i}.value` as const)} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => queryParamFields.remove(i)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="req-body-type">Body</Label>
            <select
              id="req-body-type"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              {...register("bodyType")}
            >
              {apiBodyTypeValues.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {bodyType !== "NONE" ? (
              <Textarea
                rows={4}
                placeholder={bodyType === "JSON" ? '{\n  "key": "value"\n}' : "key1=value1&key2=value2"}
                {...register("body")}
              />
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Assertions (optional)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  assertionFields.append({ type: "STATUS_EQUALS", jsonPath: "", expected: "" })
                }
              >
                <Plus className="h-3 w-3" /> Add assertion
              </Button>
            </div>
            {assertionFields.fields.map((field, i) => {
              const assertionType = watch(`assertions.${i}.type`);
              return (
                <div key={field.id} className="flex gap-2">
                  <select
                    className="h-10 w-40 shrink-0 rounded-md border border-input bg-background px-2 text-xs shadow-sm"
                    {...register(`assertions.${i}.type` as const)}
                  >
                    <option value="STATUS_EQUALS">Status equals</option>
                    <option value="BODY_CONTAINS">Body contains</option>
                    <option value="JSON_PATH_EQUALS">JSON path equals</option>
                  </select>
                  {assertionType === "JSON_PATH_EQUALS" ? (
                    <Input
                      placeholder="data.id"
                      {...register(`assertions.${i}.jsonPath` as const)}
                    />
                  ) : null}
                  <Input
                    placeholder={assertionType === "STATUS_EQUALS" ? "200" : "expected value"}
                    {...register(`assertions.${i}.expected` as const)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => assertionFields.remove(i)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>

          {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
