import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Eye } from "lucide-react";
import { FileIcon } from "@/components/file-icon";

interface FilePreviewDialogProps {
  file: any | null;
  onClose: () => void;
}

export function FilePreviewDialog({ file, onClose }: FilePreviewDialogProps) {
  if (!file) return null;

  const mime = file.mimeType || "";
  const previewUrl  = `/api/files/${file.id}/preview`;
  const downloadUrl = `/api/files/${file.id}/download`;
  const isPdf    = mime.includes("pdf");
  const isImage  = mime.startsWith("image/");
  const isOffice =
    mime.includes("word")        || mime.includes("document") ||
    mime.includes("excel")       || mime.includes("spreadsheet") ||
    mime.includes("powerpoint")  || mime.includes("presentation");

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{file.originalName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto bg-slate-50 dark:bg-slate-900 rounded-b-lg">
          {isPdf && (
            <div className="flex flex-col h-full">
              <div className="p-2 bg-muted flex justify-end">
                <Button asChild variant="outline" size="sm">
                  <a href={downloadUrl} download target="_self" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" /> Descargar PDF
                  </a>
                </Button>
              </div>
              <iframe
                src={previewUrl}
                title={file.originalName}
                className="w-full flex-1 min-h-[70vh] border-0"
              />
            </div>
          )}

          {isImage && !isPdf && (
            <div className="flex flex-col items-center justify-center p-6 h-full space-y-4">
              <img
                src={previewUrl}
                alt={file.originalName}
                className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-sm"
              />
              <Button asChild variant="outline" size="sm">
                <a href={downloadUrl} download target="_self" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" /> Descargar Imagen
                </a>
              </Button>
            </div>
          )}

          {isOffice && (
            <div className="flex flex-col h-full">
              <div className="p-2 bg-muted flex items-center justify-between border-b">
                <span className="text-sm font-semibold text-muted-foreground ml-2">
                  Vista previa de Office
                </span>
                <div className="flex gap-2">
                  <Button
                    asChild
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                  >
                    <a
                      href={`/api/files/${file.id}/edit-office`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Eye className="mr-2 h-4 w-4" /> Editar en Office Online
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={downloadUrl} download target="_self" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" /> Descargar
                    </a>
                  </Button>
                </div>
              </div>
              <iframe
                src={`/api/files/${file.id}/embed`}
                title={file.originalName}
                className="w-full flex-1 min-h-[70vh] border-0 bg-white"
              />
            </div>
          )}

          {!isPdf && !isImage && !isOffice && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
              <FileIcon
                mimeType={mime}
                filename={file.originalName}
                className="h-16 w-16 text-muted-foreground"
              />
              <p className="text-muted-foreground font-medium">
                Este formato de archivo no admite vista previa web.
              </p>
              <Button asChild variant="default">
                <a href={downloadUrl} download target="_self" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" /> Descargar archivo
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
