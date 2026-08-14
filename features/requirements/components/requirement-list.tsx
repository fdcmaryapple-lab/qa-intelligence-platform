import { FileSearch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type RequirementListItem = {
  id: string;
  title: string;
  description: string | null;
  status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "REJECTED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  createdAt: Date;
  createdBy: { name: string | null; email: string };
};

const statusVariant = {
  DRAFT: "secondary",
  IN_REVIEW: "warn",
  APPROVED: "pass",
  REJECTED: "fail",
} as const;

const priorityVariant = {
  LOW: "secondary",
  MEDIUM: "secondary",
  HIGH: "warn",
  CRITICAL: "fail",
} as const;

export function RequirementList({ requirements }: { requirements: RequirementListItem[] }) {
  if (requirements.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <FileSearch className="h-8 w-8 text-muted-foreground" />
          <p className="font-display text-base font-semibold">No requirements yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add the first requirement for this project to start tracking coverage.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {requirements.map((req) => (
        <Card key={req.id}>
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-sm font-semibold">{req.title}</h3>
              <div className="flex shrink-0 gap-1.5">
                <Badge variant={statusVariant[req.status]}>{req.status.replace("_", " ")}</Badge>
                <Badge variant={priorityVariant[req.priority]}>{req.priority}</Badge>
              </div>
            </div>
            {req.description ? (
              <p className="text-sm text-muted-foreground">{req.description}</p>
            ) : null}
            <p className="font-mono text-xs text-muted-foreground">
              {req.createdBy.name ?? req.createdBy.email} ·{" "}
              {new Date(req.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
