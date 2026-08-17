import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DesktopSidebar } from "@/components/shared/sidebar";
import { TopNav } from "@/components/shared/topnav";

export const dynamic = "force-dynamic";

/**
 * The actual authentication boundary for the whole dashboard.
 *
 * Deliberately a Server Component session check, not middleware/proxy-based
 * route protection — Next.js middleware-only auth has a documented bypass
 * (CVE-2025-29927, header spoofing), so relying on it as the sole gate is
 * unsafe. Checking the session here, directly in the render path of every
 * dashboard page, has no equivalent bypass.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

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
