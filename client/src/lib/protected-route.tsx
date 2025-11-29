import { useAuth } from "@/hooks/use-auth";
import { Loader2, Shield } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Shield className="h-12 w-12 text-primary animate-pulse" />
              <Loader2 className="h-6 w-6 animate-spin text-primary absolute -bottom-1 -right-1" />
            </div>
            <p className="text-muted-foreground text-sm">Verificando sesión...</p>
          </div>
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}

export function AdminRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Shield className="h-12 w-12 text-primary animate-pulse" />
              <Loader2 className="h-6 w-6 animate-spin text-primary absolute -bottom-1 -right-1" />
            </div>
            <p className="text-muted-foreground text-sm">Verificando permisos...</p>
          </div>
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  if (!user.isAdmin) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
