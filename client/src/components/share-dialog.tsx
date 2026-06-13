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
  itemId,
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
    return data.shareLink as string;
  };

  const writeTextToClipboard = async (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (!successful) throw new Error("No se pudo copiar el enlace al portapapeles");
  };

  /* ─── WhatsApp: envía el archivo/ZIP real ──────────────────────────────── */
  const handleShareViaWhatsApp = async () => {
    try {
      setLoadingAction("whatsapp");

      if (!itemId) throw new Error("ID de elemento no disponible");

      // Descarga el archivo binario (ZIP si es carpeta, archivo real si es fichero)
      const endpoint = isFile
        ? `/api/files/${itemId}/download`
        : `/api/folders/${itemId}/download`;

      const res = await fetch(endpoint, { credentials: "include" });
      if (!res.ok) throw new Error("No se pudo obtener el archivo para compartir");

      const blob = await res.blob();
      const fileName = isFolder ? `${title}.zip` : title;

      // Resolve the MIME type from the file extension so canShare() accepts it.
      // Microsoft's CDN sometimes returns application/octet-stream even for Office/image files.
      const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
      const MIME_BY_EXT: Record<string, string> = {
        pdf:  "application/pdf",
        doc:  "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xls:  "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ppt:  "application/vnd.ms-powerpoint",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        png:  "image/png",
        jpg:  "image/jpeg",
        jpeg: "image/jpeg",
        gif:  "image/gif",
        webp: "image/webp",
        bmp:  "image/bmp",
        txt:  "text/plain",
        log:  "text/plain",
        csv:  "text/csv",
        zip:  "application/zip",
        rar:  "application/vnd.rar",
        "7z": "application/x-7z-compressed",
      };
      const resolvedType = MIME_BY_EXT[ext] || blob.type || "application/octet-stream";

      const shareFile = new File([blob], fileName, { type: resolvedType });

      // Intenta Web Share API (soportada en móvil Chrome/Safari y algunos escritorios)
      if (
        typeof navigator.share === "function" &&
        navigator.canShare &&
        navigator.canShare({ files: [shareFile] })
      ) {
        await navigator.share({ files: [shareFile] });
        onOpenChange(false);
      } else {
        // Fallback: descarga el archivo al dispositivo y abre WhatsApp para adjuntarlo
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        const text = encodeURIComponent(
          `Hola, te comparto este ${isFile ? "archivo" : "carpeta"} desde Azal Mechanical Support:\n*${title}*`
        );
        window.open(`https://wa.me/?text=${text}`, "_blank");

        toast({
          title: "Archivo descargado",
          description:
            "El archivo se guardó en tu dispositivo. Adjúntalo manualmente en WhatsApp para enviarlo.",
        });
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoadingAction(null);
    }
  };

  /* ─── Correo: enlace de plataforma ────────────────────────────────────── */
  const handleShareViaEmail = async () => {
    try {
      setLoadingAction("email");
      const link = await getShareLink();
      const subject = encodeURIComponent(`Compartido: ${title}`);
      const body = encodeURIComponent(
        `Hola,\n\nTe comparto el siguiente recurso desde la plataforma Azal Mechanical Support:\n\nElemento: ${title}\nTipo: ${isFile ? "Archivo" : "Carpeta"}\n\nPuedes acceder mediante el siguiente enlace:\n${link}\n\nSaludos.`
      );
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoadingAction(null);
    }
  };

  /* ─── Copiar enlace ────────────────────────────────────────────────────── */
  const handleCopyLink = async () => {
    try {
      setLoadingAction("copy");
      const link = await getShareLink();
      await writeTextToClipboard(link);
      toast({ title: "Copiado", description: "Enlace copiado al portapapeles" });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", variant: "destructive", description: error.message });
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
            {isFolder
              ? "La carpeta se comprimirá como ZIP y se enviará directamente."
              : "El archivo se enviará tal como está (DOCX, XLSX, PDF, etc.)."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            onClick={handleShareViaWhatsApp}
            disabled={isAnyLoading}
            className="w-full gap-2 bg-[#16A34A] hover:bg-[#15803D] text-white"
          >
            {isActionLoading("whatsapp") ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <MessageCircle className="h-5 w-5" />
            )}
            Enviar por WhatsApp
          </Button>

          <Button
            onClick={handleShareViaEmail}
            disabled={isAnyLoading}
            className="w-full gap-2"
            variant="outline"
          >
            {isActionLoading("email") ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <Mail className="h-5 w-5" />
            )}
            Enviar por Correo
          </Button>

          <Button
            onClick={handleCopyLink}
            disabled={isAnyLoading}
            className="w-full gap-2"
            variant="secondary"
          >
            {isActionLoading("copy") ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <LinkIcon className="h-5 w-5" />
            )}
            Copiar enlace
          </Button>

          <div className="flex gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              WhatsApp enviará el {isFolder ? "ZIP de la carpeta" : "archivo"} directamente.
              En equipos de escritorio se descargará primero; adjúntalo en WhatsApp.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
