import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, FileText, Folder, ChevronRight, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const EMPRESAS = [
  { id: 1, nombre: "Empresa de Ingeniería A", rfc: "EIA010101ABC" },
  { id: 2, nombre: "Suministros Electromecánicos B", rfc: "SEB020202DEF" },
  { id: 3, nombre: "Mantenimiento Industrial C", rfc: "MIC030303GHI" },
  { id: 4, nombre: "Servicios Azal D", rfc: "SAD040404JKL" },
  { id: 5, nombre: "Construcciones Mecánicas E", rfc: "CME050505MNO" },
  { id: 6, nombre: "Logística y Soporte F", rfc: "LSF060606PQR" },
];

export default function TendersPage() {
  const { toast } = useToast();
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(EMPRESAS[0]);

  const [folio, setFolio] = useState("");
  const [titulo, setTitulo] = useState("");
  const [presupuesto, setPresupuesto] = useState("");
  const [fecha, setFecha] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);


  const { data: folders = [], isLoading: loadingFolders } = useQuery<any[]>({
    queryKey: ["/api/folders"],
  });

  const { data: listaLicitaciones = [], isLoading: loadingTenders } = useQuery<any[]>({
    queryKey: ["/api/licitaciones"],
  });

  const mutation = useMutation({
    mutationFn: async (nuevaLicitacion: any) => {
      const res = await fetch("/api/licitaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevaLicitacion),
      });
      if (!res.ok) throw new Error("Error en el servidor");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/licitaciones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] }); // Para que el dashboard se entere
      toast({ title: "Registro Exitoso", description: "La licitación ha sido guardada." });
      setIsModalOpen(false);
      setFolio(""); setTitulo(""); setPresupuesto(""); setFecha("");
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  });

  const handleConfirmar = () => {
    mutation.mutate({
      titulo: titulo,
      numeroLicitacion: folio,
      cliente: empresaSeleccionada.nombre,
      presupuesto: Number(presupuesto) || 0,
      fechaCierre: fecha,
      estado: "abierta"
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b p-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-[#1E40AF] rounded-lg flex items-center justify-center text-white shadow-lg">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 uppercase">{empresaSeleccionada.nombre}</h1>
              <p className="text-sm text-slate-500 font-mono">{empresaSeleccionada.rfc}</p>
            </div>
          </div>
          <Select onValueChange={(v) => setEmpresaSeleccionada(EMPRESAS.find(e => e.id === Number(v))!)} defaultValue="1">
            <SelectTrigger className="w-[250px] border-[#1E40AF]/20"><SelectValue /></SelectTrigger>
            <SelectContent>{EMPRESAS.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.nombre}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex justify-end">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1E40AF] hover:bg-[#1e3a8a] text-white shadow-md">
                <Plus className="mr-2 h-4 w-4" /> Nueva Licitación
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader><DialogTitle className="text-[#1E40AF] border-b pb-4">Registrar Nueva Licitación</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <Input label="Folio" value={folio} onChange={e => setFolio(e.target.value)} placeholder="AZAL-2026-XXX" />
                <Input label="Proyecto" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Nombre del proyecto" />
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" label="Presupuesto" value={presupuesto} onChange={e => setPresupuesto(e.target.value)} />
                  <Input type="date" label="Fecha" value={fecha} onChange={e => setFecha(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleConfirmar} disabled={mutation.isPending} className="bg-[#1E40AF] text-white">
                  {mutation.isPending ? "Guardando..." : "Confirmar Registro"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* EXPLORADOR - COLUMNA 1 */}
          <Card className="rounded-xl border-slate-200 shadow-sm lg:col-span-1">
            <CardHeader className="bg-slate-50 border-b p-4">
              <CardTitle className="text-[10px] font-bold uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <Folder size={14} /> Explorador de Archivos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {loadingFolders ? <Skeleton className="h-20 w-full" /> : folders.length === 0 ? <p className="text-xs text-slate-400 italic text-center">No hay carpetas.</p> :
                folders.map(f => (
                  <div key={f.id} className="flex items-center gap-2 text-sm text-slate-700 p-2 hover:bg-slate-100 rounded-md">
                    <Folder size={16} className="text-blue-500 fill-blue-500/10" /> {f.name}
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* TABLA REAL - COLUMNAS 2, 3 Y 4 */}
          <Card className="lg:col-span-3 rounded-xl border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-white">
              <CardTitle className="text-sm font-bold text-slate-600 uppercase">Gestión de Licitaciones</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-slate-50/50">
                  <TableHead className="text-xs">Folio</TableHead>
                  <TableHead className="text-xs">Proyecto</TableHead>
                  <TableHead className="text-xs text-right">Presupuesto</TableHead>
                  <TableHead className="text-xs">Estado</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {loadingTenders ? <TableRow><TableCell colSpan={4} className="text-center py-10">Cargando...</TableCell></TableRow> :
                    listaLicitaciones.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-400">Sin registros.</TableCell></TableRow> :
                    listaLicitaciones.map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono text-xs font-bold text-blue-600">{l.numeroLicitacion}</TableCell>
                        <TableCell className="text-sm font-medium">{l.titulo}</TableCell>
                        <TableCell className="text-right text-sm">${Number(l.presupuesto).toLocaleString()}</TableCell>
                        <TableCell><Badge className="bg-green-100 text-green-700 border-none text-[10px]">{l.estado}</Badge></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}