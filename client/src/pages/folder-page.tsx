import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useRoute, useLocation } from "wouter";
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
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { queryClient } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Folder,
  MoreVertical,
  Download,
  Upload,
  Trash2,
  Plus,
  Eye,
  RefreshCw,
  Share2,
  X,
  Edit2,
} from "lucide-react";
import { FileIcon, formatFileSize, getFileTypeName } from "@/components/file-icon";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { PromptDialog } from "@/components/prompt-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ShareDialog } from "@/components/share-dialog";

export default function FolderPage() {
  const { toast } = useToast();
  const [, params] = useRoute("/folders/:id");
  const [, setLocation] = useLocation();
  const rawFolderId = params?.id;
  
  // 🧠 DETECCIÓN AUTOMÁTICA
  const isMicrosoftId = Number.isNaN(Number(rawFolderId));
  const folderId = Number(rawFolderId); // Solo útil si no es Microsoft
  
  const { user } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [deleteFileDialog, setDeleteFileDialog] = useState<{ open: boolean; file: any }>({ open: false, file: null });
  const [deleteFolderDialog, setDeleteFolderDialog] = useState<{ open: boolean; folder: any }>({ open: false, folder: null });
  const [shareDialog, setShareDialog] = useState<{ open: boolean; file?: any; folder?: any }>({ open: false });
  const [replaceFileTarget, setReplaceFileTarget] = useState<any | null>(null);
  const replaceFileTargetRef = useRef<any>(null);
  const [renameFolderDialog, setRenameFolderDialog] = useState<{ open: boolean; folder: any }>({ open: false, folder: null });
  const [renameLoading, setRenameLoading] = useState(false);

  /* upload */
  const [contractId, setContractId] = useState("");
  const [client, setClient] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  /* ---------------- load ---------------- */

  const loadFolder = async () => {
    setLoading(true);
    setError(null);
    try {
      // 🧠 Detección automática de la ruta correcta para la API
      const endpoint = isMicrosoftId 
        ? `/api/microsoft-folders/${rawFolderId}/content`
        : `/api/folders/${rawFolderId}/content`;

      const res = await fetch(endpoint, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error al cargar carpeta");
      setData(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (rawFolderId) loadFolder();
  }, [rawFolderId]);

  /* ---------------- create folder ---------------- */

  const createFolderWithName = async (name: string) => {
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name,
        parentId: rawFolderId,
      }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Error al crear carpeta" }));
      throw new Error(errorData.error || "Error al crear carpeta");
    }
    await loadFolder();
    queryClient.invalidateQueries({ queryKey: ["/api/folders/root"] });
    toast({ title: "Carpeta creada", description: `"${name}" se creó correctamente` });
  };

  /* ---------------- upload files ---------------- */

  const addFilesToSelection = (files: FileList | null) => {
    if (!files?.length) return;
    setSelectedFiles((prev) => [...prev, ...Array.from(files)]);
    setUploadSuccess(false);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadSelectedFiles = async () => {
    if (!selectedFiles.length) return;
    if (!contractId || !client) {
      toast({
        title: "Datos requeridos",
        description: "Completa ID de contrato y cliente antes de subir",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadSuccess(false);
    try {
      for (const file of selectedFiles) {
        const form = new FormData();
        // ⚠️ CLAVE: Los campos de texto DEBEN ir ANTES del archivo para que el servidor los lea
        form.append("contractId", contractId);
        form.append("supplier", client);
        form.append("folderId", String(rawFolderId)); 
        form.append("parentId", String(rawFolderId)); // Lo mandamos doble por seguridad
        
        // El archivo siempre se empaqueta al final
        form.append("file", file); 

        const res = await fetch("/api/files/upload", {
          method: "POST",
          credentials: "include",
          body: form,
        });
        if (!res.ok) {
          const contentType = res.headers.get("Content-Type") || "";
          const text = await res.text();
          if (contentType.includes("application/json")) {
            try {
              const body = JSON.parse(text);
              throw new Error(body.error || text || "Error al subir el archivo");
            } catch {
              throw new Error(text || "Error al subir el archivo");
            }
          }
          throw new Error(text || "Error al subir el archivo");
        }
      }
      setSelectedFiles([]);
      setContractId("");
      setClient("");
      loadFolder();
      queryClient.invalidateQueries({ queryKey: ["/api/files/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/files-all"] });
      setUploadSuccess(true);
      toast({ title: "Archivos subidos", description: "Los archivos se subieron en esta subcarpeta" });
    } catch (err: any) {
      toast({
        title: "Error al subir",
        description: err?.message || "Error al subir el archivo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  /* ---------------- replace file (admin only) ---------------- */

  const handleReplaceFile = async (file: File | null) => {
    if (!replaceFileTarget || !file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`/api/files/${replaceFileTarget.id}/version`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      loadFolder();
      queryClient.invalidateQueries({ queryKey: ["/api/files/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/files/shared"] });
      setReplaceFileTarget(null);
      toast({ title: "Archivo reemplazado", description: "Se subió la nueva versión correctamente" });
    } catch (err: any) {
      toast({
        title: "Error al reemplazar",
        description: (err as Error)?.message || "Error",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  /* ---------------- delete file (admin only) ---------------- */

  const handleDeleteFileConfirm = async () => {
    const file = deleteFileDialog.file;
    if (!file || !user?.isAdmin) return;
    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      loadFolder();
      queryClient.invalidateQueries({ queryKey: ["/api/files/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/files-all"] });
      setDeleteFileDialog({ open: false, file: null });
      toast({ title: "Archivo eliminado", description: `"${file.originalName}" fue eliminado` });
    } catch (err: any) {
      toast({
        title: "Error al eliminar",
        description: (err as Error)?.message || "Error",
        variant: "destructive",
      });
    }
  };

  /* ---------------- delete folder (admin only) ---------------- */

  const handleDeleteFolderConfirm = async () => {
  const folder = deleteFolderDialog.folder;
  if (!folder || !user?.isAdmin) return;
  try {
    // 🚀 El backend ahora ya sabe borrar en OneDrive si recibe un ID de texto
    const res = await fetch(`/api/folders/${folder.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Error al eliminar");
    }
    
    setDeleteFolderDialog({ open: false, folder: null });
    queryClient.invalidateQueries({ queryKey: ["/api/folders/root"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    toast({ title: "Carpeta eliminada", description: `"${folder.name}" fue eliminada` });
    
    // Si borramos la carpeta donde estamos parados, volvemos atrás
    if (data && folder.id === data.folder.id) {
      setLocation("/folders");
    } else {
      await loadFolder();
    }
  } catch (err: any) {
    toast({
      title: "Error al eliminar",
      description: err.message,
      variant: "destructive",
    });
  }
};
  

  /* ---------------- rename folder (admin only) ---------------- */

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
      
      setRenameFolderDialog({ open: false, folder: null });
      await loadFolder();
      queryClient.invalidateQueries({ queryKey: ["/api/folders/root"] });
      toast({ title: "Carpeta renombrada", description: `"${folder.name}" se renombró a "${newName}"` });
    } catch (err: any) {
      toast({
        title: "Error al renombrar",
        description: (err as Error)?.message || "Error al renombrar carpeta",
        variant: "destructive",
      });
    } finally {
      setRenameLoading(false);
    }
  };

  const downloadFolderAsZip = async (targetFolder: any) => {
    try {
      const res = await fetch(`/api/folders/${targetFolder.id}/download`, {
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "No se pudo descargar la carpeta");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${targetFolder.name || "carpeta"}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast({
        title: "Descarga iniciada",
        description: `Se descargará la carpeta "${targetFolder.name}" como ZIP.`,
      });
    } catch (err: any) {
      toast({
        title: "Error al descargar",
        description: (err as Error)?.message || "Error",
        variant: "destructive",
      });
    }
  };

  /* ---------------- derived ---------------- */

  const filteredFolders = data?.folders.filter((f: any) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const latestFiles = (data?.files ?? []).filter(
    (file: any) =>
      !(data?.files ?? []).some(
        (other: any) => other.previousVersionId === file.id
      )
  );

  const filteredFiles = latestFiles.filter((f: any) =>
    f.originalName.toLowerCase().includes(search.toLowerCase())
  );

  const folderSizes = useMemo(() => {
    const map = new Map<number, number>();
    if (!data) return map;

    data.files.forEach((file: any) => {
      if (!file.folderId || file.isDeleted) return;
      map.set(
        file.folderId,
        (map.get(file.folderId) ?? 0) + (file.size ?? 0)
      );
    });

    return map;
  }, [data]);

  /* ---------------- states ---------------- */

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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Folder className="h-6 w-6" />
            {data.folder.name}
          </h1>

          <p className="text-sm text-muted-foreground mt-1">
            {data.path.map((p: any, i: number) => (
              <span key={p.id}>
                <Link href={`/folders/${p.id}`} className="hover:underline">
                  {p.name}
                </Link>
                {i < data.path.length - 1 && " / "}
              </span>
            ))}
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 border border-gray-300"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user?.isAdmin && (
                <DropdownMenuItem onClick={() => setNewFolderDialogOpen(true)}>
                  <Folder className="mr-2 h-4 w-4" />
                  Nueva carpeta
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Subir archivo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>

      {/* Subfolders */}
      <Card>
        <CardHeader>
          <CardTitle>Subcarpetas</CardTitle>
          <CardDescription>Carpetas dentro de "{data.folder.name}"</CardDescription>
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
                {data.folders && data.folders.length > 0 ? (
                  data.folders.map((folder: any) => (
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
                        {format(new Date(folder.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                      </TableCell>
                      
                      <TableCell className="text-right font-mono text-sm">
                        {folder.size ? formatFileSize(folder.size) : "—"}
                      </TableCell>

                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setLocation(`/folders/${folder.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Abrir
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadFolderAsZip(folder)}>
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
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteFolderDialog({ open: true, folder })}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar carpeta
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No hay subcarpetas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contenido</CardTitle>
          <CardDescription>Archivos y carpetas</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="max-h-[65vh] overflow-y-auto border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead />
                  <TableHead>Nombre</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Subido por</TableHead>
                  <TableHead>Fecha y hora</TableHead>
                  <TableHead className="text-right">Tamaño</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredFiles.map((file: any) => (
                  <TableRow
                    key={file.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setPreviewFile(file)}
                  >
                    <TableCell>
                      <FileIcon mimeType={file.mimeType} className="h-5 w-5" />
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {file.originalName}
                      {file.version > 1 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          v{file.version}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {file.contractId}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {file.supplier ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {file.uploaderName ?? "—"}
                    </TableCell>
                    <TableCell>
                      {format(
                        new Date(file.uploadedAt),
                        "dd/MM/yyyy HH:mm",
                        { locale: es }
                      )}
                    </TableCell>
                    {/* 🚀 CORRECCIÓN AQUÍ: Usamos file.size en lugar de folder.size */}
                    <TableCell className="text-right font-mono text-sm">
                      {file.size ? formatFileSize(file.size) : "—"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPreviewFile(file)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={`/api/files/${file.id}/download`} download target="_self" rel="noopener noreferrer">
                              <Download className="mr-2 h-4 w-4" />
                              Descargar
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShareDialog({ open: true, file })}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Compartir
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setReplaceFileTarget(file);
                              replaceFileTargetRef.current = file;
                              setTimeout(() => replaceInputRef.current?.click(), 100);
                            }}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reemplazar archivo
                          </DropdownMenuItem>
                          {user?.isAdmin && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteFileDialog({ open: true, file })}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar archivo
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Upload (moved after lists) */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Subir archivo</CardTitle>
            <CardDescription>
              Arrastra o selecciona archivos para esta carpeta
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Input
              placeholder="ID de contrato (Ej: CONT-2024-001)"
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
            />
            <Input
              placeholder="Cliente (Ej: Empresa XYZ S.A.)"
              value={client}
              onChange={(e) => setClient(e.target.value)}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={(e) => {
                e.preventDefault();
                addFilesToSelection(e.dataTransfer.files);
              }}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer hover:bg-muted"
            >
              <Upload className="mx-auto h-10 w-10 mb-3 text-muted-foreground" />
              <p className="font-medium">
                Arrastra archivos aquí o haz clic para seleccionar
              </p>
              <p className="text-sm text-muted-foreground">
                PDF, Word, Excel, Imágenes, ZIP (máx. 50MB)
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                addFilesToSelection(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={replaceInputRef}
              type="file"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                const currentTarget = replaceFileTargetRef.current ?? replaceFileTarget;
                if (f && currentTarget) {
                  handleReplaceFile(f);
                  setReplaceFileTarget(null);
                  replaceFileTargetRef.current = null;
                }
                e.target.value = "";
              }}
            />

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Archivos seleccionados:</p>
                <ul className="space-y-1 max-h-24 overflow-y-auto border rounded-lg p-2 bg-muted/30">
                  {selectedFiles.map((f, i) => (
                    <li key={i} className="flex items-center justify-between text-sm gap-2">
                      <span className="truncate">{f.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => removeSelectedFile(i)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={uploadSelectedFiles}
                  disabled={uploading}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Subiendo…" : "Subir archivo(s)"}
                </Button>
              </div>
            )}

            {uploading && (
              <p className="text-sm text-muted-foreground">
                Subiendo archivos…
              </p>
            )}

            {uploadSuccess && selectedFiles.length === 0 && (
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                Archivos subidos correctamente
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <PromptDialog
        open={newFolderDialogOpen}
        onOpenChange={(open) => setNewFolderDialogOpen(open)}
        title="Nueva carpeta"
        description="Introduce el nombre de la nueva carpeta"
        placeholder="Nombre de la carpeta"
        submitLabel="Crear"
        onSubmit={async (name: string) => {
          await createFolderWithName(name);
          setNewFolderDialogOpen(false);
        }}
      />

      <PromptDialog
        open={renameFolderDialog.open}
        onOpenChange={(open) => setRenameFolderDialog({ open, folder: open ? renameFolderDialog.folder : null })}
        title="Renombrar carpeta"
        description="Introduce el nuevo nombre para la carpeta"
        placeholder="Nuevo nombre"
        defaultValue={renameFolderDialog.folder?.name || ""}
        submitLabel="Renombrar"
  onSubmit={async (newName: string) => {
    const folder = renameFolderDialog.folder;
    if (!folder || !user?.isAdmin) return;
    setRenameLoading(true);
    try {
      // 🚀 DETECCIÓN: Si el ID no es un número, usamos la API de Microsoft
      const isMs = Number.isNaN(Number(folder.id));
      const url = isMs ? `/api/folders/${folder.id}` : `/api/folders/${folder.id}`; 
      // Nota: Aunque la URL sea igual, el backend ahora manejará el String ID correctamente

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al renombrar");
      }
      
      await loadFolder();
      queryClient.invalidateQueries({ queryKey: ["/api/folders/root"] });
      toast({ title: "Carpeta renombrada", description: `"${folder.name}" se renombró a "${newName}"` });
      setRenameFolderDialog({ open: false, folder: null });
    } catch (err: any) {
      toast({
        title: "Error al renombrar",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setRenameLoading(false);
    }
  }}
/>


      <ShareDialog
  
  open={shareDialog.open}
  onOpenChange={(open) => !open && setShareDialog({ open: false })}
  title={shareDialog.file?.originalName ?? shareDialog.folder?.name ?? ""}
  isFile={!!shareDialog.file}
  isFolder={!!shareDialog.folder}
  itemId={shareDialog.file?.id ?? shareDialog.folder?.id} 
/>
    

      <ConfirmDialog
        open={deleteFileDialog.open}
        onOpenChange={(open) => setDeleteFileDialog({ open, file: open ? deleteFileDialog.file : null })}
        title="Eliminar archivo"
        description={
          deleteFileDialog.file
            ? `¿Eliminar "${deleteFileDialog.file.originalName}"? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleDeleteFileConfirm}
      />

      <ConfirmDialog
        open={deleteFolderDialog.open}
        onOpenChange={(open) => setDeleteFolderDialog({ open, folder: open ? deleteFolderDialog.folder : null })}
        title="Eliminar carpeta"
        description={
          deleteFolderDialog.folder
            ? `¿Eliminar la carpeta "${deleteFolderDialog.folder.name}" y todo su contenido? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleDeleteFolderConfirm}
      />

      <PromptDialog
        open={renameFolderDialog.open}
        onOpenChange={(open) => setRenameFolderDialog({ open, folder: open ? renameFolderDialog.folder : null })}
        title="Renombrar carpeta"
        description="Introduce el nuevo nombre para la carpeta"
        placeholder="Nuevo nombre"
        defaultValue={renameFolderDialog.folder?.name || ""}
        submitLabel="Renombrar"
        onSubmit={async (newName: string) => {
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
            await loadFolder();
            queryClient.invalidateQueries({ queryKey: ["/api/folders/root"] });
            toast({ title: "Carpeta renombrada", description: `"${folder.name}" se renombró a "${newName}"` });
            setRenameFolderDialog({ open: false, folder: null });
          } catch (err: any) {
            toast({
              title: "Error al renombrar",
              description: (err as Error)?.message || "Error",
              variant: "destructive",
            });
          } finally {
            setRenameLoading(false);
          }
        }}
      />

      {/* File preview dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">
              {previewFile?.originalName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto bg-slate-50 dark:bg-slate-900 rounded-b-lg">
            {previewFile && (() => {
              const mime = previewFile.mimeType || "";
              const previewUrl = `/api/files/${previewFile.id}/preview`;
              const downloadUrl = `/api/files/${previewFile.id}/download`;
              const isPdf = mime.includes("pdf");
              const isImage = mime.startsWith("image/");
              const isOffice =
                mime.includes("word") || mime.includes("document") ||
                mime.includes("excel") || mime.includes("spreadsheet") ||
                mime.includes("powerpoint") || mime.includes("presentation");

              if (isPdf) {
                return (
                  <div className="flex flex-col h-full">
                    <div className="p-2 bg-muted flex justify-end">
                      <Button asChild variant="outline" size="sm">
                        <a href={downloadUrl} download target="_self" rel="noopener noreferrer">
                          <Download className="mr-2 h-4 w-4" />
                          Descargar PDF
                        </a>
                      </Button>
                    </div>
                    <iframe src={previewUrl} title={previewFile.originalName} className="w-full flex-1 min-h-[70vh] border-0" />
                  </div>
                );
              }
              if (isImage) {
                return (
                  <div className="flex flex-col items-center justify-center p-6 h-full space-y-4">
                    <img src={previewUrl} alt={previewFile.originalName} className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-sm" />
                    <Button asChild variant="outline" size="sm">
                      <a href={downloadUrl} download target="_self" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        Descargar Imagen
                      </a>
                    </Button>
                  </div>
                );
              }
              if (isOffice) {
                // 🚀 Llamamos a la nueva ruta que nos devuelve el visor de Microsoft
                const embedUrl = `/api/files/${previewFile.id}/embed`;
                
                return (
                  <div className="flex flex-col h-full">
                    {/* Barra de herramientas superior */}
                    <div className="p-2 bg-muted flex items-center justify-between border-b">
                      <span className="text-sm font-semibold text-muted-foreground ml-2">
                        Vista previa de Office
                      </span>
                      <div className="flex gap-2">
                        <Button asChild variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                          <a href={`/api/files/${previewFile.id}/edit-office`} target="_blank" rel="noopener noreferrer">
                            <Eye className="mr-2 h-4 w-4" />
                            Editar en Office Online
                          </a>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <a href={downloadUrl} download target="_self" rel="noopener noreferrer">
                            <Download className="mr-2 h-4 w-4" />
                            Descargar
                          </a>
                        </Button>
                      </div>
                    </div>
                    {/* 🚀 El iframe que dibuja el documento */}
                    <iframe 
                      src={embedUrl} 
                      title={previewFile.originalName} 
                      className="w-full flex-1 min-h-[70vh] border-0 bg-white" 
                    />
                  </div>
                );
              }
              // Caso genérico (ZIPs, etc.)
              return (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                  <FileIcon mimeType={mime} className="h-16 w-16 text-muted-foreground" />
                  <p className="text-muted-foreground font-medium">Este formato de archivo no admite vista previa web.</p>
                  <Button asChild variant="default">
                    <a href={downloadUrl} download target="_self" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Descargar archivo
                    </a>
                  </Button>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}