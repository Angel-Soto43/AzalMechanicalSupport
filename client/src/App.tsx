import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
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

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />

      <Route path="/">
        <AppLayout>
          <DashboardPage />
        </AppLayout>
      </Route>

      <Route path="/licitaciones">
        <AppLayout>
          <TendersPage />
        </AppLayout>
      </Route>


      <Route path="/all-files">
        <AppLayout>
          <AllFilesPage />
        </AppLayout>
      </Route>

      <Route path="/folders">
        <AppLayout>
          <FoldersListPage />
        </AppLayout>
      </Route>

      <Route path="/folders/:id">
        <AppLayout>
          <FolderPage />
        </AppLayout>
      </Route>

      <Route path="/audit-logs">
        <AppLayout>
          <AuditLogsPage />
        </AppLayout>
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