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
  ClipboardList,
  Filter,
  Calendar,
  X,
  LogIn,
  LogOut,
  Upload,
  Download,
  Trash2,
  Shield,
  AlertTriangle,
  Activity,
  Eye,
  RefreshCw,
  FolderX,
  Archive,
  Share2,
  Mail,
} from "lucide-react";
import { AuditLog } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";


interface AuditLogWithEmail extends AuditLog {
  correo: string;
}

const ACTION_CONFIG: Record<string, { icon: (props: any) => JSX.Element; label: string; badgeClass: string }> = {
  login: {
    icon: (props) => <LogIn {...props} className="h-4 w-4" />,
    label: "Inicio de sesión",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  login_failed: {
    icon: (props) => <AlertTriangle {...props} className="h-4 w-4" />,
    label: "Intento fallido",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  upload: {
    icon: (props) => <Upload {...props} className="h-4 w-4" />,
    label: "Subida de archivo",
    badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },

};

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] || {
    icon: (props: any) => <Activity {...props} className="h-4 w-4" />,
    label: action,
    badgeClass: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };
}

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: logs, isLoading } = useQuery<AuditLogWithEmail[]>({
    queryKey: ["/api/audit-logs"],
  });

  const filteredLogs = logs?.filter((log) => {
    let matches: boolean = true;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matches = matches && (
        (log.correo && log.correo.toLowerCase().includes(query)) ||
        (log.details?.toLowerCase().includes(query) ?? false)
      );
    }
    if (filterAction !== "all") matches = matches && log.action === filterAction;
    if (filterDate) {
      const logDate = format(new Date(log.createdAt), "yyyy-MM-dd");
      matches = matches && logDate === filterDate;
    }
    return matches;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-blue-600" />
            Registro de Auditoría
          </h1>
          <p className="text-muted-foreground">Historial detallado de trazabilidad (ISO 27001)</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por correo o acción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" /> Filtros
          </Button>
        </div>
      </div>

      {/* Tabla de Auditoría */}
      <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-900/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Trazabilidad del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : (
            <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/30 border-b dark:border-slate-700">
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-200">Acción</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-200">Correo del Usuario</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-200">Detalles del Evento</TableHead>
                    <TableHead className="text-right text-slate-700 dark:text-slate-200">Fecha / Hora</TableHead>

                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs?.map((log) => {
                    const config = getActionConfig(log.action);
                    return (
                      <TableRow key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-b dark:border-slate-700">
                        <TableCell>
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {config.icon({})}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={config.badgeClass} variant="secondary">
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>

                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                            <Mail className="h-3 w-3 text-blue-500" />
                            {log.correo || "sistema@azal.com"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-[250px] truncate">
                            {log.details || "N/A"}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-xs font-mono text-slate-700 dark:text-slate-300">
                            <p>{format(new Date(log.createdAt), "dd/MM/yyyy", { locale: es })}</p>
                            <p className="text-slate-500 dark:text-slate-400">{format(new Date(log.createdAt), "HH:mm:ss")}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>


      <Card className="border-blue-100 bg-blue-50/50">
        <CardContent className="p-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-blue-600" />
          <p className="text-xs text-blue-800">
            <strong>Cumplimiento ISO 27001:</strong> Los registros de auditoría son inmutables y no almacenan direcciones IP dinámicas para garantizar la privacidad según la normativa vigente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}