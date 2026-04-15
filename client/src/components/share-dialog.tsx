import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, MessageCircle, Mail, AlertCircle, Loader, Link as LinkIcon } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  isFile?: boolean;
  isFolder?: boolean;
  /** El ID de Microsoft o local del elemento */
  itemId?: string | number;
}

export function ShareDialog({
  open,
  onOpenChange,
  title,
  isFile,
  isFolder,
  itemId, // Recibimos el ID de carpeta o archivo
}: ShareDialogProps) {
  const { toast } = useToast();
  const [loadingAction, setLoadingAction] = useState<"whatsapp" | "email" | "copy" | null>(null);

  const getShareLink = async () => {
    if (!itemId) throw new Error("ID de elemento no disponible");
    const endpoint = isFile ? `/api/files/${itemId}/share` : `/api/folders/${itemId}/share`;
    const res = await fetch(endpoint, { credentials: "include" });
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.error || "No se pudo generar el enlace de compartido");
    }
    const data = await res.json();
    return data.shareLink;
  };

  const handleShareViaWhatsApp = async () => {
    let whatsappWindow: Window | null = null;
    try {
      setLoadingAction("whatsapp");
      whatsappWindow = window.open("about:blank", "_blank");
      if (!whatsappWindow) {
        throw new Error("El navegador bloqueó la apertura de WhatsApp. Permite ventanas emergentes.");
      }

      const link = await getShareLink();
      const text = encodeURIComponent(`Hola, te comparto este ${isFile ? "archivo" : "carpeta"} desde Azal Mechanical Support:\n\n*${title}*\n\nPuedes verlo aquí:\n${link}`);
      const url = `https://wa.me/?text=${text}`;

      whatsappWindow.location.href = url;
      whatsappWindow.focus();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      if (whatsappWindow) {
        whatsappWindow.close();
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleShareViaEmail = async () => {
    try {
      setLoadingAction("email");
      const link = await getShareLink();

      const subject = encodeURIComponent(`Compartido: ${title}`);
      const body = encodeURIComponent(
        `Hola,\n\nTe comparto el siguiente recurso desde la plataforma Azal Mechanical Support:\n\nElemento: ${title}\nTipo: ${isFile ? "Archivo" : "Carpeta"}\n\nPuedes acceder mediante el siguiente enlace:\n${link}\n\nSaludos.`
      );
      const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
      window.location.href = mailtoUrl;

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCopyLink = async () => {
    try {
      setLoadingAction("copy");
      const link = await getShareLink();
      await navigator.clipboard.writeText(link);
      toast({
        title: "Copiado",
        description: "Enlace copiado al portapapeles",
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        variant: "destructive",
        description: error.message,
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const isActionLoading = (action: "whatsapp" | "email" | "copy") => loadingAction === action;
  const isAnyLoading = loadingAction !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Compartir "{title}"
          </DialogTitle>
          <DialogDescription>
            Genera un enlace seguro dentro de la plataforma para compartirlo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            onClick={handleShareViaWhatsApp}
            disabled={isAnyLoading}
            className="w-full gap-2 bg-[#16A34A] hover:bg-[#15803D] text-white"
          >
            {isActionLoading("whatsapp") ? <Loader className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
            Enviar por WhatsApp
          </Button>

          <Button
            onClick={handleShareViaEmail}
            disabled={isAnyLoading}
            className="w-full gap-2"
            variant="outline"
          >
            {isActionLoading("email") ? <Loader className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
            Enviar por Correo
          </Button>

          <Button
            onClick={handleCopyLink}
            disabled={isAnyLoading}
            className="w-full gap-2"
            variant="secondary"
          >
            {isActionLoading("copy") ? <Loader className="h-5 w-5 animate-spin" /> : <LinkIcon className="h-5 w-5" />}
            Copiar enlace
          </Button>

          <div className="flex gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>Se generará un enlace seguro de la plataforma. No necesitas descargar ni adjuntar nada.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}