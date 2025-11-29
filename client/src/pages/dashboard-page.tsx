import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { 
  FileText, 
  Upload, 
  Download, 
  Users, 
  Clock, 
  HardDrive,
  TrendingUp,
  Shield,
  FolderOpen,
  Plus,
  ArrowRight,
  Activity,
  ClipboardList
} from "lucide-react";
import { File, AuditLog, User } from "@shared/schema";
import { FileIcon, formatFileSize, getFileTypeName } from "@/components/file-icon";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface DashboardStats {
  totalFiles: number;
  totalSize: number;
  recentUploads: number;
  activeUsers: number;
}

interface RecentFile extends File {
  uploaderName: string;
}

interface RecentActivity extends AuditLog {
  userName: string;
}

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  isLoading 
}: { 
  title: string; 
  value: string | number; 
  description: string; 
  icon: any;
  trend?: string;
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              <TrendingUp className="h-3 w-3 mr-1" />
              {trend}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RecentFileCard({ file }: { file: RecentFile }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover-elevate">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        <FileIcon mimeType={file.mimeType} className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" data-testid={`text-filename-${file.id}`}>
          {file.originalName}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{file.contractId}</span>
          <span>•</span>
          <span>{formatFileSize(file.size)}</span>
        </div>
      </div>
      <div className="text-right">
        <Badge variant="outline" className="text-xs">
          {getFileTypeName(file.mimeType)}
        </Badge>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(file.uploadedAt), { addSuffix: true, locale: es })}
        </p>
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: RecentActivity }) {
  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'upload':
        return <Upload className="h-4 w-4 text-green-500" />;
      case 'download':
        return <Download className="h-4 w-4 text-blue-500" />;
      case 'login':
        return <Shield className="h-4 w-4 text-primary" />;
      case 'delete':
        return <FileText className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityText = (action: string) => {
    switch (action) {
      case 'upload':
        return 'subió un archivo';
      case 'download':
        return 'descargó un archivo';
      case 'login':
        return 'inició sesión';
      case 'logout':
        return 'cerró sesión';
      case 'delete':
        return 'eliminó un archivo';
      default:
        return action;
    }
  };

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        {getActivityIcon(activity.action)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{activity.userName}</span>
          {" "}
          <span className="text-muted-foreground">{getActivityText(activity.action)}</span>
        </p>
        {activity.details && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {activity.details}
          </p>
        )}
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

  const { data: recentFiles, isLoading: filesLoading } = useQuery<RecentFile[]>({
    queryKey: ["/api/files/recent"],
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
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-greeting">
            {greeting()}, {user?.fullName.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/my-files" data-testid="link-my-files">
              <FolderOpen className="mr-2 h-4 w-4" />
              Mis Archivos
            </Link>
          </Button>
          <Button asChild>
            <Link href="/my-files" data-testid="link-upload-file">
              <Plus className="mr-2 h-4 w-4" />
              Subir Archivo
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Archivos"
          value={stats?.totalFiles ?? 0}
          description="Documentos almacenados"
          icon={FileText}
          isLoading={statsLoading}
        />
        <StatCard
          title="Almacenamiento"
          value={stats ? formatFileSize(stats.totalSize) : "0 KB"}
          description="Espacio utilizado"
          icon={HardDrive}
          isLoading={statsLoading}
        />
        <StatCard
          title="Subidas Recientes"
          value={stats?.recentUploads ?? 0}
          description="Últimos 7 días"
          icon={Upload}
          isLoading={statsLoading}
        />
        {user?.isAdmin && (
          <StatCard
            title="Usuarios Activos"
            value={stats?.activeUsers ?? 0}
            description="Cuentas habilitadas"
            icon={Users}
            isLoading={statsLoading}
          />
        )}
        {!user?.isAdmin && (
          <StatCard
            title="Última Actividad"
            value={user?.lastLogin ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true, locale: es }) : "N/A"}
            description="Tu último acceso"
            icon={Clock}
            isLoading={statsLoading}
          />
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Files */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Archivos Recientes</CardTitle>
              <CardDescription>Últimos documentos subidos al sistema</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/my-files" data-testid="link-view-all-files">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {filesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : recentFiles && recentFiles.length > 0 ? (
              <div className="space-y-1">
                {recentFiles.slice(0, 5).map((file) => (
                  <RecentFileCard key={file.id} file={file} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">No hay archivos</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Comienza subiendo tu primer documento
                </p>
                <Button asChild>
                  <Link href="/my-files">
                    <Plus className="mr-2 h-4 w-4" />
                    Subir Archivo
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimas acciones en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity && recentActivity.length > 0 ? (
              <div className="divide-y">
                {recentActivity.slice(0, 6).map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No hay actividad reciente
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions for Admin */}
      {user?.isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Panel de Administración</CardTitle>
            <CardDescription>Acciones rápidas de administrador</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button variant="outline" className="h-auto py-4 justify-start" asChild>
                <Link href="/users">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Gestionar Usuarios</p>
                      <p className="text-xs text-muted-foreground">Crear y administrar cuentas</p>
                    </div>
                  </div>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 justify-start" asChild>
                <Link href="/all-files">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Todos los Archivos</p>
                      <p className="text-xs text-muted-foreground">Ver documentos del sistema</p>
                    </div>
                  </div>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 justify-start" asChild>
                <Link href="/audit-logs">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <ClipboardList className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Registro de Auditoría</p>
                      <p className="text-xs text-muted-foreground">Historial de actividades</p>
                    </div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
