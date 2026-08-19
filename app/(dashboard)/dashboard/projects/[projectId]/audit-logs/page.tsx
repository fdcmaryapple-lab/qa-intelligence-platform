import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as projectService from "@/server/services/project-service";
import * as auditLogService from "@/server/services/audit-log-service";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

export const metadata: Metadata = { title: "Audit Logs — QA Intelligence Platform" };

export default async function AuditLogsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const userId = await getCurrentUserId();

  let project;
  let logs;
  try {
    project = await projectService.getProject(userId, projectId);
    logs = await auditLogService.listAuditLogs(userId, projectId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    if (error instanceof ForbiddenError) {
      return (
        <div className="space-y-4">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
          <p className="text-sm text-muted-foreground">
            You need the ADMIN role or higher to view the audit log.
          </p>
        </div>
      );
    }
    throw error;
  }

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/projects/${projectId}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {project.name}
      </Link>

      <div className="flex items-center gap-2">
        <h2 className="font-display text-xl font-semibold tracking-tight">Audit Logs</h2>
        <Badge variant="secondary">{logs.length}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        The last {logs.length} recorded actions on this project.
      </p>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <ScrollText className="h-8 w-8 text-muted-foreground" />
            <p className="font-display text-base font-semibold">Nothing recorded yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            {logs.map((log) => (
              <div key={log.id} className="border-t py-2.5 text-sm first:border-t-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs">{log.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {log.actor ? (log.actor.name ?? log.actor.email) : "Unknown actor"} · {log.targetType}
                </p>
                {log.metadata ? (
                  <details className="mt-1 text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Details</summary>
                    <pre className="mt-1 overflow-auto rounded bg-muted/30 p-2 font-mono">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
