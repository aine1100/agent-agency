import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardNavbar } from "@/components/layout/dashboard-navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar Container */}
      <div className="hidden border-r border-border lg:block">
        <DashboardSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <DashboardNavbar />

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto bg-background/50 p-6">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
