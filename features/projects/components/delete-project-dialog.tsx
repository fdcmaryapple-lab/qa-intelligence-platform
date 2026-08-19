"use client";

import * as React from "react";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteProjectAction } from "@/features/projects/actions";

export function DeleteProjectDialog({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);

    const result = await deleteProjectAction({ projectId, confirmName: confirmText });

    setIsDeleting(false);
    if (!result.success) {
      setError(result.error.message);
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h3 className="font-display text-sm font-semibold text-destructive">Danger zone</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Deleting a project permanently removes everything in it — requirements, test cases,
          bugs, API tests, automation scripts, regression runs, screenshots, and chat history.
          This can&apos;t be undone.
        </p>

        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) {
              setConfirmText("");
              setError(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-3.5 w-3.5" />
              Delete project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete &ldquo;{projectName}&rdquo;?</DialogTitle>
              <DialogDescription>
                Type the project name exactly to confirm. This action is permanent.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="confirm-name">Project name</Label>
              <Input
                id="confirm-name"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={projectName}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <DialogFooter>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting || confirmText !== projectName}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Permanently delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
