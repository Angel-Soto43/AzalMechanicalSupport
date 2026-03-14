import { useState, useCallback } from "react";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MoreVertical,
  Download,
  Eye,
  Trash2,
  Filter,
  Mail,
  Grid3X3,
} from "lucide-react";
import { File } from "@shared/schema";
import { FileIcon, formatFileSize } from "@/components/file-icon";
import { format } from "date-fns";
import { es } from "date-fns/locale";


interface FileWithEmail extends File {
  correo: string;
}

function FilePreviewDialog({ file, open, onOpenChange }: {
  file: FileWithEmail | null;
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
             Propietario: <span className="text-blue-600 font-semibold">{file.correo}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-[400px] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
          {isImage ? (
            <img src={`/api/files/${file.id}/preview`} alt={file.originalName} className="w-full h-full object-contain" />
          ) : isPdf ? (
            <iframe src={`/api/files/${file.id}/preview`} className="w-full h-[500px]" title={file.originalName} />
          ) : (
            <div className="text-center p-8">
              <FileIcon mimeType={file.mimeType} className="h-16 w-16 mb-4 mx-auto" />
              <p>Vista previa no disponible</p>
              <Button className="mt-4" onClick={() => window.open(`/api/files/${file.id}/download`, "_blank")}>
                <Download className="mr-2 h-4 w-4" /> Descargar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AllFilesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [previewFile, setPreviewFile] = useState<FileWithEmail | null>(null);


  const { data: files, isLoading } = useQuery<FileWithEmail[]>({
    queryKey: ["/api/files"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await apiRequest("DELETE", `/api/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({ title: "Eliminado", description: "Archivo borrado con éxito" });
    },
  });

  const filteredFiles = files?.filter((file) => {
    const query = searchQuery.toLowerCase();
    return file.originalName.toLowerCase().includes(query) ||
           (file.correo && file.correo.toLowerCase().includes(query));
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <Grid3X3 className="h-6 w-6 text-blue-600" />
            Todos los Archivos
          </h1>
          <p className="text-muted-foreground">Gestión de documentos por correo electrónico</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por nombre o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-72 shadow-sm"
          />
        </div>
      </div>

      <Card className="shadow-md border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b">
          <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Registros del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Nombre del Archivo</TableHead>
                  <TableHead>Correo del Propietario</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Tamaño</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles?.map((file) => (
                  <TableRow key={file.id} className="group transition-colors">
                    <TableCell>
                      <FileIcon mimeType={file.mimeType} className="h-5 w-5 opacity-70 group-hover:opacity-100" />
                    </TableCell>
                    <TableCell className="font-medium text-slate-700">{file.originalName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 flex w-fit items-center gap-1.5 font-mono text-[10px]">
                        <Mail className="h-3 w-3" /> {file.correo || "usuario@azal.com"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {format(new Date(file.uploadedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono text-slate-500">
                      {formatFileSize(file.size)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPreviewFile(file)}><Eye className="mr-2 h-4 w-4" /> Ver</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`/api/files/${file.id}/download`, "_blank")}><Download className="mr-2 h-4 w-4" /> Descargar</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => deleteMutation.mutate(file.id)} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Borrar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FilePreviewDialog file={previewFile} open={!!previewFile} onOpenChange={(o) => !o && setPreviewFile(null)} />
    </div>
  );
}