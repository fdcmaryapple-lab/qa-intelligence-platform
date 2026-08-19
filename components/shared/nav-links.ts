import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderKanban,
  FileSearch,
  ListChecks,
  Bug,
  Globe,
  ImageIcon,
  RefreshCw,
  Bot,
  PlayCircle,
  Gauge,
  BarChart3,
  MessageSquareText,
  Settings,
  Users,
  ScrollText,
} from "lucide-react";

export interface NavLink {
  label: string;
  icon: LucideIcon;
  /** Global route, independent of any project — used only by the Workspace section. */
  href?: string;
  /**
   * Sub-path under /dashboard/projects/[projectId]/... for project-scoped
   * modules — which is nearly everything, since almost every feature in
   * this app belongs to a specific project, not to the account globally.
   * An empty string means the project's own detail page (Requirements
   * live there directly, not on a separate route).
   */
  projectPath?: string;
  /** Modules not yet implemented render as disabled with a "Soon" badge,
   * regardless of whether a project is currently in context. */
  comingSoon?: boolean;
}

export interface NavSection {
  title: string;
  links: NavLink[];
}

// Project-scoped links resolve dynamically in SidebarNav based on the
// current route's [projectId] — when no project is in context, they
// send you to the project list to pick one, rather than going dead.
// Automation Runs is the one genuinely deferred module (Phase 7
// deliberately never built server-side script execution) and keeps its
// "Soon" badge regardless of context.
export const navSections: NavSection[] = [
  {
    title: "Workspace",
    links: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
    ],
  },
  {
    title: "Quality Engineering",
    links: [
      { label: "Requirements", projectPath: "", icon: FileSearch },
      { label: "Test Cases", projectPath: "test-cases", icon: ListChecks },
      { label: "Bug Reports", projectPath: "bugs", icon: Bug },
      { label: "API Testing", projectPath: "api-testing", icon: Globe },
      { label: "Screenshot Diff", projectPath: "screenshot-diff", icon: ImageIcon },
      { label: "Regression", projectPath: "regression", icon: RefreshCw },
    ],
  },
  {
    title: "Automation",
    links: [
      { label: "Automation Generator", projectPath: "automation", icon: Bot },
      {
        label: "Automation Runs",
        projectPath: "automation/runs",
        icon: PlayCircle,
        comingSoon: true,
      },
    ],
  },
  {
    title: "Insights",
    links: [
      { label: "Risk Prediction", projectPath: "risk", icon: Gauge },
      { label: "QA Reports", projectPath: "reports", icon: BarChart3 },
      { label: "AI Assistant", projectPath: "ai-assistant", icon: MessageSquareText },
    ],
  },
  {
    title: "Administration",
    links: [
      { label: "Settings", projectPath: "settings", icon: Settings },
      { label: "Members", projectPath: "members", icon: Users },
      { label: "Audit Logs", projectPath: "audit-logs", icon: ScrollText },
    ],
  },
];
