import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { logout, requireAuth } from "@/lib/api/auth.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Kurti 3D" }] }),
  beforeLoad: async () => {
    const s = await requireAuth();
    if (s.setupRequired || !s.userId) {
      throw redirect({ to: "/login" });
    }
    return { username: s.username ?? "admin" };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const { username } = Route.useRouteContext();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <SidebarInset>
          <header className="filament-top sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="h-4 w-px bg-border" />
            <span className="text-sm font-medium text-muted-foreground">Console do Admin</span>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{username}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await logout();
                  navigate({ to: "/login" });
                }}
              >
                Sair
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
