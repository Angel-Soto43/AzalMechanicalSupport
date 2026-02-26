import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
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
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FolderOpen,
  Grid3X3,
  Users,
  UserCheck,
  ClipboardList,
  LogOut,
  Shield,
  Lock,
  Share2,
  Database,
  Navigation,
} from "lucide-react";

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    adminOnly: false,
  },
  {
    title: "Mis Archivos",
    url: "/my-files",
    icon: FolderOpen,
    adminOnly: false,
  },
  {
    title: "Archivos Compartidos",
    url: "/shared-files",
    icon: Share2,
    adminOnly: false,
  },
  {
    title: "Carpetas",
    url: "/folders",
    icon: FolderOpen,
    adminOnly: false,
  },
];

const adminNavItems = [
  {
    title: "Todos los Archivos",
    url: "/all-files",
    icon: Grid3X3,
    adminOnly: true,
  },
  {
    title: "Gestión de Usuarios",
    url: "/users",
    icon: UserCheck,
    adminOnly: true,
  },
  {
    title: "Registro de Auditoría",
    url: "/audit-logs",
    icon: ClipboardList,
    adminOnly: true,
  },
  {
    title: "Respaldar",
    url: "/backup",
    icon: Database,
    adminOnly: true,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Shield className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-tight">Azal Mechanical</span>
            <span className="text-xs text-muted-foreground">Supports</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Navigation className="h-3 w-3" />
            Navegación
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    tooltip={item.title}
                    className="overflow-hidden"
                  >
                    <Link href={item.url} data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}>
                      <item.icon className="h-5 w-5 shrink-0 text-black" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <Shield className="h-3 w-3" />
              Panel de Administración
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      tooltip={item.title}
                      className="overflow-hidden"
                    >
                      <Link href={item.url} data-testid={`nav-${item.url.replace("/", "")}`}>
                        <item.icon className="h-5 w-5 shrink-0 text-black" />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-muted text-foreground text-sm font-medium">
              {user ? getInitials(user.fullName) : "??"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium truncate" data-testid="text-user-fullname">
              {user?.fullName}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {user?.isAdmin ? (
                <>
                  <Shield className="h-3 w-3" />
                  Administrador
                </>
              ) : (
                "Usuario"
              )}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          {logoutMutation.isPending ? "Cerrando sesión..." : "Cerrar sesión"}
        </Button>

        <div className="mt-4 pt-3 border-t border-sidebar-border">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>ISO/IEC 27001</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
