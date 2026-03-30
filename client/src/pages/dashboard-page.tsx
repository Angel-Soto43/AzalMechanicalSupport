import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { File as LucideFile, Clock, Upload } from "lucide-react";
import { File } from "@shared/schema";
import { formatFileSize } from "@/components/file-icon";

const STORAGE_QUOTA_BYTES = 5 * 1024 * 1024 * 1024;

function bytesToUsageRatio(bytes: number) {
  return Math.min(100, Math.round((bytes / STORAGE_QUOTA_BYTES) * 100));
}

function StatCard({
  title,
  value,
  description,
  isLoading,
}: {
  title: string;
  value: string | number;
  description: string;
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
    <Card className="border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground">{title}</CardTitle>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
          <Upload className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-semibold text-card-foreground">{value}</div>
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: files, isLoading } = useQuery<File[]>({
    queryKey: ["/api/files"],
  });

  const totalFiles = files?.length ?? 0;
  const totalStorageBytes = files?.reduce((sum, file) => sum + (file.size ?? 0), 0) ?? 0;
  const usedPercent = bytesToUsageRatio(totalStorageBytes);
  const usageDescription = `${formatFileSize(totalStorageBytes)} de ${formatFileSize(STORAGE_QUOTA_BYTES)}`;

  const recentFiles = files
    ? files
        .filter((file) => new Date(file.uploadedAt) >= subDays(new Date(), 7))
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    : [];

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 bg-background min-h-screen text-foreground">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{greeting()}, {user?.fullName?.split(" ")[0] || "Ingeniero"}</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <StatCard
            title="Total de archivos"
            value={isLoading ? "..." : totalFiles}
            description="Cantidad de archivos almacenados"
            isLoading={isLoading}
          />

          <Card className="overflow-hidden border border-border bg-card shadow-sm">
            <CardHeader className="flex items-start justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-base text-card-foreground">Almacenamiento de la cuenta</CardTitle>
                <CardDescription className="text-muted-foreground">Uso actual del espacio disponible</CardDescription>
              </div>
              <div className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-sm font-semibold text-sky-200">
                {usedPercent}%
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center gap-5 py-6">
                <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(from 180deg at 50% 50%, rgba(56,189,248,0.95) 0%, rgba(56,189,248,0.95) ${usedPercent}%, rgba(148,163,184,0.18) ${usedPercent}%, rgba(148,163,184,0.18) 100%)`,
                    }}
                  />
                  <div className="absolute inset-4 rounded-full bg-card flex flex-col items-center justify-center text-center">
                    <span className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Usado</span>
                    <span className="text-2xl font-semibold text-card-foreground">{usedPercent}%</span>
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm text-muted-foreground">{usageDescription}</p>
                  <p className="text-xs text-muted-foreground">Capacidad total: {formatFileSize(STORAGE_QUOTA_BYTES)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <div>
              <CardTitle className="text-card-foreground">Recientes</CardTitle>
              <CardDescription className="text-muted-foreground">Archivos de los últimos 7 días</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((item) => (
                  <Skeleton key={item} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : recentFiles.length > 0 ? (
              <div className="space-y-3">
                {recentFiles.slice(0, 8).map((file) => (
                  <div key={file.id} className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-card/50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-sky-400">
                        <LucideFile className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground truncate">{file.originalName}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(file.uploadedAt), "d 'de' MMMM, HH:mm", { locale: es })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-muted-foreground">{formatFileSize(file.size)}</p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(file.uploadedAt), { addSuffix: true, locale: es })}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-transparent py-16 text-center">
                <Clock className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-foreground">No se encontraron archivos recientes en los últimos 7 días.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
