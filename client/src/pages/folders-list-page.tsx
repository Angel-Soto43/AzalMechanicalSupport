import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Folder, Plus, MoreVertical, FolderOpen, Trash2, AlertCircle, RefreshCw, Upload } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PromptDialog } from "@/components/prompt-dialog";

export default function FoldersListPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [deleteFolderDialog, setDeleteFolderDialog] = useState<{ open: boolean; folder: any }>({ open: false, folder: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/folders?t=${Date.now()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Error de comunicación con el servidor");
      const data = await res.json();
      setFolders(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      setError("No se pudo sincronizar la vista.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  const createFolderWithName = async (name: string) => {
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Error al crear la carpeta");
      await fetchFolders();
      toast({ title: "¡Éxito!", description: `Carpeta "${name}" creada.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Error al subir archivo");
      toast({ title: "Archivo subido", description: `${file.name} se guardó correctamente.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteFolderConfirm = async () => {
    const folder = deleteFolderDialog.folder;
    if (!folder) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/folders/${folder.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("No se pudo eliminar");
      await fetchFolders();
      toast({ title: "Eliminada", description: "Carpeta borrada." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeleteLoading(false);
      setDeleteFolderDialog({ open: false, folder: null });
    }
  };

  if (loading) return <div className="p-10"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">
<div className="flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-900 dark:text-slate-100">
                <Folder className="h-8 w-8 text-blue-600" />
                Gestión de Archivos
              </h1>
              <p className="text-slate-500 font-medium italic">Organiza y sube tus documentos aquí</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
            {/* BOTÓN DE SUBIR ARCHIVO DIRECTO */}
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="border-blue-200 hover:bg-blue-50 text-blue-700"
            >
              <Upload className="mr-2 h-4 w-4" /> Subir Archivo
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleUploadFile} />
            </Button>

            {/* BOTÓN DE NUEVA CARPETA */}
            <Button onClick={() => setNewFolderDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 shadow-lg border-none text-white">
              <Plus className="mr-2 h-5 w-5" /> Nueva carpeta
            </Button>
          </div>
          </div>
      </div>

      <Card className="border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden rounded-xl">
        <CardHeader className="bg-slate-50/80 dark:bg-slate-800/40 border-b dark:border-slate-700 py-4 px-6">
          <CardTitle className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Directorios Raíz</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 dark:bg-slate-800/30 border-b dark:border-slate-700">
                <TableHead className="w-[70px]"></TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-200 py-4">Nombre</TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-200 text-center">Fecha de Creación</TableHead>
                <TableHead className="w-[120px] text-right pr-8 text-slate-700 dark:text-slate-200">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {folders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4 text-slate-400 dark:text-slate-500">
                      <FolderOpen className="h-16 w-16 opacity-20" />
                      <p className="text-slate-400 dark:text-slate-500 italic text-sm">No hay carpetas. Crea una o sube un archivo directo.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                folders.map((folder: any) => (
                  <TableRow key={folder.id} className="group cursor-pointer hover:bg-blue-50/40 dark:hover:bg-slate-800/30 border-b dark:border-slate-700" onClick={() => setLocation(`/folders/${folder.id}`)}>
                    <TableCell className="py-5 pl-6"><Folder className="h-6 w-6 text-amber-400 fill-amber-400/20" /></TableCell>
                    <TableCell className="font-bold text-slate-700 dark:text-slate-200">{folder.name}</TableCell>
                    <TableCell className="text-center text-sm text-slate-500 dark:text-slate-400">
                      {format(new Date(folder.createdAt), "dd 'de' MMMM, yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right pr-8" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setLocation(`/folders/${folder.id}`)}><FolderOpen className="mr-3 h-4 w-4" /> Abrir</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => setDeleteFolderDialog({ open: true, folder })}><Trash2 className="mr-3 h-4 w-4" /> Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PromptDialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen} title="Nombre de la carpeta" onSubmit={createFolderWithName} />
      <ConfirmDialog
        open={deleteFolderDialog.open}
        onOpenChange={(open) => setDeleteFolderDialog({ open, folder: open ? deleteFolderDialog.folder : null })}
        title="¿Eliminar?"
        onConfirm={handleDeleteFolderConfirm}
        loading={deleteLoading}
      />
    </div>
  );
}