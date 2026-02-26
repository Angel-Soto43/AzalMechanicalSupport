import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, Download, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const RANGE_OPTIONS = [
  { value: "week", label: "Semana actual" },
  { value: "month", label: "Mes actual" },
  { value: "year", label: "Año específico (actual)" },
  { value: "lastYear", label: "Año anterior" },
  { value: "custom", label: "Rango personalizado" },
];

export default function BackupPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [range, setRange] = useState<string>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!user?.isAdmin) return;
    setDownloading(true);
    try {
      let url = `/api/backup?range=${encodeURIComponent(range)}`;
      if (range === "custom") {
        if (!customStart || !customEnd) {
          toast({
            title: "Rango requerido",
            description: "Indica la fecha de inicio y fin para el rango personalizado",
            variant: "destructive",
          });
          setDownloading(false);
          return;
        }
        url += `&start=${encodeURIComponent(customStart)}&end=${encodeURIComponent(customEnd)}`;
      }

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error al generar respaldo");
      }
      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `backup-${range}-${new Date().toISOString().slice(0, 10)}.zip`;

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Respaldo generado",
        description: "El archivo ZIP se ha descargado correctamente",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Error al generar respaldo",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="p-6">
        <p className="text-destructive">No tienes permisos para acceder a esta sección.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6" />
          Respaldos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Genera respaldos del sistema en formato ZIP según el rango de fechas seleccionado
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generar respaldo</CardTitle>
          <CardDescription>
            Selecciona el período a respaldar y descarga un archivo ZIP con la estructura de archivos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Período</Label>
            <div className="flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={range === opt.value ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setRange(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {range === "custom" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="backup-start">Fecha inicio</Label>
                <Input
                  id="backup-start"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="backup-end">Fecha fin</Label>
                <Input
                  id="backup-end"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </div>
          )}

          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Download className="mr-2 h-4 w-4" />
            {downloading ? "Generando…" : "Descargar respaldo"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
