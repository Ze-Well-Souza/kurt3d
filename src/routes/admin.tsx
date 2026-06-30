import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { requireAuth } from "@/lib/api/auth.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Kurti 3D" }] }),
  beforeLoad: async () => {
    const auth = await requireAuth();
    if (auth.setupRequired) throw redirect({ to: "/login" });
    if (!auth.userId) throw redirect({ to: "/login" });
    return auth;
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <SidebarInset className="min-w-0">
          <header className="filament-top sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="h-4 w-px bg-border" />
            <span className="text-sm font-medium text-muted-foreground">Console do Admin</span>
          </header>
          <main className="min-w-0 flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
