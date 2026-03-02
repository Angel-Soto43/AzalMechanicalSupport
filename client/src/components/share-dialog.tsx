import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, MessageCircle, Mail, AlertCircle, Loader } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Descargar archivo directamente para compartir */
  onDownloadFile?: () => void;
  /** Descargar carpeta como ZIP para compartir */
  onDownloadFolder?: () => void;
  isFile?: boolean;
  isFolder?: boolean;
}

export function ShareDialog({
  open,
  onOpenChange,
  title,
  onDownloadFile,
  onDownloadFolder,
  isFile,
  isFolder,
}: ShareDialogProps) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const handleShareViaWhatsApp = async () => {
    try {
      setDownloading(true);

      // Show informative message based on file/folder type
      if (isFile) {
        toast({
          title: "Descargando archivo",
          description: "Por seguridad del navegador, el archivo se descargará para que puedas adjuntarlo y compartirlo.",
        });
      } else if (isFolder) {
        toast({
          title: "Descargando carpeta",
          description: "La carpeta se descargará como archivo comprimido (ZIP) para que puedas adjuntarla y compartirla.",
        });
      }

      // Download file/folder first
      if (isFile && onDownloadFile) {
        onDownloadFile();
      } else if (isFolder && onDownloadFolder) {
        onDownloadFolder();
      }

      // Give browser time to start download, then open WhatsApp
      setTimeout(() => {
        window.open("https://web.whatsapp.com/", "_blank", "noopener,noreferrer");
        toast({
          title: "WhatsApp abierto",
          description: "Adjunta el archivo descargado en tu conversación.",
        });
      }, 500);

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar el archivo",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleShareViaEmail = async () => {
    try {
      setDownloading(true);

      // Show informative message based on file/folder type
      if (isFile) {
        toast({
          title: "Descargando archivo",
          description: "Por seguridad del navegador, el archivo se descargará para que puedas adjuntarlo y compartirlo.",
        });
      } else if (isFolder) {
        toast({
          title: "Descargando carpeta",
          description: "La carpeta se descargará como archivo comprimido (ZIP) para que puedas adjuntarla y compartirla.",
        });
      }

      // Download file/folder first
      if (isFile && onDownloadFile) {
        onDownloadFile();
      } else if (isFolder && onDownloadFolder) {
        onDownloadFolder();
      }

      // Give browser time to start download, then open email client
      setTimeout(() => {
        const subject = encodeURIComponent(`Compartido: ${title}`);
        const body = encodeURIComponent(
          `Te comparto este ${isFile ? "archivo" : "carpeta"}:\n"${title}"\n\nEl ${isFile ? "archivo" : "archivo comprimido"} se ha descargado en tu ordenador. Por favor adjúntalo a este correo.`
        );
        window.open(
          `mailto:?subject=${subject}&body=${body}`,
          "_blank",
          "noopener,noreferrer"
        );
        toast({
          title: "Cliente de correo abierto",
          description: "Adjunta el archivo descargado a tu correo.",
        });
      }, 500);

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar el archivo",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Compartir "{title}"
          </DialogTitle>
          <DialogDescription>
            Descarga el archivo automáticamente y adjúntalo en tu aplicación preferida.
          </DialogDescription>
        </DialogHeader>

        {downloading && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader className="h-5 w-5 animate-spin" />
            <span className="text-sm">Descargando...</span>
          </div>
        )}

        {!downloading && (
          <div className="space-y-3">
            {/* WhatsApp Button */}
            <Button
              onClick={handleShareViaWhatsApp}
              disabled={!onDownloadFile && !onDownloadFolder}
              className="w-full gap-2 bg-[#16A34A] hover:bg-[#15803D] text-white"
            >
              <MessageCircle className="h-5 w-5" />
              Compartir por WhatsApp
            </Button>

            {/* Email Button */}
            <Button
              onClick={handleShareViaEmail}
              disabled={!onDownloadFile && !onDownloadFolder}
              className="w-full gap-2"
              variant="outline"
            >
              <Mail className="h-5 w-5" />
              Compartir por Correo
            </Button>

            {/* Info message */}
            <div className="flex gap-2 rounded-lg bg-[#f0f4f8] p-3 text-sm text-[#1E293B] dark:bg-[#1e293b]/20 dark:text-[#E2E8F0]">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>El archivo se descargará. Adjúntalo en tu aplicación de WhatsApp o correo electrónico.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
