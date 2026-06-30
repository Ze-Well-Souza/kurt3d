import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Wallet, Settings, ThumbsUp, Layers, Calculator, Users, UserCheck, LogOut, MessageSquare, BarChart3, Calendar as CalendarIcon, FileVideo } from "lucide-react";
import { toast } from "sonner";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api/auth.functions";

const items = [
  { title: "Painel", url: "/admin", icon: LayoutDashboard },
  { title: "Estoque de Filamentos", url: "/admin/stock", icon: Layers },
  { title: "Calculadora e Pedidos", url: "/admin/portfolio", icon: Calculator },
  { title: "Clientes", url: "/admin/clients", icon: Users },
  { title: "Leads", url: "/admin/leads", icon: MessageSquare },
  { title: "Finanças", url: "/admin/finances", icon: Wallet },
  { title: "Relatórios", url: "/admin/reports", icon: BarChart3 },
  { title: "Calendário", url: "/admin/calendar", icon: CalendarIcon },
  { title: "Vídeos", url: "/admin/videos", icon: FileVideo },
  { title: "Configurações", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const isActive = (url: string) =>
    url === "/admin" ? pathname === "/admin" : pathname.startsWith(url);

  async function handleLogout() {
    await logout();
    toast.success("Sessão encerrada.");
    navigate({ to: "/login" });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="filament-top border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 px-2 py-2">
          <div
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-white"
            style={{
              background:
                "linear-gradient(135deg,#c96f4a,#e0a93b,#8aab6e,#5fa8a3,#8a3a52)",
            }}
          >
            <ThumbsUp className="h-4 w-4" />
          </div>
          <span className="font-display text-sm font-bold tracking-tight group-data-[collapsible=icon]:hidden">
            Kurti 3D
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={active ? "filament-active font-semibold" : ""}
                    >
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground group-data-[collapsible=icon]:justify-center"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Sair</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

