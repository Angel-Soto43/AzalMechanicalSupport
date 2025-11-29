import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  ClipboardList,
  Filter,
  Calendar,
  X,
  LogIn,
  LogOut,
  Upload,
  Download,
  Trash2,
  UserPlus,
  UserCog,
  Shield,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { AuditLog, User } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AuditLogWithUser extends AuditLog {
  userName: string;
}

function getActionIcon(action: string) {
  switch (action) {
    case "login":
      return <LogIn className="h-4 w-4 text-green-500" />;
    case "login_failed":
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case "logout":
      return <LogOut className="h-4 w-4 text-muted-foreground" />;
    case "upload":
      return <Upload className="h-4 w-4 text-blue-500" />;
    case "download":
      return <Download className="h-4 w-4 text-purple-500" />;
    case "delete":
      return <Trash2 className="h-4 w-4 text-red-500" />;
    case "user_created":
      return <UserPlus className="h-4 w-4 text-green-500" />;
    case "user_updated":
      return <UserCog className="h-4 w-4 text-orange-500" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
}

function getActionLabel(action: string) {
  switch (action) {
    case "login":
      return "Inicio de sesión";
    case "login_failed":
      return "Intento fallido";
    case "logout":
      return "Cierre de sesión";
    case "upload":
      return "Subida de archivo";
    case "download":
      return "Descarga de archivo";
    case "delete":
      return "Eliminación de archivo";
    case "user_created":
      return "Usuario creado";
    case "user_updated":
      return "Usuario actualizado";
    default:
      return action;
  }
}

function getActionBadgeVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  switch (action) {
    case "login":
    case "user_created":
      return "default";
    case "login_failed":
    case "delete":
      return "destructive";
    case "upload":
    case "download":
      return "secondary";
    default:
      return "outline";
  }
}

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: logs, isLoading } = useQuery<AuditLogWithUser[]>({
    queryKey: ["/api/audit-logs"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const actionOptions = [
    { value: "login", label: "Inicio de sesión" },
    { value: "login_failed", label: "Intento fallido" },
    { value: "logout", label: "Cierre de sesión" },
    { value: "upload", label: "Subida de archivo" },
    { value: "download", label: "Descarga de archivo" },
    { value: "delete", label: "Eliminación" },
    { value: "user_created", label: "Usuario creado" },
    { value: "user_updated", label: "Usuario actualizado" },
  ];

  const filteredLogs = logs?.filter((log) => {
    let matches = true;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matches =
        matches &&
        (log.userName?.toLowerCase().includes(query) ||
          log.details?.toLowerCase().includes(query) ||
          log.ipAddress?.toLowerCase().includes(query));
    }

    if (filterAction && filterAction !== "all") {
      matches = matches && log.action === filterAction;
    }

    if (filterDate) {
      const logDate = format(new Date(log.createdAt), "yyyy-MM-dd");
      matches = matches && logDate === filterDate;
    }

    return matches;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setFilterAction("all");
    setFilterDate("");
  };

  const hasActiveFilters = searchQuery || (filterAction && filterAction !== "all") || filterDate;

  // Stats
  const todayLogs = logs?.filter((log) => {
    const today = new Date();
    const logDate = new Date(log.createdAt);
    return (
      logDate.getDate() === today.getDate() &&
      logDate.getMonth() === today.getMonth() &&
      logDate.getFullYear() === today.getFullYear()
    );
  });

  const failedLogins = logs?.filter((log) => log.action === "login_failed").length ?? 0;
  const successLogins = logs?.filter((log) => log.action === "login").length ?? 0;
  const fileOperations = logs?.filter((log) => ["upload", "download", "delete"].includes(log.action)).length ?? 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Registro de Auditoría
          </h1>
          <p className="text-muted-foreground">
            Historial completo de acciones del sistema (ISO 27001)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en registros..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-logs"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="default" className="ml-2">
                Activos
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayLogs?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Eventos hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <LogIn className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{successLogins}</p>
                <p className="text-xs text-muted-foreground">Inicios exitosos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{failedLogins}</p>
                <p className="text-xs text-muted-foreground">Intentos fallidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fileOperations}</p>
                <p className="text-xs text-muted-foreground">Op. de archivos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="filter-action" className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  Tipo de Acción
                </Label>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger id="filter-action" className="w-48" data-testid="select-filter-action">
                    <SelectValue placeholder="Todas las acciones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las acciones</SelectItem>
                    {actionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filter-date" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Fecha
                </Label>
                <Input
                  id="filter-date"
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-48"
                  data-testid="input-filter-date"
                />
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Actividad</CardTitle>
          <CardDescription>
            {filteredLogs?.length ?? 0} registro{(filteredLogs?.length ?? 0) !== 1 ? "s" : ""} encontrado{(filteredLogs?.length ?? 0) !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Detalles</TableHead>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          {getActionIcon(log.action)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {getActionLabel(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{log.userName || "Sistema"}</span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                          {log.details || "-"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(log.createdAt), "dd/MM/yyyy", { locale: es })}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {format(new Date(log.createdAt), "HH:mm:ss", { locale: es })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.ipAddress || "-"}
                        </code>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <ClipboardList className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">
                {hasActiveFilters ? "No se encontraron registros" : "No hay registros"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Intenta ajustar los filtros de búsqueda"
                  : "El registro de auditoría está vacío"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Limpiar filtros
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Cumplimiento ISO/IEC 27001</p>
              <p className="text-xs text-muted-foreground mt-1">
                Todos los registros de auditoría se almacenan de forma segura y cumplen con los requisitos
                de trazabilidad establecidos por las normas ISO/IEC 27001 e ISO/IEC 27002 para la gestión
                de la seguridad de la información.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
