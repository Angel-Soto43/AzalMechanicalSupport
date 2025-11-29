import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Upload,
  Search,
  MoreVertical,
  Download,
  Eye,
  RefreshCw,
  FileText,
  X,
  CloudUpload,
  Loader2,
  FolderOpen,
  Grid3X3,
  List,
  Clock,
} from "lucide-react";
import { File } from "@shared/schema";
import { FileIcon, formatFileSize, getFileTypeName } from "@/components/file-icon";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface FileWithUploader extends File {
  uploaderName: string;
}

type ViewMode = "grid" | "list";

function FileUploadZone({
  onFilesSelected,
  isUploading,
  contractId,
  onContractIdChange,
}: {
  onFilesSelected: (files: FileList) => void;
  isUploading: boolean;
  contractId: string;
  onContractIdChange: (value: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        onFilesSelected(e.dataTransfer.files);
      }
    },
    [onFilesSelected]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFilesSelected(e.target.files);
      }
    },
    [onFilesSelected]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Subir Archivo
        </CardTitle>
        <CardDescription>
          Arrastra y suelta archivos o haz clic para seleccionar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="contractId">ID de Contrato (obligatorio)</Label>
          <Input
            id="contractId"
            placeholder="Ej: CONT-2024-001"
            value={contractId}
            onChange={(e) => onContractIdChange(e.target.value)}
            className="mt-1.5 font-mono"
            data-testid="input-contract-id"
          />
        </div>

        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
            ${isUploading ? "pointer-events-none opacity-50" : "cursor-pointer hover:border-primary/50"}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-input")?.click()}
          data-testid="dropzone-upload"
        >
          <input
            id="file-input"
            type="file"
            className="hidden"
            onChange={handleFileInput}
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.zip,.rar,.tar,.gz"
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Subiendo archivo...</p>
            </div>
          ) : (
            <>
              <CloudUpload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">
                Arrastra archivos aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, Word, Excel, PowerPoint, Imágenes, ZIP (máx. 50MB)
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FileCard({ file, onPreview, onDownload, onUpdateVersion }: {
  file: FileWithUploader;
  onPreview: (file: FileWithUploader) => void;
  onDownload: (file: FileWithUploader) => void;
  onUpdateVersion: (file: FileWithUploader) => void;
}) {
  const { user } = useAuth();
  const canUpdate = user?.id === file.uploadedBy;

  return (
    <Card className="hover-elevate group">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
            <FileIcon mimeType={file.mimeType} className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate" data-testid={`text-filename-${file.id}`}>
              {file.originalName}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs font-mono">
                {file.contractId}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
              {file.version > 1 && (
                <Badge variant="secondary" className="text-xs">
                  v{file.version}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {file.uploaderName} • {formatDistanceToNow(new Date(file.uploadedAt), { addSuffix: true, locale: es })}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-file-menu-${file.id}`}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPreview(file)} data-testid={`menu-preview-${file.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                Previsualizar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload(file)} data-testid={`menu-download-${file.id}`}>
                <Download className="mr-2 h-4 w-4" />
                Descargar
              </DropdownMenuItem>
              {canUpdate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onUpdateVersion(file)} data-testid={`menu-update-${file.id}`}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Actualizar versión
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

function FileListItem({ file, onPreview, onDownload, onUpdateVersion }: {
  file: FileWithUploader;
  onPreview: (file: FileWithUploader) => void;
  onDownload: (file: FileWithUploader) => void;
  onUpdateVersion: (file: FileWithUploader) => void;
}) {
  const { user } = useAuth();
  const canUpdate = user?.id === file.uploadedBy;

  return (
    <div className="flex items-center gap-4 p-4 border-b last:border-b-0 hover-elevate">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <FileIcon mimeType={file.mimeType} className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate" data-testid={`text-filename-${file.id}`}>
          {file.originalName}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {file.uploaderName}
        </p>
      </div>
      <Badge variant="outline" className="shrink-0 text-xs font-mono hidden sm:flex">
        {file.contractId}
      </Badge>
      <div className="text-right shrink-0 hidden md:block">
        <p className="text-sm">{formatFileSize(file.size)}</p>
        <p className="text-xs text-muted-foreground">
          {getFileTypeName(file.mimeType)}
        </p>
      </div>
      <div className="text-right shrink-0 hidden lg:block">
        <p className="text-sm">
          {format(new Date(file.uploadedAt), "dd/MM/yyyy", { locale: es })}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(file.uploadedAt), "HH:mm", { locale: es })}
        </p>
      </div>
      {file.version > 1 && (
        <Badge variant="secondary" className="shrink-0 text-xs">
          v{file.version}
        </Badge>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" data-testid={`button-file-menu-${file.id}`}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onPreview(file)}>
            <Eye className="mr-2 h-4 w-4" />
            Previsualizar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDownload(file)}>
            <Download className="mr-2 h-4 w-4" />
            Descargar
          </DropdownMenuItem>
          {canUpdate && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onUpdateVersion(file)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar versión
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function FilePreviewDialog({ file, open, onOpenChange }: {
  file: FileWithUploader | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!file) return null;

  const isImage = file.mimeType.startsWith("image/");
  const isPdf = file.mimeType === "application/pdf";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileIcon mimeType={file.mimeType} className="h-5 w-5" />
            {file.originalName}
          </DialogTitle>
          <DialogDescription>
            <span className="font-mono">{file.contractId}</span> • {formatFileSize(file.size)} • 
            Subido por {file.uploaderName}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-[400px] bg-muted rounded-lg overflow-hidden">
          {isImage ? (
            <img
              src={`/api/files/${file.id}/preview`}
              alt={file.originalName}
              className="w-full h-full object-contain"
            />
          ) : isPdf ? (
            <iframe
              src={`/api/files/${file.id}/preview`}
              className="w-full h-[500px]"
              title={file.originalName}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <FileIcon mimeType={file.mimeType} className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium mb-2">Vista previa no disponible</p>
              <p className="text-sm text-muted-foreground mb-4">
                Este tipo de archivo no puede ser previsualizado en el navegador
              </p>
              <Button onClick={() => window.open(`/api/files/${file.id}/download`, "_blank")}>
                <Download className="mr-2 h-4 w-4" />
                Descargar archivo
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={() => window.open(`/api/files/${file.id}/download`, "_blank")}>
            <Download className="mr-2 h-4 w-4" />
            Descargar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MyFilesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [contractId, setContractId] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [previewFile, setPreviewFile] = useState<FileWithUploader | null>(null);
  const [updateVersionFile, setUpdateVersionFile] = useState<FileWithUploader | null>(null);

  const { data: files, isLoading } = useQuery<FileWithUploader[]>({
    queryKey: ["/api/files/my"],
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, contractId }: { file: File; contractId: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("contractId", contractId);

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Error al subir el archivo");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/files/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setContractId("");
      toast({
        title: "Archivo subido",
        description: "El archivo se ha subido correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al subir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateVersionMutation = useMutation({
    mutationFn: async ({ fileId, file }: { fileId: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/files/${fileId}/version`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Error al actualizar el archivo");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files/my"] });
      setUpdateVersionFile(null);
      toast({
        title: "Versión actualizada",
        description: "El archivo se ha actualizado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFilesSelected = useCallback(
    (fileList: FileList) => {
      if (!contractId.trim()) {
        toast({
          title: "ID de contrato requerido",
          description: "Por favor, ingresa el ID de contrato antes de subir archivos",
          variant: "destructive",
        });
        return;
      }

      Array.from(fileList).forEach((file) => {
        uploadMutation.mutate({ file, contractId: contractId.trim() });
      });
    },
    [contractId, uploadMutation, toast]
  );

  const handleDownload = useCallback((file: FileWithUploader) => {
    window.open(`/api/files/${file.id}/download`, "_blank");
  }, []);

  const handleUpdateVersion = useCallback((file: FileWithUploader) => {
    setUpdateVersionFile(file);
  }, []);

  const handleVersionFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0 && updateVersionFile) {
        updateVersionMutation.mutate({
          fileId: updateVersionFile.id,
          file: e.target.files[0],
        });
      }
    },
    [updateVersionFile, updateVersionMutation]
  );

  const filteredFiles = files?.filter((file) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      file.originalName.toLowerCase().includes(query) ||
      file.contractId.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mis Archivos</h1>
          <p className="text-muted-foreground">
            Gestiona tus documentos y contratos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar archivos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-files"
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
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              data-testid="button-view-grid"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Zone */}
        <div className="lg:col-span-1">
          <FileUploadZone
            onFilesSelected={handleFilesSelected}
            isUploading={uploadMutation.isPending}
            contractId={contractId}
            onContractIdChange={setContractId}
          />
        </div>

        {/* Files List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    Archivos
                  </CardTitle>
                  <CardDescription>
                    {filteredFiles?.length ?? 0} documento{(filteredFiles?.length ?? 0) !== 1 ? "s" : ""}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-48 mb-2" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredFiles && filteredFiles.length > 0 ? (
                viewMode === "grid" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredFiles.map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        onPreview={setPreviewFile}
                        onDownload={handleDownload}
                        onUpdateVersion={handleUpdateVersion}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="border rounded-lg divide-y">
                    {filteredFiles.map((file) => (
                      <FileListItem
                        key={file.id}
                        file={file}
                        onPreview={setPreviewFile}
                        onDownload={handleDownload}
                        onUpdateVersion={handleUpdateVersion}
                      />
                    ))}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-1">
                    {searchQuery ? "No se encontraron archivos" : "No hay archivos"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "Intenta con otros términos de búsqueda"
                      : "Sube tu primer documento usando el formulario"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Dialog */}
      <FilePreviewDialog
        file={previewFile}
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
      />

      {/* Update Version Dialog */}
      <Dialog open={!!updateVersionFile} onOpenChange={(open) => !open && setUpdateVersionFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar Versión</DialogTitle>
            <DialogDescription>
              Sube una nueva versión de "{updateVersionFile?.originalName}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <FileIcon mimeType={updateVersionFile?.mimeType ?? ""} className="h-10 w-10" />
              <div>
                <p className="font-medium">{updateVersionFile?.originalName}</p>
                <p className="text-sm text-muted-foreground">
                  Versión actual: v{updateVersionFile?.version}
                </p>
              </div>
            </div>
            <div>
              <Label htmlFor="version-file">Seleccionar nuevo archivo</Label>
              <Input
                id="version-file"
                type="file"
                className="mt-1.5"
                onChange={handleVersionFileSelected}
                disabled={updateVersionMutation.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateVersionFile(null)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
