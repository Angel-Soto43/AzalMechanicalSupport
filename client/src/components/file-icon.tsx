import {
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  FileVideo,
  FileAudio,
  File,
  Presentation,
  Cloud,
} from "lucide-react";

interface FileIconProps {
  mimeType: string;
  /** Nombre original del archivo para detectar por extensión */
  filename?: string;
  className?: string;
}

function getExt(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export function FileIcon({ mimeType, filename, className = "h-8 w-8" }: FileIconProps) {
  const ext = filename ? getExt(filename) : "";

  const getIconAndColor = () => {
    // ── Detección por extensión (prioridad) ────────────────────────────────
    if (ext === "log")                                    return { Icon: Cloud,           color: "text-[#0078D4]" }; // OneDrive azul
    if (ext === "txt")                                    return { Icon: FileText,         color: "text-slate-400" };
    if (["zip", "rar", "7z"].includes(ext))              return { Icon: FileArchive,      color: "text-[#F59E0B]" };
    if (["doc", "docx"].includes(ext))                   return { Icon: FileText,         color: "text-[#2563EB]" };
    if (["xls", "xlsx"].includes(ext))                   return { Icon: FileSpreadsheet,  color: "text-[#16A34A]" };
    if (ext === "pdf")                                    return { Icon: FileText,         color: "text-[#DC2626]" };
    if (["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(ext))
                                                          return { Icon: FileImage,        color: "text-[#8B5CF6]" };
    if (["ppt", "pptx"].includes(ext))                   return { Icon: Presentation,     color: "text-[#F59E0B]" };
    if (["mp4", "avi", "mov", "mkv", "wmv"].includes(ext)) return { Icon: FileVideo,     color: "text-[#DC2626]" };
    if (["mp3", "wav", "ogg", "flac"].includes(ext))     return { Icon: FileAudio,        color: "text-[#2563EB]" };

    // ── Detección por mimeType (fallback) ─────────────────────────────────
    if (mimeType.includes("pdf"))                                            return { Icon: FileText,        color: "text-[#DC2626]" };
    if (mimeType.includes("word")    || mimeType.includes("document"))       return { Icon: FileText,        color: "text-[#2563EB]" };
    if (mimeType.includes("excel")   || mimeType.includes("spreadsheet") || mimeType.includes("csv"))
                                                                             return { Icon: FileSpreadsheet, color: "text-[#16A34A]" };
    if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return { Icon: Presentation,  color: "text-[#F59E0B]" };
    if (mimeType.includes("image"))                                          return { Icon: FileImage,       color: "text-[#8B5CF6]" };
    if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar") || mimeType.includes("compressed"))
                                                                             return { Icon: FileArchive,     color: "text-[#F59E0B]" };
    if (mimeType.includes("video"))                                          return { Icon: FileVideo,       color: "text-[#DC2626]" };
    if (mimeType.includes("audio"))                                          return { Icon: FileAudio,       color: "text-[#2563EB]" };

    return { Icon: File, color: "text-muted-foreground" };
  };

  const { Icon, color } = getIconAndColor();
  return <Icon className={`${className} ${color}`} />;
}

export function getFileTypeName(mimeType: string, filename?: string): string {
  const ext = filename ? getExt(filename) : "";
  if (ext === "log")  return "LOG";
  if (ext === "txt")  return "TXT";
  if (ext === "7z")   return "7Z";
  if (ext === "rar")  return "RAR";
  if (ext === "zip")  return "ZIP";
  if (ext === "docx" || ext === "doc") return "Word";
  if (ext === "xlsx" || ext === "xls") return "Excel";
  if (ext === "pdf")  return "PDF";
  if (["png","jpg","jpeg","gif","webp","bmp"].includes(ext)) return ext.toUpperCase();

  if (mimeType.includes("pdf"))          return "PDF";
  if (mimeType.includes("word")    || mimeType.includes("document"))    return "Word";
  if (mimeType.includes("excel")   || mimeType.includes("spreadsheet")) return "Excel";
  if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "PowerPoint";
  if (mimeType.includes("image/png"))  return "PNG";
  if (mimeType.includes("image/jpeg") || mimeType.includes("image/jpg")) return "JPEG";
  if (mimeType.includes("image/gif"))  return "GIF";
  if (mimeType.includes("image/webp")) return "WebP";
  if (mimeType.includes("image"))      return "Imagen";
  if (mimeType.includes("zip"))  return "ZIP";
  if (mimeType.includes("rar"))  return "RAR";
  if (mimeType.includes("tar"))  return "TAR";
  if (mimeType.includes("video")) return "Video";
  if (mimeType.includes("audio")) return "Audio";
  return "Archivo";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
