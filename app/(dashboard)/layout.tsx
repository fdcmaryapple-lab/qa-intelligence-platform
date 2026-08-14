import { DesktopSidebar } from "@/components/shared/sidebar";
import { TopNav } from "@/components/shared/topnav";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <DesktopSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav title="Dashboard" />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
