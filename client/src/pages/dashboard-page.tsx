import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Briefcase,
  History,
  Shield,
  Plus,
  Clock,
  Activity,
  ClipboardList,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { AuditLog } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

// Interfaz para tus estadísticas reales
interface DashboardStats {
  totalLicitaciones: number;
  totalLogs: number;
  ultimaActividad: string;
}

interface RecentActivity extends AuditLog {
  userName: string;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  isLoading
}: {
  title: string;
  value: string | number;
  description: string;
  icon: any;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <Icon className="h-5 w-5 text-[#1E40AF]" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ activity }: { activity: RecentActivity }) {
  const getActivityIcon = (action: string) => {
    if (action.includes('Licitación')) return <Briefcase className="h-4 w-4 text-blue-500" />;
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="flex items-start gap-3 py-3 px-2 rounded-lg hover:bg-slate-50 transition-colors duration-200">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
        {getActivityIcon(activity.action)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">Sistema</span>
          {" "}
          <span className="text-muted-foreground">{activity.action}</span>
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {activity.details}
        </p>
      </div>
      <time className="text-xs text-muted-foreground shrink-0">
        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: es })}
      </time>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery<RecentActivity[]>({
    queryKey: ["/api/audit-logs/recent"],
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting()}, {user?.fullName?.split(" ")[0] || "Ingeniero"}
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <Button asChild className="bg-[#1E40AF] text-white hover:bg-[#1e3a8a]">
          <Link href="/licitaciones">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Licitación
          </Link>
        </Button>
      </div>

      {/* Stats - Conectadas al Backend Real */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Licitaciones Activas"
          value={stats?.totalLicitaciones ?? 0}
          description="Proyectos en seguimiento"
          icon={Briefcase}
          isLoading={statsLoading}
        />
        <StatCard
          title="Registro de Auditoría"
          value={stats?.totalLogs ?? 0}
          description="Acciones monitoreadas"
          icon={History}
          isLoading={statsLoading}
        />
        <StatCard
          title="Seguridad del Sistema"
          value="Protegido"
          description="Bypass de autenticación activo"
          icon={Shield}
          isLoading={statsLoading}
        />
      </div>

      {/* Tabla de Actividad Reciente */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[#1E40AF]" />
              Historial de Movimientos
            </CardTitle>
            <CardDescription>Últimas actualizaciones en la base de datos</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/licitaciones">
              Ver Gestión
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : recentActivity && recentActivity.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentActivity.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <Clock className="h-12 w-12 mb-4 opacity-20" />
              <p className="italic">No hay movimientos registrados hoy.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}