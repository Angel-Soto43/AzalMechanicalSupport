import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useRoute } from "wouter";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Folder,
  MoreVertical,
  Download,
  Upload,
  Trash2,
  Plus,
} from "lucide-react";
import { FileIcon, formatFileSize } from "@/components/file-icon";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function FolderPage() {
  const [, params] = useRoute("/folders/:id");
  const folderId = Number(params?.id);
  const { user } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [previewFile, setPreviewFile] = useState<any | null>(null);

  /* upload */
  const [contractId, setContractId] = useState("");
  const [provider, setProvider] = useState("");
  const [uploading, setUploading] = useState(false);

  /* ---------------- load ---------------- */

  const loadFolder = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/folders/${folderId}/content`, {
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
    if (!Number.isNaN(folderId)) loadFolder();
  }, [folderId]);

  /* ---------------- create folder ---------------- */

  const createFolder = async () => {
    const name = prompt("Nombre de la nueva carpeta");
    if (!name) return;

    await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, parentId: folderId }),
    });

    loadFolder();
  };

  /* ---------------- upload files ---------------- */

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!contractId || !provider) {
      alert("Completa ID de contrato y proveedor");
      return;
    }

    setUploading(true);

    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      form.append("contractId", contractId);
      form.append("provider", provider);
      form.append("folderId", String(folderId));

      await fetch("/api/files", {
        method: "POST",
        credentials: "include",
        body: form,
      });
    }

    setUploading(false);
    setContractId("");
    setProvider("");
    loadFolder();
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
            className="w-64"
          />
          {user?.isAdmin && (
            <Button onClick={createFolder}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva carpeta
            </Button>
          )}
        </div>
      </div>

      {/* Upload */}
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
              placeholder="Proveedor (Ej: Empresa XYZ S.A.)"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={(e) => {
                e.preventDefault();
                uploadFiles(e.dataTransfer.files);
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
              onChange={(e) => uploadFiles(e.target.files)}
            />

            {uploading && (
              <p className="text-sm text-muted-foreground">
                Subiendo archivos…
              </p>
            )}
          </CardContent>
        </Card>
      )}

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
                  <TableHead>Info</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Tamaño</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredFolders.map((folder: any) => (
                  <TableRow key={folder.id}>
                    <TableCell>
                      <Folder className="h-5 w-5 text-blue-500" />
                    </TableCell>
                    <TableCell
                      className="font-medium cursor-pointer"
                      onClick={() =>
                        (window.location.href = `/folders/${folder.id}`)
                      }
                    >
                      {folder.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      Carpeta
                    </TableCell>
                    <TableCell>
                      {format(new Date(folder.createdAt), "dd/MM/yyyy", {
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {folderSizes.has(folder.id)
                        ? formatFileSize(folderSizes.get(folder.id)!)
                        : "—"}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                ))}

                {filteredFiles.map((file: any) => (
                  <TableRow key={file.id}>
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
                    <TableCell>
                      {format(
                        new Date(file.uploadedAt),
                        "dd/MM/yyyy HH:mm",
                        { locale: es }
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatFileSize(file.size)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}













