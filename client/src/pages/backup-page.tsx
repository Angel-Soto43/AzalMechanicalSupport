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
import { Database, Download, Calendar, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

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

    let url = `/api/backup?range=${encodeURIComponent(range)}`;
    if (range === "custom") {
      if (!customStart || !customEnd) {
        toast({
          title: "Fechas requeridas",
          description: "Selecciona inicio y fin para el rango personalizado.",
          variant: "destructive",
        });
        return;
      }
      url += `&start=${customStart}&end=${customEnd}`;
    }

    setDownloading(true); // 👈 Activamos el botón
    
    try {
      // 1. Esperamos REALMENTE a que el servidor termine de armar el ZIP
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("No se encontraron archivos en este rango o hubo un error.");
      }

      // 2. Convertimos la respuesta en un archivo físico (Blob)
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      // 3. Forzamos la descarga en el navegador
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `Respaldo_${range}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      toast({ title: "Descarga completada", description: "Tu respaldo se ha guardado exitosamente." });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDownloading(false); // 👈 Volvemos el botón a la normalidad
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
              {RANGE_OPTIONS.map((opt) => {
                const isSelected = range === opt.value;
                return (
                  <Button
                    key={opt.value}
                    type="button"
                    // Si está seleccionado, le damos más peso visual
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRange(opt.value)}
                    // 🚀 AQUÍ ESTÁ LA MAGIA: Forzamos tu color azul oscuro si está activo
                    className={`transition-all ${
                      isSelected 
                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md ring-2 ring-blue-300 ring-offset-1" 
                        : "hover:bg-blue-50 text-slate-600 border-slate-300"
                    }`}
                  >
                    {opt.label}
                  </Button>
                );
              })}
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
            className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {downloading ? "Generando respaldo…" : "Descargar respaldo"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
