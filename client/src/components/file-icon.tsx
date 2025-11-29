import {
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  FileVideo,
  FileAudio,
  File,
  Presentation,
} from "lucide-react";

interface FileIconProps {
  mimeType: string;
  className?: string;
}

export function FileIcon({ mimeType, className = "h-8 w-8" }: FileIconProps) {
  const getIconAndColor = (type: string) => {
    if (type.includes("pdf")) {
      return { Icon: FileText, color: "text-red-500" };
    }
    if (type.includes("word") || type.includes("document")) {
      return { Icon: FileText, color: "text-blue-500" };
    }
    if (type.includes("excel") || type.includes("spreadsheet") || type.includes("csv")) {
      return { Icon: FileSpreadsheet, color: "text-green-500" };
    }
    if (type.includes("powerpoint") || type.includes("presentation")) {
      return { Icon: Presentation, color: "text-orange-500" };
    }
    if (type.includes("image")) {
      return { Icon: FileImage, color: "text-purple-500" };
    }
    if (type.includes("zip") || type.includes("rar") || type.includes("tar") || type.includes("compressed")) {
      return { Icon: FileArchive, color: "text-yellow-600" };
    }
    if (type.includes("video")) {
      return { Icon: FileVideo, color: "text-pink-500" };
    }
    if (type.includes("audio")) {
      return { Icon: FileAudio, color: "text-indigo-500" };
    }
    return { Icon: File, color: "text-muted-foreground" };
  };

  const { Icon, color } = getIconAndColor(mimeType);

  return <Icon className={`${className} ${color}`} />;
}

export function getFileTypeName(mimeType: string): string {
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("word") || mimeType.includes("document")) return "Word";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "Excel";
  if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "PowerPoint";
  if (mimeType.includes("image/png")) return "PNG";
  if (mimeType.includes("image/jpeg") || mimeType.includes("image/jpg")) return "JPEG";
  if (mimeType.includes("image/gif")) return "GIF";
  if (mimeType.includes("image/webp")) return "WebP";
  if (mimeType.includes("image")) return "Imagen";
  if (mimeType.includes("zip")) return "ZIP";
  if (mimeType.includes("rar")) return "RAR";
  if (mimeType.includes("tar")) return "TAR";
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
