import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProtectedRoute, AdminRoute } from "@/lib/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Lock, Shield } from "lucide-react";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import MyFilesPage from "@/pages/my-files-page";
import SharedFilesPage from "@/pages/shared-files-page";
import AllFilesPage from "@/pages/all-files-page";
import UsersPage from "@/pages/users-page";
import AuditLogsPage from "@/pages/audit-logs-page";
import BackupPage from "@/pages/backup-page";
import FolderPage from "@/pages/folder-page";
import FoldersListPage from "@/pages/folders-list-page";

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>Conexión segura</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground mr-2">
                <Shield className="h-3 w-3" />
                <span>ISO 27001</span>
              </div>
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
      <ProtectedRoute path="/" component={() => (
        <AppLayout>
          <DashboardPage />
        </AppLayout>
      )} />
      <ProtectedRoute path="/folders" component={() => (
        <AppLayout>
          <FoldersListPage />
        </AppLayout>
      )} />
      <ProtectedRoute path="/folders/:id" component={() => (
        <AppLayout>
          <FolderPage />
        </AppLayout>
      )} />

      <ProtectedRoute path="/my-files" component={() => (
        <AppLayout>
          <MyFilesPage />
        </AppLayout>
      )} />
      <ProtectedRoute path="/shared-files" component={() => (
        <AppLayout>
          <SharedFilesPage />
        </AppLayout>
      )} />
      <AdminRoute path="/all-files" component={() => (
        <AppLayout>
          <AllFilesPage />
        </AppLayout>
      )} />
      <AdminRoute path="/users" component={() => (
        <AppLayout>
          <UsersPage />
        </AppLayout>
      )} />
      <AdminRoute path="/audit-logs" component={() => (
        <AppLayout>
          <AuditLogsPage />
        </AppLayout>
      )} />
      <AdminRoute path="/backup" component={() => (
        <AppLayout>
          <BackupPage />
        </AppLayout>
      )} />
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
