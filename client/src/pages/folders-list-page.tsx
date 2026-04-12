import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { Folder, Plus, MoreVertical, FolderOpen, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PromptDialog } from "@/components/prompt-dialog";

export default function FoldersListPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [deleteFolderDialog, setDeleteFolderDialog] = useState<{ open: boolean; folder: any }>({ open: false, folder: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Obtener carpetas locales y de Microsoft
  const { data: localFolders, isLoading: localLoading } = useQuery({ queryKey: ["/api/folders"] });
  const { data: microsoftFolders, isLoading: microsoftLoading } = useQuery({ queryKey: ["/api/microsoft-folders"] });

  const isDataLoading = localLoading || microsoftLoading;
  const folders = [
    ...(localFolders || []).map(f => ({ ...f, source: 'local' })),
    ...(microsoftFolders || []).map(f => ({ ...f, source: 'microsoft' }))
  ];

  const createFolderWithName = async (name: string) => {
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Error en el servidor");
      
      await queryClient.invalidateQueries({ queryKey: ["/api/microsoft-folders"] });
      toast({ title: "Carpeta creada", description: `"${name}" ya está en tu OneDrive.` });
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
      await queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/microsoft-folders"] });
      toast({ title: "Eliminada", description: "Carpeta borrada." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeleteLoading(false);
      setDeleteFolderDialog({ open: false, folder: null });
    }
  };

  if (isDataLoading) return <div className="p-10"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-slate-900 dark:text-slate-100">
            <Folder className="h-8 w-8 text-blue-600" />
            Gestión de Archivos
          </h1>
          <p className="text-slate-500 font-medium italic">Administra tus carpetas de OneDrive</p>
        </div>

        <Button onClick={() => setNewFolderDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 shadow-lg text-white">
          <Plus className="mr-2 h-5 w-5" /> Nueva carpeta
        </Button>
      </div>

      <Card className="border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden rounded-xl">
        <CardHeader className="bg-slate-50/80 dark:bg-slate-800/40 border-b py-4 px-6">
          <CardTitle className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Directorios Raíz</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 dark:bg-slate-800/30">
                <TableHead className="w-[70px]"></TableHead>
                <TableHead className="font-bold text-slate-700">Nombre</TableHead>
                <TableHead className="font-bold text-slate-700 text-center">Origen</TableHead>
                <TableHead className="font-bold text-slate-700 text-center">Fecha</TableHead>
                <TableHead className="w-[120px] text-right pr-8">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {folders.map((folder: any) => (
                <TableRow 
                  key={folder.id} 
                  className="group cursor-pointer hover:bg-blue-50/40" 
                  onClick={() => setLocation(`/folders/${folder.id}`)}
                >
                  <TableCell className="py-5 pl-6"><Folder className="h-6 w-6 text-amber-400 fill-amber-400/20" /></TableCell>
                  <TableCell className="font-bold text-slate-700">{folder.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={folder.source === 'microsoft' ? 'secondary' : 'default'}>
                      {folder.source === 'microsoft' ? 'OneDrive' : 'Local'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm text-slate-500">
                    {format(new Date(folder.createdAt), "dd/MM/yyyy", { locale: es })}
                  </TableCell>
                  <TableCell className="text-right pr-8" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setLocation(`/folders/${folder.id}`)}>
                          <FolderOpen className="mr-3 h-4 w-4" /> Abrir
                        </DropdownMenuItem>
                        {folder.source === 'local' && (
                          <DropdownMenuItem className="text-red-600" onClick={() => setDeleteFolderDialog({ open: true, folder })}>
                            <Trash2 className="mr-3 h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
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