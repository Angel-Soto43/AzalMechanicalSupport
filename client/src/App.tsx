import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Lock } from "lucide-react";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import UsersPage from "@/pages/users-page";
import AuditLogsPage from "@/pages/audit-logs-page";
import FolderPage from "@/pages/folder-page";
import FoldersListPage from "@/pages/folders-list-page";
import TendersPage from "@/pages/TendersPage";
import AllFilesPage from "@/pages/all-files-page";
//import { ProtectedRoute } from "./lib/protected-route";

function AppLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-40 flex h-14 items-center justify-blur px-4 flex h-14 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>Conexión segura (Bypass Activo)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    // Mientras le pregunta al backend, mostramos una pantalla de carga
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Verificando seguridad...</div>;
  }

  if (!user) {
    // Si el backend dice "No lo conozco", lo pateamos al Login
    setLocation("/auth");
    return null;
  }

  // Si tiene sesión, lo dejamos pasar a la pantalla que pidió
  return <>{children}</>;
}


function Router() {
  return (
    <Switch>
      {/* 🟢 Esta es pública, no lleva candado */}
      <Route path="/auth" component={AuthPage} />

      {/* 🔴 A partir de aquí, todo lleva candado */}
      <Route path="/">
        <ProtectedRoute>
          <AppLayout>
            <DashboardPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/licitaciones">
        <ProtectedRoute>
          <AppLayout>
            <TendersPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/all-files">
        <ProtectedRoute>
          <AppLayout>
            <AllFilesPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/folders">
        <ProtectedRoute>
          <AppLayout>
            <FoldersListPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/folders/:id">
        <ProtectedRoute>
          <AppLayout>
            <FolderPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/audit-logs">
        <ProtectedRoute>
          <AppLayout>
            <AuditLogsPage />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="azal-ui-theme">
        <TooltipProvider>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;