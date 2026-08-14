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
  href: string;
  icon: LucideIcon;
  /** Modules not yet implemented render as disabled with a "Soon" badge. */
  comingSoon?: boolean;
}

export interface NavSection {
  title: string;
  links: NavLink[];
}

// Mirrors the platform's 17 product modules. Only Dashboard is a live
// route in Phase 1 — the rest are listed now so the navigation shape
// (and the "what's coming" story) is visible from day one.
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
      { label: "Requirements", href: "/dashboard/requirements", icon: FileSearch, comingSoon: true },
      { label: "Test Cases", href: "/dashboard/test-cases", icon: ListChecks, comingSoon: true },
      { label: "Bug Reports", href: "/dashboard/bugs", icon: Bug, comingSoon: true },
      { label: "API Testing", href: "/dashboard/api-testing", icon: Globe, comingSoon: true },
      { label: "Screenshot Diff", href: "/dashboard/screenshots", icon: ImageIcon, comingSoon: true },
      { label: "Regression", href: "/dashboard/regression", icon: RefreshCw, comingSoon: true },
    ],
  },
  {
    title: "Automation",
    links: [
      { label: "Automation Generator", href: "/dashboard/automation/generate", icon: Bot, comingSoon: true },
      { label: "Automation Runs", href: "/dashboard/automation/runs", icon: PlayCircle, comingSoon: true },
    ],
  },
  {
    title: "Insights",
    links: [
      { label: "Risk Prediction", href: "/dashboard/risk", icon: Gauge, comingSoon: true },
      { label: "QA Reports", href: "/dashboard/reports", icon: BarChart3, comingSoon: true },
      { label: "AI Assistant", href: "/dashboard/assistant", icon: MessageSquareText, comingSoon: true },
    ],
  },
  {
    title: "Administration",
    links: [
      { label: "Settings", href: "/dashboard/settings", icon: Settings, comingSoon: true },
      { label: "Users", href: "/dashboard/users", icon: Users, comingSoon: true },
      { label: "Audit Logs", href: "/dashboard/audit-logs", icon: ScrollText, comingSoon: true },
    ],
  },
];
