"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { navSections, type NavLink } from "@/components/shared/nav-links";
import { Badge } from "@/components/ui/badge";

function useCurrentProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/projects\/([^/]+)/);
  return match?.[1] ?? null;
}

function resolveHref(link: NavLink, projectId: string | null): string {
  if (link.href) return link.href;
  if (!projectId) return "/dashboard/projects";
  return link.projectPath ? `/dashboard/projects/${projectId}/${link.projectPath}` : `/dashboard/projects/${projectId}`;
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const projectId = useCurrentProjectId(pathname);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-5">
        <CheckSquare className="h-5 w-5 text-primary" strokeWidth={2.5} />
        <span className="font-display text-base font-semibold tracking-tight">
          QA Intelligence
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.links.map((link) => {
                const href = resolveHref(link, projectId);
                const isActive =
                  link.projectPath === ""
                    ? pathname === href
                    : href === "/dashboard"
                      ? pathname === href
                      : pathname === href || pathname.startsWith(`${href}/`);
                const Icon = link.icon;
                return (
                  <li key={link.label}>
                    {link.comingSoon ? (
                      <span
                        className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground/60"
                        aria-disabled="true"
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4" />
                          {link.label}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          Soon
                        </Badge>
                      </span>
                    ) : (
                      <Link
                        href={href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {link.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
