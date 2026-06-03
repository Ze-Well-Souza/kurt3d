import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Wallet, Images, Settings } from "lucide-react";
import { KurtiLogo } from "@/components/KurtiLogo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Painel", url: "/admin", icon: LayoutDashboard },
  { title: "Finanças", url: "/admin/finances", icon: Wallet },
  { title: "Gerenciar Portfólio", url: "/admin/portfolio", icon: Images },
  { title: "Configurações", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) =>
    url === "/admin" ? pathname === "/admin" : pathname.startsWith(url);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="filament-top border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 px-2 py-2">
          <KurtiLogo className="h-8 w-8 shrink-0" textHidden />
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
    </Sidebar>
  );
}
