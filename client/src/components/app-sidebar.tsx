import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/components/ui/sidebar";
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FolderOpen,
  Shield,
  Lock,
  Navigation,
  FileText,
  ClipboardList,
  Database,
  LogOut,
  Grid3X3,
  X,
} from "lucide-react";

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Carpetas",
    url: "/folders",
    icon: FolderOpen,
  },
  {
    title: "Licitaciones",
    url: "/licitaciones",
    icon: FileText,
  },
];

const adminNavItems = [
  {
    title: "Todos los Archivos",
    url: "/all-files",
    icon: Grid3X3,
  },
  {
    title: "Registro de Auditoría",
    url: "/audit-logs",
    icon: ClipboardList,
  },
  {
    title: "Respaldar",
    url: "/backup",
    icon: Database,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { toggleSidebar } = useSidebar();

  const getInitials = (name: string) => {
    if (!name) return "AZ";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Shield className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm leading-tight">Azal Mechanical</span>
              <span className="text-xs text-muted-foreground">Supports</span>
            </div>
          </div>
          <button
            onClick={() => toggleSidebar()}
            className="md:hidden p-1 hover:bg-sidebar-accent rounded-md text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar navegación"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 text-blue-600 font-bold">
            <Navigation className="h-3 w-3" />
            NAVEGACIÓN PRINCIPAL
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Shield className="h-3 w-3" />
            ADMINISTRACIÓN
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9 border-2 border-blue-100">
            {/* 🚀 Mantenemos la foto */}
            <AvatarImage src={(user as any)?.picture || (user as any)?.photo || (user as any)?.avatarUrl} alt="Foto de perfil" />
            
            {/* 🚀 Actualizamos para que las iniciales también usen tu nombre real */}
            <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
              {getInitials((user as any)?.fullName || (user as any)?.name || (user as any)?.displayName || (user as any)?.username || "AZ")}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-semibold truncate">
              {/* 🚀 Añadimos fullName y name, que es donde seguramente está tu nombre "Oscar Rico" */}
              {(user as any)?.fullName || (user as any)?.name || (user as any)?.displayName || (user as any)?.username || "Usuario"}
            </span>
            <span 
              className="text-[10px] text-muted-foreground truncate" 
              title={(user as any)?.correo || (user as any)?.email || "Sin correo"}
            >
              {(user as any)?.correo || (user as any)?.email || (user as any)?.userPrincipalName || "Sin correo"}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-red-600 border-red-100 hover:bg-red-50"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-4 w-4" />
          {logoutMutation.isPending ? "Saliendo..." : "Cerrar sesión"}
        </Button>

        <div className="mt-4 pt-3 border-t border-sidebar-border text-center">
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-mono">
            <Lock className="h-3 w-3" />
            <span>ISO/IEC 27001 SECURE</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}