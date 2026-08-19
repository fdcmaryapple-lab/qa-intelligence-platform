"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { projectRoleValues } from "@/features/members/schemas/member-schemas";
import { updateMemberRoleAction, removeMemberAction } from "@/features/members/actions";

type Role = (typeof projectRoleValues)[number];

type MemberItem = {
  id: string;
  role: Role;
  user: { id: string; name: string | null; email: string };
};

const roleBadgeVariant: Record<Role, "secondary" | "pass" | "warn" | "fail"> = {
  VIEWER: "secondary",
  EDITOR: "secondary",
  ADMIN: "warn",
  OWNER: "pass",
};

function MemberRow({
  projectId,
  member,
  canManage,
}: {
  projectId: string;
  member: MemberItem;
  canManage: boolean;
}) {
  const [role, setRole] = React.useState<Role>(member.role);
  const [saving, setSaving] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleRoleChange(next: Role) {
    const previous = role;
    setRole(next);
    setSaving(true);
    setError(null);

    const result = await updateMemberRoleAction({ projectId, memberId: member.id, role: next });

    setSaving(false);
    if (!result.success) {
      setRole(previous);
      setError(result.error.message);
    }
  }

  async function handleRemove() {
    if (!confirm(`Remove ${member.user.email} from this project?`)) return;

    setRemoving(true);
    setError(null);

    const result = await removeMemberAction({ projectId, memberId: member.id });

    setRemoving(false);
    if (!result.success) {
      setError(result.error.message);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t py-3 first:border-t-0">
      <div>
        <p className="text-sm font-medium">{member.user.name ?? member.user.email}</p>
        <p className="text-xs text-muted-foreground">{member.user.email}</p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>

      <div className="flex items-center gap-2">
        {canManage ? (
          <select
            value={role}
            onChange={(e) => handleRoleChange(e.target.value as Role)}
            disabled={saving}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm"
          >
            {projectRoleValues.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <Badge variant={roleBadgeVariant[role]}>{role}</Badge>
        )}
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
        {canManage ? (
          <Button size="icon" variant="ghost" onClick={handleRemove} disabled={removing}>
            {removing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function MemberList({
  projectId,
  members,
  canManage,
}: {
  projectId: string;
  members: MemberItem[];
  canManage: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        {members.map((m) => (
          <MemberRow key={m.id} projectId={projectId} member={m} canManage={canManage} />
        ))}
      </CardContent>
    </Card>
  );
}
