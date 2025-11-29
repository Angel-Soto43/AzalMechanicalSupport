import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Search,
  MoreVertical,
  Download,
  Eye,
  Filter,
  Calendar,
  User,
  Share2,
  X,
  FileText,
} from "lucide-react";
import { File, User as UserType } from "@shared/schema";
import { FileIcon, formatFileSize, getFileTypeName } from "@/components/file-icon";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface FileWithUploader extends File {
  uploaderName: string;
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

export default function SharedFilesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUploader, setFilterUploader] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [previewFile, setPreviewFile] = useState<FileWithUploader | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: files, isLoading } = useQuery<FileWithUploader[]>({
    queryKey: ["/api/files/shared"],
  });

  const { data: users } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const handleDownload = useCallback((file: FileWithUploader) => {
    window.open(`/api/files/${file.id}/download`, "_blank");
  }, []);

  const filteredFiles = files?.filter((file) => {
    let matches = true;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matches = matches && (
        file.originalName.toLowerCase().includes(query) ||
        file.contractId.toLowerCase().includes(query) ||
        file.uploaderName.toLowerCase().includes(query)
      );
    }

    if (filterUploader && filterUploader !== "all") {
      matches = matches && file.uploadedBy === parseInt(filterUploader);
    }

    if (filterDate) {
      const fileDate = format(new Date(file.uploadedAt), "yyyy-MM-dd");
      matches = matches && fileDate === filterDate;
    }

    return matches;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setFilterUploader("all");
    setFilterDate("");
  };

  const hasActiveFilters = searchQuery || (filterUploader && filterUploader !== "all") || filterDate;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Share2 className="h-6 w-6" />
            Archivos Compartidos
          </h1>
          <p className="text-muted-foreground">
            Documentos compartidos por otros usuarios
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, contrato o usuario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-shared-files"
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
          <Button
            variant={showFilters ? "secondary" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="filter-uploader" className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Usuario
                </Label>
                <Select value={filterUploader} onValueChange={setFilterUploader}>
                  <SelectTrigger id="filter-uploader" className="w-48">
                    <SelectValue placeholder="Todos los usuarios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los usuarios</SelectItem>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filter-date" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Fecha
                </Label>
                <Input
                  id="filter-date"
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-48"
                />
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Files Table */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos Disponibles</CardTitle>
          <CardDescription>
            {filteredFiles?.length ?? 0} archivo{(filteredFiles?.length ?? 0) !== 1 ? "s" : ""} encontrado{(filteredFiles?.length ?? 0) !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : filteredFiles && filteredFiles.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Nombre del Archivo</TableHead>
                    <TableHead>ID Contrato</TableHead>
                    <TableHead>Compartido por</TableHead>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Tamaño</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFiles.map((file) => (
                    <TableRow key={file.id} className="hover-elevate">
                      <TableCell>
                        <FileIcon mimeType={file.mimeType} className="h-5 w-5" />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium truncate max-w-xs text-sm">
                            {file.originalName}
                          </p>
                          {file.version > 1 && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              v{file.version}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {file.contractId}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{file.uploaderName}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(file.uploadedAt), "dd/MM/yyyy", { locale: es })}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {format(new Date(file.uploadedAt), "HH:mm:ss", { locale: es })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getFileTypeName(file.mimeType)}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatFileSize(file.size)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setPreviewFile(file)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Previsualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(file)}>
                              <Download className="mr-2 h-4 w-4" />
                              Descargar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">
                {hasActiveFilters ? "No se encontraron archivos" : "No hay archivos compartidos"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Intenta ajustar los filtros de búsqueda"
                  : "Aún no se han compartido documentos"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Limpiar filtros
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <FilePreviewDialog
        file={previewFile}
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
      />
    </div>
  );
}
