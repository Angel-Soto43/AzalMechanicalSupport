import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, FileText, Folder, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// Agrega useQuery a tus imports de tanstack
import { useMutation, useQuery } from "@tanstack/react-query";
// Importa queryClient para las peticiones
import { queryClient } from "@/lib/queryClient";

const EMPRESAS = [
  { id: 1, nombre: "Empresa de Ingeniería A", rfc: "EIA010101ABC" },
  { id: 2, nombre: "Suministros Electromecánicos B", rfc: "SEB020202DEF" },
  { id: 3, nombre: "Mantenimiento Industrial C", rfc: "MIC030303GHI" },
  { id: 4, nombre: "Servicios Azal D", rfc: "SAD040404JKL" },
  { id: 5, nombre: "Construcciones Mecánicas E", rfc: "CME050505MNO" },
  { id: 6, nombre: "Logística y Soporte F", rfc: "LSF060606PQR" },
];


export default function TendersPage() {
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(EMPRESAS[0]);

  // --- NUEVO: Traer carpetas reales del backend ---
  const { data: folders = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/folders"], // Este endpoint debe estar en tu backend
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b p-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-[#1E40AF] rounded-lg flex items-center justify-center text-white">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 uppercase">
                {empresaSeleccionada.nombre}
              </h1>
              <p className="text-sm text-slate-500 font-mono">{empresaSeleccionada.rfc}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">Cambiar Empresa:</span>
            <Select
              onValueChange={(val) => setEmpresaSeleccionada(EMPRESAS.find(e => e.id === Number(val))!)}
              defaultValue="1"
            >
              <SelectTrigger className="w-[250px] border-[#1E40AF]/20">
                <SelectValue placeholder="Seleccionar empresa" />
              </SelectTrigger>
              <SelectContent>
                {EMPRESAS.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex justify-end gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-[#1E40AF] hover:bg-[#1e3a8a] text-white shadow-md">
                <Plus className="mr-2 h-4 w-4" /> Nueva Licitación
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-[8px]">
              <DialogHeader>
                <DialogTitle className="text-[#1E40AF] flex items-center gap-2 border-b pb-2">
                  <FileText size={20} /> Registrar Nueva Licitación
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">¿En qué empresa desea guardar?</label>
                  <Select defaultValue={empresaSeleccionada.id.toString()}>
                    <SelectTrigger className="border-slate-200">
                      <SelectValue placeholder="Seleccionar empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPRESAS.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Folio Interno</label>
                  <Input placeholder="Ej: AZAL-2026-001" className="rounded-lg" />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Título del Proyecto</label>
                  <Input placeholder="Nombre de la licitación" className="rounded-lg" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Presupuesto Base</label>
                    <Input type="number" placeholder="0.00" className="rounded-lg" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Fecha Límite</label>
                    <Input type="date" className="rounded-lg" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <Button variant="outline" className="rounded-lg">Cancelar</Button>
                <Button className="bg-[#1E40AF] text-white rounded-lg px-6 hover:bg-[#1e3a8a]">
                  Confirmar Registro
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

            <Card className="rounded-[8px] border-slate-200 shadow-xl">
              <CardHeader>
                <CardTitle className="text-md flex items-center gap-2 uppercase text-slate-500 tracking-wider">
                  <Folder size={18} /> Explorador de Documentos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-full bg-slate-100 animate-pulse rounded" />
                    <div className="h-4 w-3/4 bg-slate-100 animate-pulse rounded" />
                  </div>
                ) : folders.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">
                    No se encontraron carpetas vinculadas.
                  </p>
                ) : (
                  folders.map((folder: any) => (
                    <div key={folder.id} className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <ChevronRight size={14} className="text-slate-400" />
                        <Folder size={16} className="text-blue-500 fill-blue-500/20" />
                        {folder.name}
                      </div>
                      {/* Aquí renderizamos los archivos si existen en la DB */}
                      <div className="ml-6 space-y-1">
                        {folder.files?.map((file: any, j: number) => (
                          <div key={j} className="flex items-center gap-2 text-xs text-slate-500 p-1 rounded hover:bg-blue-50 transition-colors cursor-pointer">
                            <FileText size={14} className="text-slate-400" />
                            {file.name || "Archivo sin nombre"}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>


          <Card className="rounded-[8px] border-slate-200 shadow-xl">
            <CardHeader>
              <CardTitle className="text-md flex items-center gap-2 uppercase text-slate-500 tracking-wider">
                <Folder size={18} /> Explorador de Documentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

                {isLoading ? (
                  <p className="text-xs text-slate-400 animate-pulse">Cargando carpetas reales...</p>
                ) : folders.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay carpetas en la DB.</p>
                ) : (
                  // CAMBIAMOS mockFolders por folders
                  folders.map((folder: any, i: number) => (
                    <div key={folder.id || i} className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <ChevronRight size={14} className="text-slate-400" />
                        <Folder size={16} className="text-blue-500 fill-blue-500/20" />
                        {folder.name}
                      </div>
                      <div className="ml-6 space-y-1">
                        {folder.files?.map((file: any, j: number) => (
                          <div key={j} className="flex items-center gap-2 text-xs text-slate-500">
                            <FileText size={14} className="text-slate-400" />
                            {file.name || file}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}