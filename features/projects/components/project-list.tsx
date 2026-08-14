import Link from "next/link";
import { FolderKanban, FileSearch, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProjectListItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count: { requirements: number; members: number };
};

export function ProjectList({ projects }: { projects: ProjectListItem[] }) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <FolderKanban className="h-8 w-8 text-muted-foreground" />
          <p className="font-display text-base font-semibold">No projects yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Create your first project to start tracking requirements and test cases.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle className="truncate">{project.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
                {project.description || "No description"}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileSearch className="h-3.5 w-3.5" />
                  {project._count.requirements} requirement{project._count.requirements === 1 ? "" : "s"}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {project._count.members} member{project._count.members === 1 ? "" : "s"}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
