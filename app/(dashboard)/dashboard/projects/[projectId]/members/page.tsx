import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as projectService from "@/server/services/project-service";
import * as memberService from "@/server/services/project-member-service";
import { requireProjectAccess } from "@/server/auth/access-control";
import { MemberList } from "@/features/members/components/member-list";
import { AddMemberDialog } from "@/features/members/components/add-member-dialog";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

export const metadata: Metadata = { title: "Members — QA Intelligence Platform" };

export default async function MembersPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const userId = await getCurrentUserId();

  let project;
  let membership;
  let members;
  try {
    membership = await requireProjectAccess(userId, projectId, "VIEWER");
    project = await projectService.getProject(userId, projectId);
    members = await memberService.listMembers(userId, projectId);
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
          <p className="text-sm text-muted-foreground">You don&apos;t have access to this project.</p>
        </div>
      );
    }
    throw error;
  }

  if (!project) {
    notFound();
  }

  const canManage = membership.role === "ADMIN" || membership.role === "OWNER";

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/projects/${projectId}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {project.name}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-semibold tracking-tight">Members</h2>
          <Badge variant="secondary">{members.length}</Badge>
        </div>
        {canManage ? <AddMemberDialog projectId={projectId} /> : null}
      </div>

      <MemberList projectId={projectId} members={members} canManage={canManage} />
    </div>
  );
}
