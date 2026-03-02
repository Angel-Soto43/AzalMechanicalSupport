import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Folder, Plus, MoreVertical, Download, FolderOpen, Trash2, Share2, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import JSZip from "jszip";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PromptDialog } from "@/components/prompt-dialog";
import { ShareDialog } from "@/components/share-dialog";

export default function FoldersListPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [deleteFolderDialog, setDeleteFolderDialog] = useState<{ open: boolean; folder: any }>({ open: false, folder: null });
  const [shareDialog, setShareDialog] = useState<{ open: boolean; folder: any }>({ open: false, folder: null });
  const [renameFolderDialog, setRenameFolderDialog] = useState<{ open: boolean; folder: any }>({ open: false, folder: null });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [renameLoading, setRenameLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/folders/root", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar carpetas");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setFolders(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const createFolderWithName = async (name: string) => {
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, parentId: null }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Error al crear carpeta");
    }
    const listRes = await fetch("/api/folders/root", { credentials: "include" });
    if (listRes.ok) setFolders(await listRes.json());
    queryClient.invalidateQueries({ queryKey: ["/api/folders/root"] });
    toast({ title: "Carpeta creada", description: `"${name}" se creó correctamente` });
  };

  const addFolderToZipRecursive = async (
    zip: JSZip,
    folderId: number,
    folderName: string,
    basePath: string
  ): Promise<number> => {
    const contentRes = await fetch(`/api/folders/${folderId}/content`, {
      credentials: "include",
    });
    if (!contentRes.ok) throw new Error("Error al obtener contenido de la carpeta");
    const content = await contentRes.json();
    const prefix = basePath ? `${basePath}${folderName}/` : `${folderName}/`;
    let count = 0;

    const allFiles = content.files ?? [];
    const latest = allFiles.filter(
      (f: any) => !allFiles.some((o: any) => o.previousVersionId === f.id)
    );
    for (const file of latest) {
      const res = await fetch(`/api/files/${file.id}/download`, { credentials: "include" });
      if (!res.ok) continue;
      const blob = await res.blob();
      zip.file(prefix + file.originalName, blob);
      count++;
    }

    for (const sub of content.folders ?? []) {
      count += await addFolderToZipRecursive(zip, sub.id, sub.name, prefix);
    }
    return count;
  };

  const downloadFolderAsZip = async (targetFolderId: number, folderName: string) => {
    try {
      const zip = new JSZip();
      const count = await addFolderToZipRecursive(zip, targetFolderId, folderName, "");
      if (count === 0) {
        toast({
          title: "Sin archivos",
          description: "La carpeta no tiene archivos para descargar.",
          variant: "destructive",
        });
        return;
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName || "carpeta"}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Descarga completada", description: `Se descargaron ${count} archivo(s) en la estructura de carpetas` });
    } catch (err: any) {
      toast({
        title: "Error al descargar",
        description: err?.message || "Error al descargar carpeta",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFolderConfirm = async () => {
    const folder = deleteFolderDialog.folder;
    if (!folder || !user?.isAdmin) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/folders/${folder.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const listRes = await fetch("/api/folders/root", { credentials: "include" });
      if (listRes.ok) setFolders(await listRes.json());
      toast({ title: "Carpeta eliminada", description: `"${folder.name}" y su contenido se eliminaron` });
    } catch (err: any) {
      toast({
        title: "Error al eliminar",
        description: err?.message || "Error al eliminar carpeta",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRenameFolderConfirm = async (newName: string) => {
    const folder = renameFolderDialog.folder;
    if (!folder || !user?.isAdmin) return;
    setRenameLoading(true);
    try {
      const res = await fetch(`/api/folders/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) throw new Error(await res.text());
      const listRes = await fetch("/api/folders/root", { credentials: "include" });
      if (listRes.ok) setFolders(await listRes.json());
      queryClient.invalidateQueries({ queryKey: ["/api/folders/root"] });
      toast({ title: "Carpeta renombrada", description: `"${folder.name}" se renombró a "${newName}"` });
      setRenameFolderDialog({ open: false, folder: null });
    } catch (err: any) {
      toast({
        title: "Error al renombrar",
        description: err?.message || "Error al renombrar carpeta",
        variant: "destructive",
      });
    } finally {
      setRenameLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return <p className="p-6 text-destructive">{error}</p>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Folder className="h-6 w-6" />
            Carpetas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Selecciona una carpeta para ver su contenido y subir archivos
          </p>
        </div>
        {user?.isAdmin && (
          <Button onClick={() => setNewFolderDialogOpen(true)} className="bg-blue-600 text-white hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Nueva carpeta
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Carpetas disponibles</CardTitle>
          <CardDescription>
            Haz clic en una carpeta para abrirla
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead>Nombre</TableHead>
                  <TableHead>Creado por</TableHead>
                  <TableHead>Fecha y hora</TableHead>
                  <TableHead className="text-right">Tamaño total</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {folders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No hay carpetas. {user?.isAdmin && "Crea una desde el botón superior."}
                    </TableCell>
                  </TableRow>
                ) : (
                  folders.map((folder: any) => (
                    <TableRow
                      key={folder.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setLocation(`/folders/${folder.id}`)}
                    >
                      <TableCell>
                        <Folder className="h-5 w-5 text-yellow-500" />
                      </TableCell>
                      <TableCell className="font-medium">{folder.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {folder.creatorName ?? (folder.userId === user?.id ? "Tú" : "Usuario")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(
                          new Date(folder.createdAt),
                          "dd/MM/yyyy HH:mm",
                          { locale: es }
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        —
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setLocation(`/folders/${folder.id}`)}>
                              <FolderOpen className="mr-2 h-4 w-4" />
                              Abrir
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadFolderAsZip(folder.id, folder.name)}>
                              <Download className="mr-2 h-4 w-4" />
                              Descargar carpeta
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShareDialog({ open: true, folder })}>
                              <Share2 className="mr-2 h-4 w-4" />
                              Compartir
                            </DropdownMenuItem>
                            {user?.isAdmin && (
                              <DropdownMenuItem onClick={() => setRenameFolderDialog({ open: true, folder })}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Renombrar carpeta
                              </DropdownMenuItem>
                            )}
                            {user?.isAdmin && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteFolderDialog({ open: true, folder })}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar carpeta
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PromptDialog
        open={newFolderDialogOpen}
        onOpenChange={setNewFolderDialogOpen}
        title="Nueva carpeta"
        description="Introduce el nombre de la nueva carpeta"
        placeholder="Nombre de la carpeta"
        submitLabel="Crear"
        onSubmit={createFolderWithName}
      />

      <PromptDialog
        open={renameFolderDialog.open}
        onOpenChange={(open) => setRenameFolderDialog({ open, folder: open ? renameFolderDialog.folder : null })}
        title="Renombrar carpeta"
        description="Introduce el nuevo nombre para la carpeta"
        placeholder="Nuevo nombre"
        defaultValue={renameFolderDialog.folder?.name || ""}
        submitLabel="Renombrar"
        onSubmit={handleRenameFolderConfirm}
      />

      <ShareDialog
        open={shareDialog.open}
        onOpenChange={(open) => setShareDialog({ open, folder: open ? shareDialog.folder : null })}
        title={shareDialog.folder?.name || "Carpeta"}
        isFolder={!!shareDialog.folder}
        onDownloadFolder={
          shareDialog.folder
            ? () => {
                downloadFolderAsZip(shareDialog.folder.id, shareDialog.folder.name);
                
                // Log share action
                fetch("/api/share/log", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    type: "folder",
                    resourceType: "folder",
                    resourceId: shareDialog.folder.id,
                    resourceName: shareDialog.folder.name,
                  }),
                }).catch(() => {});
              }
            : undefined
        }
      />

      <ConfirmDialog
        open={deleteFolderDialog.open}
        onOpenChange={(open) => setDeleteFolderDialog({ open, folder: open ? deleteFolderDialog.folder : null })}
        title="Eliminar carpeta"
        description={
          deleteFolderDialog.folder
            ? `¿Eliminar la carpeta "${deleteFolderDialog.folder.name}" y todo su contenido (subcarpetas y archivos)? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleDeleteFolderConfirm}
        loading={deleteLoading}
      />
    </div>
  );
}
