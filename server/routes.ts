import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireAdmin, hashPassword } from "./auth";
import { createUserSchema, updateUserSchema, type Folder, type File } from "@shared/schema";
import multer from "multer";
import path from "path";
import archiver from "archiver";
import { db } from "./db";
import { folders } from "@shared/schema";
import { eq } from "drizzle-orm";

// ========== Helper Functions ==========

/**
 * Sanitizes a filename by removing/replacing potentially problematic characters
 * while preserving the file extension and making it visible to users
 */
function sanitizeFileName(originalName: string): string {
  // Remove path separators and null characters
  let sanitized = originalName
    .replace(/[\\/:\*\?"<>\|]/g, "_")  // Replace Windows/Unix problematic chars
    .replace(/\0/g, "")                // Remove null characters
    .replace(/^\s+|\s+$/g, "");         // Trim whitespace

  // Ensure filename is not empty
  if (!sanitized || sanitized.length === 0) {
    sanitized = "archivo_sin_nombre";
  }

  // Limit filename length while preserving extension
  const ext = path.extname(sanitized);
  const nameWithoutExt = sanitized.slice(0, sanitized.length - ext.length);
  const maxLength = 255 - ext.length - 1;
  
  if (nameWithoutExt.length > maxLength) {
    return nameWithoutExt.slice(0, maxLength) + ext;
  }

  return sanitized;
}

/**
 * Safely validates and cleans folder names
 */
function sanitizeFolderName(name: string): string {
  // Trim whitespace
  const trimmed = name.trim();
  
  // Remove problematic path characters
  const sanitized = trimmed
    .replace(/[\\/:\*\?"<>\|]/g, "_")
    .replace(/^\s+|\s+$/g, "");
  
  return sanitized;
}
// Configure multer with memory storage (no disk files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/zip",
      "application/x-zip-compressed",
      "application/x-rar-compressed",
      "application/x-tar",
      "application/gzip",
    ];
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido"));
    }
  },
});
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Helper to get user info with files
  const enrichFilesWithUploader = async (files: any[]) => {
    const userIds = [...new Set(files.map((f) => f.uploadedBy))];
    const users = await Promise.all(userIds.map((id) => storage.getUser(id)));
    const userMap = new Map(users.filter(Boolean).map((u) => [u!.id, u!]));

    return files.map((file) => ({
      ...file,
      uploaderName: userMap.get(file.uploadedBy)?.fullName || "Usuario desconocido",
    }));
  };

  // Helper to add folder path to files
  const enrichFilesWithFolderPath = async (files: any[]) => {
    const enriched = await Promise.all(
      files.map(async (file) => {
        if (!file.folderId) {
          return { ...file, folderPath: "Raíz" };
        }
        try {
          const path = await storage.getFolderPath(file.folderId);
          const pathStr = path.map((f) => f.name).join("/");
          return { ...file, folderPath: pathStr || "Raíz" };
        } catch {
          return { ...file, folderPath: "Carpeta desconocida" };
        }
      })
    );
    return enriched;
  };

  const enrichFoldersWithCreator = async (folderList: any[]) => {
    if (!folderList || folderList.length === 0) {
      return [];
    }
    try {
      const userIds = [...new Set(folderList.map((f) => f.userId).filter(Boolean))];
      const users = await Promise.all(userIds.map((id) => storage.getUser(id)));
      const userMap = new Map(users.filter(Boolean).map((u) => [u!.id, u!]));

      return folderList.map((folder) => ({
        ...folder,
        creatorName: userMap.get(folder.userId)?.fullName || "Usuario desconocido",
      }));
    } catch (err) {
      console.error("Error enriching folders:", err);
      return folderList;
    }
  };

  const enrichLogsWithUser = async (logs: any[]) => {
    const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))];
    const users = await Promise.all(userIds.map((id) => storage.getUser(id)));
    const userMap = new Map(users.filter(Boolean).map((u) => [u!.id, u!]));

    return logs.map((log) => ({
      ...log,
      userName: log.userId ? userMap.get(log.userId)?.fullName || "Usuario eliminado" : "Sistema",
    }));
  };

  // ============ Stats Routes ============
  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).send("Error al obtener estadísticas");
    }
  });

  // ============ Folder Routes ============
  // Obtener archivos de una carpeta
  app.get("/api/folders/:id/files", requireAuth, async (req, res) => {
    try {
      const folderId = Number(req.params.id);

      if (isNaN(folderId)) {
        return res.status(400).json({ error: "ID de carpeta inválido" });
      }

      const files = await storage.getFilesByFolder(folderId);
      const enrichedFiles = await enrichFilesWithUploader(files || []);
      res.json(enrichedFiles || []);
    } catch (error) {
      console.error("Error fetching files by folder:", error);
      res.status(500).json({ error: "Error al obtener archivos de la carpeta" });
    }
  });
  // Obtener contenido completo de una carpeta (subcarpetas + archivos)
app.get("/api/folders/:id/content", requireAuth, async (req, res) => {
  try {
    const folderId = Number(req.params.id);
    console.log(`[FOLDER CONTENT] Fetching folder ${folderId}`);

    if (isNaN(folderId)) {
      console.log(`[FOLDER CONTENT] Invalid folder ID: ${req.params.id}`);
      return res.status(400).json({ error: "ID de carpeta inválido" });
    }

    let folder;
    try {
      folder = await storage.getFolderById(folderId);
      console.log(`[FOLDER CONTENT] Got folder:`, folder?.name || "null");
    } catch (err) {
      console.error(`[FOLDER CONTENT] Error getting folder:`, err);
      throw err;
    }
    
    if (!folder) {
      console.log(`[FOLDER CONTENT] Folder ${folderId} not found`);
      return res.status(404).json({ error: "Carpeta no encontrada" });
    }

    // Get creator info
    let creatorName = "Usuario desconocido";
    try {
      const creator = await storage.getUser(folder.userId);
      creatorName = creator?.fullName ?? "Usuario desconocido";
      console.log(`[FOLDER CONTENT] Creator: ${creatorName}`);
    } catch (userErr) {
      console.error("[FOLDER CONTENT] Error fetching folder creator:", userErr);
    }

    // Get subfolders
    let folders: Folder[] = [];
    try {
      console.log(`[FOLDER CONTENT] Getting subfolders...`);
      folders = await storage.getFoldersByParent(folderId);
      console.log(`[FOLDER CONTENT] Got ${folders?.length || 0} subfolders`);
    } catch (err) {
      console.error(`[FOLDER CONTENT] Error getting subfolders:`, err);
      folders = [];
    }

    let enrichedFolders: any[] = [];
    try {
      enrichedFolders = await enrichFoldersWithCreator(folders || []);
      console.log(`[FOLDER CONTENT] Enriched ${enrichedFolders?.length || 0} subfolders`);
    } catch (err) {
      console.error(`[FOLDER CONTENT] Error enriching subfolders:`, err);
      enrichedFolders = folders || [];
    }

    // Get files
    let files: File[] = [];
    try {
      console.log(`[FOLDER CONTENT] Getting files...`);
      files = await storage.getFilesByFolder(folderId);
      console.log(`[FOLDER CONTENT] Got ${files?.length || 0} files`);
    } catch (err) {
      console.error(`[FOLDER CONTENT] Error getting files:`, err);
      files = [];
    }

    let enrichedFiles: any[] = [];
    try {
      enrichedFiles = await enrichFilesWithUploader(files || []);
      console.log(`[FOLDER CONTENT] Enriched ${enrichedFiles?.length || 0} files`);
    } catch (err) {
      console.error(`[FOLDER CONTENT] Error enriching files:`, err);
      enrichedFiles = files || [];
    }

    // Get folder path
    let folderPath: any[] = [];
    try {
      console.log(`[FOLDER CONTENT] Getting folder path...`);
      folderPath = await storage.getFolderPath(folderId);
      console.log(`[FOLDER CONTENT] Got folder path with ${folderPath?.length || 0} levels`);
    } catch (err) {
      console.error(`[FOLDER CONTENT] Error getting folder path:`, err);
      folderPath = [];
    }
    
    const response = {
      folder: {
        ...folder,
        creatorName,
      },
      path: folderPath || [],
      folders: enrichedFolders || [],
      files: enrichedFiles || [],
    };
    
    console.log(`[FOLDER CONTENT] Returning response for folder ${folderId}`);
    res.json(response);

  } catch (error) {
    console.error("[FOLDER CONTENT] Unhandled error:", error);
    res.status(500).json({ error: "Error al obtener contenido de la carpeta", details: (error as any)?.message });
  }
});

  // Obtener carpetas raíz (nivel superior)
  app.get("/api/folders/root", requireAuth, async (req, res) => {
    try {
      const folders = await storage.getRootFolders();
      if (!folders || !Array.isArray(folders)) {
        return res.json([]);
      }
      const enrichedFolders = await enrichFoldersWithCreator(folders);
      res.json(enrichedFolders || []);
    } catch (error) {
      console.error("Error fetching root folders:", error);
      res.status(500).json({ error: "Error al obtener carpetas raíz" });
    }
  });

  // Obtener subcarpetas por parentId
  app.get("/api/folders/:id/children", requireAuth, async (req, res) => {
    try {
      const parentId = Number(req.params.id);
      if (isNaN(parentId)) {
        return res.status(400).json({ error: "ID de carpeta padre inválido" });
      }
      const folders = await storage.getFoldersByParent(parentId);
      const enrichedFolders = await enrichFoldersWithCreator(folders || []);
      res.json(enrichedFolders || []);
    } catch (error) {
      console.error("Error fetching child folders:", error);
      res.status(500).json({ error: "Error al obtener subcarpetas" });
    }
  });

  // Crear carpeta
  app.post("/api/folders", requireAdmin, async (req, res) => {
    try {
      const { name, parentId } = req.body;

      // Validate name exists and is a string
      if (!name || typeof name !== "string") {
        return res.status(400).send("El nombre de la carpeta es obligatorio");
      }

      // Trim and validate name is not empty or only spaces
      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        return res.status(400).send("El nombre de la carpeta no puede estar vacío o contener solo espacios");
      }

      // Validate name length
      if (trimmedName.length > 255) {
        return res.status(400).send("El nombre de la carpeta es demasiado largo (máximo 255 caracteres)");
      }

      // Sanitize folder name
      const sanitizedName = sanitizeFolderName(trimmedName);
      if (sanitizedName.length === 0) {
        return res.status(400).send("El nombre de la carpeta contiene solo caracteres inválidos");
      }

      const folder = await storage.createFolder({
        name: sanitizedName,
        parentId: parentId ?? null,
        userId: req.user!.id,
      });

      // Log
      await storage.createAuditLog({
        userId: req.user!.id,
        action: "folder_created",
        resourceType: "folder",
        resourceId: folder.id,
        details: `Carpeta creada: ${sanitizedName}`,
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
      });

      res.status(201).json(folder);
    } catch (error) {
      console.error("Error creating folder:", error);
      res.status(500).send("Error al crear carpeta. Por favor, intente nuevamente.");
    }
  });

// Renombrar carpeta
app.patch("/api/folders/:id", requireAdmin, async (req, res) => {
  try {
    const folderId = Number(req.params.id);
    const { name } = req.body;

    // Validate folder ID
    if (isNaN(folderId) || folderId <= 0) {
      return res.status(400).send("ID de carpeta inválido");
    }

    // Validate name exists
    if (!name || typeof name !== "string") {
      return res.status(400).send("El nombre de la carpeta es requerido");
    }

    // Validate name is not empty or only spaces
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return res.status(400).send("El nombre de la carpeta no puede estar vacío o contener solo espacios");
    }

    // Validate name length (max 255 chars)
    if (trimmedName.length > 255) {
      return res.status(400).send("El nombre de la carpeta es demasiado largo (máximo 255 caracteres)");
    }

    // Sanitize folder name (remove dangerous characters)
    const sanitizedName = sanitizeFolderName(trimmedName);
    
    if (sanitizedName.length === 0) {
      return res.status(400).send("El nombre de la carpeta no puede contener solo caracteres inválidos");
    }

    const folder = await storage.getFolderById(folderId);
    if (!folder) {
      return res.status(404).send("Carpeta no encontrada");
    }

    const updatedFolder = await storage.updateFolder(folderId, { name: sanitizedName });

    // Log folder rename action
    await storage.createAuditLog({
      userId: req.user!.id,
      action: "folder_renamed",
      resourceType: "folder",
      resourceId: folderId,
      details: `Carpeta renombrada: "${folder.name}" → "${sanitizedName}"`,
      ipAddress: req.ip || req.socket?.remoteAddress || "unknown",
      userAgent: req.get("User-Agent") || "unknown",
    });

    res.json(updatedFolder);
  } catch (error) {
    console.error("Error renaming folder:", error);
    res.status(500).send("Error al renombrar carpeta. Por favor, intente nuevamente.");
  }
});

// Eliminar carpeta (admin) — eliminación recursiva
app.delete("/api/folders/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id) || id <= 0) {
      return res.status(400).send("ID de carpeta inválido");
    }
    
    const folder = await storage.getFolderById(id);
    if (!folder) {
      return res.status(404).send("Carpeta no encontrada");
    }
    
    await storage.deleteFolder(id, req.user!.id);

    await storage.createAuditLog({
      userId: req.user!.id,
      action: "folder_deleted",
      resourceType: "folder",
      resourceId: id,
      details: `Carpeta eliminada (recursivo): ${folder.name}`,
      ipAddress: req.ip || req.socket?.remoteAddress || "unknown",
      userAgent: req.get("User-Agent") || "unknown",
    });

    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting folder:", error);
    res.status(500).send("Error al eliminar carpeta. Por favor, intente nuevamente.");
  }
});

  // ============ File Routes ============

  // Get current user's files
  app.get("/api/files/my", requireAuth, async (req, res) => {
    try {
      const files = await storage.getFilesByUser(req.user!.id);
      const enrichedWithUploader = await enrichFilesWithUploader(files);
      const enrichedWithPath = await enrichFilesWithFolderPath(enrichedWithUploader);
      res.json(enrichedWithPath);
    } catch (error) {
      console.error("Error fetching user files:", error);
      res.status(500).send("Error al obtener archivos");
    }
  });

  // Get all files (admin only)
  app.get("/api/files/all", requireAdmin, async (req, res) => {
    try {
      const files = await storage.getAllFiles();
      const enrichedFiles = await enrichFilesWithUploader(files);
      res.json(enrichedFiles);
    } catch (error) {
      console.error("Error fetching all files:", error);
      res.status(500).send("Error al obtener archivos");
    }
  });

  // Get recent files
  app.get("/api/files/recent", requireAuth, async (req, res) => {
    try {
      let files;
      if (req.user!.isAdmin) {
        files = await storage.getRecentFiles(10);
      } else {
        const userFiles = await storage.getFilesByUser(req.user!.id);
        files = userFiles.slice(0, 10);
      }
      const enrichedFiles = await enrichFilesWithUploader(files);
      res.json(enrichedFiles);
    } catch (error) {
      console.error("Error fetching recent files:", error);
      res.status(500).send("Error al obtener archivos recientes");
    }
  });

  // Get shared files (files from other users)
  app.get("/api/files/shared", requireAuth, async (req, res) => {
    try {
      const allFiles = await storage.getAllFiles();
      // Filter out files uploaded by the current user
      const sharedFiles = allFiles.filter(f => f.uploadedBy !== req.user!.id);
      const enrichedFiles = await enrichFilesWithUploader(sharedFiles);
      res.json(enrichedFiles);
    } catch (error) {
      console.error("Error fetching shared files:", error);
      res.status(500).send("Error al obtener archivos compartidos");
    }
  });

  // Upload file
  app.post("/api/files/upload", requireAuth, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send("No se proporcionó ningún archivo");
      }

      const { contractId, supplier, folderId } = req.body;
      
      // Validate required fields
      if (!contractId || typeof contractId !== "string" || contractId.trim().length === 0) {
        return res.status(400).send("El ID de contrato es requerido y no puede estar vacío");
      }
      if (!supplier || typeof supplier !== "string" || supplier.trim().length === 0) {
        return res.status(400).send("El proveedor es requerido y no puede estar vacío");
      }

      // Check for duplicate contractId at application level
      try {
        const existingFile = await storage.getFileByContractId(contractId);
        if (existingFile) {
          return res.status(409).send("El ID de contrato ya está registrado. Debe ingresar un ID único.");
        }
      } catch (err) {
        console.error("Error checking for duplicate contractId:", err);
      }

      // Leer buffer del archivo subido (asumir req.file.buffer)
      const sanitizedOriginalName = sanitizeFileName(req.file.originalname);
      try {
        const file = await storage.createFile({
          contractId: contractId.trim(),
          supplier: supplier.trim(),
          folderId: folderId ? Number(folderId) : null,
          filename: sanitizedOriginalName,
          originalName: sanitizedOriginalName,
          mimeType: req.file.mimetype,
          size: req.file.size,
          archivo: req.file.buffer,
          uploadedBy: req.user!.id,
          previousVersionId: null,
        });

        // Log upload action only after successful creation
        await storage.createAuditLog({
          userId: req.user!.id,
          action: "upload",
          resourceType: "file",
          resourceId: file.id,
          details: `Archivo subido: ${sanitizedOriginalName} (Contrato: ${contractId.trim()}, Proveedor: ${supplier.trim()})`,
          ipAddress: req.ip || req.socket.remoteAddress || "unknown",
          userAgent: req.get("User-Agent") || "unknown",
        });

        const enrichedFiles = await enrichFilesWithUploader([file]);
        res.status(201).json(enrichedFiles[0]);
      } catch (dbError: any) {
        console.error("Database error during file creation:", dbError);
        
        // No hay archivo físico que limpiar

        // Check if it's a unique constraint violation on contractId
        if (dbError.code === "23505" || dbError.message?.includes("unique")) {
          return res.status(409).send("El ID de contrato ya está registrado. Debe ingresar un ID único.");
        }

        res.status(500).send("Error al procesar la subida del archivo. Por favor, intente nuevamente.");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      // No hay archivo físico que limpiar
      res.status(500).send("Error al subir archivo");
    }
  });

  // Update file version (reemplazar archivo) - usuarios autenticados
  app.post("/api/files/:id/version", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    const existingFile = await storage.getFile(fileId);

    if (!existingFile) {
      return res.status(404).send("Archivo no encontrado");
    }
    if (!req.file) {
      return res.status(400).send("No se proporcionó ningún archivo para el reemplazo");
    }

    // Sanitize the new filename
    const sanitizedOriginalName = sanitizeFileName(req.file.originalname);
    
    // Create new file record for replacement. Do NOT keep previous version linked.
    const newFile = await storage.createFile({
      contractId: existingFile.contractId,
      supplier: existingFile.supplier,
      folderId: existingFile.folderId,
      filename: sanitizedOriginalName,
      originalName: sanitizedOriginalName,
      mimeType: req.file.mimetype,
      size: req.file.size,
      archivo: req.file.buffer,
      uploadedBy: req.user!.id,
      previousVersionId: null,
    });

    // Ensure version increments for display consistency
    try {
      await storage.updateFile(newFile.id, { version: (existingFile.version || 1) + 1 });
    } catch (err) {
      console.error("Failed to update version on new file:", err);
    }

    // Permanently remove the previous version (both DB record and disk file)
    try {
      await storage.removeFilePermanently(existingFile.id);
    } catch (err) {
      console.error("Failed to permanently remove previous version:", err);
    }

    // Log replacement action (changed from "upload_version" to "replacement")
    await storage.createAuditLog({
      userId: req.user!.id,
      action: "replacement",
      resourceType: "file",
      resourceId: newFile.id,
      details: `Archivo reemplazado: ${sanitizedOriginalName} (Reemplazó a: ${existingFile.originalName})`,
      ipAddress: req.ip || req.socket?.remoteAddress || "unknown",
      userAgent: req.get("User-Agent") || "unknown",
    });

    res.status(201).json(newFile);
  } catch (error) {
    console.error("Error updating file version:", error);
    // No hay archivo físico que limpiar
    res.status(500).send("Error al reemplazar archivo. Por favor, intente nuevamente.");
  }
});
// Obtener historial de versiones de un archivo
app.get("/api/files/:id/versions", requireAuth, async (req, res) => {
  try {
    const fileId = Number(req.params.id);

    if (isNaN(fileId)) {
      return res.status(400).send("ID de archivo inválido");
    }

    const file = await storage.getFile(fileId);

    if (!file) {
      return res.status(404).send("Archivo no encontrado");
    }

    const versions = await storage.getFileVersions(fileId);

    res.json(versions);
  } catch (error) {
    console.error("Error obteniendo versiones:", error);
    res.status(500).send("Error al obtener versiones del archivo");
  }
});

 
  app.get("/api/files/:id/download", requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);

      if (!file) {
        return res.status(404).send("Archivo no encontrado");
      }

      if (!file.archivo || !(file.archivo instanceof Buffer)) {
        return res.status(404).send("Archivo no encontrado en la base de datos");
      }
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename=\"${file.originalName}\"`);
      res.setHeader("Content-Length", file.size);
      res.end(file.archivo, "binary");
      try {
        await storage.createAuditLog({
          userId: req.user!.id,
          action: "download",
          resourceType: "file",
          resourceId: file.id,
          details: `Descarga exitosa: ${file.originalName}`,
          ipAddress: req.ip || req.socket.remoteAddress || "unknown",
          userAgent: req.get("User-Agent") || "unknown",
        });
      } catch (auditErr) {
        console.error("Failed to log download audit:", auditErr);
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).send("Error al descargar archivo. Por favor, intente nuevamente.");
    }
  });

  
  app.get("/api/files/:id/preview", requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);

      if (!file) {
        return res.status(404).send("Archivo no encontrado");
      }

      if (!file.archivo || !(file.archivo instanceof Buffer)) {
        return res.status(404).send("Archivo no encontrado en la base de datos");
      }
      await storage.createAuditLog({
        userId: req.user!.id,
        action: "preview",
        resourceType: "file",
        resourceId: file.id,
        details: `Vista previa: ${file.originalName}`,
        ipAddress: req.ip || req.socket?.remoteAddress || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
      });
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Disposition", `inline; filename=\"${file.originalName}\"`);
      res.end(file.archivo, "binary");
    } catch (error) {
      console.error("Error previewing file:", error);
      res.status(500).send("Error al previsualizar archivo");
    }
  });
  
app.patch("/api/files/:id/move", requireAdmin, async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    const { folderId } = req.body;

    // Validate fileId
    if (isNaN(fileId) || fileId <= 0) {
      return res.status(400).send("ID de archivo inválido");
    }

    // Validate folderId is provided and valid
    if (folderId === undefined || folderId === null) {
      return res.status(400).send("ID de carpeta es requerido");
    }

    if (!Number.isInteger(folderId) || folderId <= 0) {
      return res.status(400).send("ID de carpeta inválido");
    }

    const file = await storage.getFile(fileId);
    if (!file) {
      return res.status(404).send("Archivo no encontrado");
    }

    // Verify target folder exists
    const targetFolder = await storage.getFolderById(folderId);
    if (!targetFolder) {
      return res.status(404).send("Carpeta destino no encontrada");
    }

    await storage.updateFile(fileId, {
      folderId: folderId,
    });

    await storage.createAuditLog({
      userId: req.user!.id,
      action: "move",
      resourceType: "file",
      resourceId: fileId,
      details: `Archivo movido: ${file.originalName} → carpeta "${targetFolder.name}"`,
      ipAddress: req.ip || "unknown",
      userAgent: req.get("User-Agent") || "unknown",
    });

    res.json({ success: true, message: "Archivo movido exitosamente" });
  } catch (error) {
    console.error("Error moving file:", error);
    res.status(500).send("Error al mover archivo. Por favor, intente nuevamente.");
  }
});

  
  app.delete("/api/files/:id", requireAdmin, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      
      if (isNaN(fileId) || fileId <= 0) {
        return res.status(400).send("ID de archivo inválido");
      }

      const file = await storage.getFile(fileId);

      if (!file) {
        return res.status(404).send("Archivo no encontrado");
      }

      await storage.deleteFile(fileId, req.user!.id);

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "delete",
        resourceType: "file",
        resourceId: file.id,
        details: `Archivo eliminado: ${file.originalName} (Contrato: ${file.contractId})`,
        ipAddress: req.ip || req.socket.remoteAddress || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
      });

      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).send("Error al eliminar archivo. Por favor, intente nuevamente.");
    }
  });

  
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      
      const usersWithoutPasswords = allUsers.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).send("Error al obtener usuarios");
    }
  });

  
  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const validation = createUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).send(validation.error.errors[0].message);
      }

      const data = validation.data as any;
      const username = data.username;
      const password = data.password;
      const fullName = data.fullName;
      const isAdmin = data.isAdmin ?? false;
      const isActive = data.isActive ?? true;

      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).send("El nombre de usuario ya existe");
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        fullName,
        isAdmin: isAdmin ?? false,
        isActive: isActive ?? true,
      });

      
      await storage.createAuditLog({
        userId: req.user!.id,
        action: "user_created",
        resourceType: "user",
        resourceId: user.id,
        details: `Usuario creado: ${user.fullName} (@${user.username})`,
        ipAddress: req.ip || req.socket.remoteAddress || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
      });

      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).send("Error al crear usuario");
    }
  });

  
  app.patch("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const existingUser = await storage.getUser(userId);

      if (!existingUser) {
        return res.status(404).send("Usuario no encontrado");
      }

      const validation = updateUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).send(validation.error.errors[0].message);
      }

      const updateData: any = {};

      if (validation.data.fullName) {
        updateData.fullName = validation.data.fullName;
      }

      if (typeof validation.data.isActive === "boolean") {
        updateData.isActive = validation.data.isActive;
      }

      if (validation.data.password) {
        updateData.password = await hashPassword(validation.data.password);
      }

      const updatedUser = await storage.updateUser(userId, updateData);

      
      await storage.createAuditLog({
        userId: req.user!.id,
        action: "user_updated",
        resourceType: "user",
        resourceId: userId,
        details: `Usuario actualizado: ${existingUser.fullName}`,
        ipAddress: req.ip || req.socket.remoteAddress || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
      });

      if (updatedUser) {
        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
      } else {
        res.status(404).send("Usuario no encontrado");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).send("Error al actualizar usuario");
    }
  });

  
  app.get("/api/audit-logs", requireAdmin, async (req, res) => {
    try {
      const logs = await storage.getAuditLogs();
      const enrichedLogs = await enrichLogsWithUser(logs);
      res.json(enrichedLogs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).send("Error al obtener registros de auditoría");
    }
  });

  
  app.get("/api/audit-logs/recent", requireAuth, async (req, res) => {
    try {
      const logs = await storage.getRecentAuditLogs(10);
      const enrichedLogs = await enrichLogsWithUser(logs);
      res.json(enrichedLogs);
    } catch (error) {
      console.error("Error fetching recent audit logs:", error);
      res.status(500).send("Error al obtener registros recientes");
    }
  });

  // Log share action (for audit)
  app.post("/api/share/log", requireAuth, async (req, res) => {
    try {
      const { type, resourceType, resourceId, resourceName } = req.body;
      if (!type || !resourceType) {
        return res.status(400).send("Faltan datos");
      }
      await storage.createAuditLog({
        userId: req.user!.id,
        action: type === "file" ? "file_shared" : "folder_shared",
        resourceType,
        resourceId: resourceId ?? null,
        details: resourceName ? `Compartido: ${resourceName}` : "Recurso compartido",
        ipAddress: req.ip || req.socket?.remoteAddress || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
      });
      res.sendStatus(204);
    } catch (error) {
      console.error("Error logging share:", error);
      res.status(500).send("Error");
    }
  });

  // ============ Backup (Admin only) ============
  app.get("/api/backup", requireAdmin, async (req, res) => {
    try {
      const range = (req.query.range as string) || "month";
      const startParam = req.query.start as string;
      const endParam = req.query.end as string;

      const now = new Date();
      let startDate: Date;
      let endDate: Date = new Date(now);

      switch (range) {
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case "lastYear":
          startDate = new Date(now.getFullYear() - 1, 0, 1);
          endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "week":
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "custom":
          if (!startParam || !endParam) {
            return res.status(400).send("Rango personalizado requiere start y end (YYYY-MM-DD)");
          }
          startDate = new Date(startParam + "T00:00:00");
          endDate = new Date(endParam + "T23:59:59");
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).send("Formato de fecha inválido. Use YYYY-MM-DD");
          }
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const fileList = await storage.getFilesByDateRange(startDate, endDate);
      const latestFiles = fileList.filter(
        (f) => !fileList.some((o) => o.previousVersionId === f.id)
      );

      const label = range === "custom"
        ? `backup-${startParam}-${endParam}`
        : `backup-${range}-${now.toISOString().slice(0, 10)}`;

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${label}.zip"`);

      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.on("error", (err: Error) => {
        console.error("Backup archive error:", err);
        res.status(500).send("Error al generar respaldo");
      });
      archive.pipe(res);

      // Incluir estructura de carpetas en el respaldo
      for (const file of latestFiles) {
        if (!file.archivo || !(file.archivo instanceof Buffer)) continue;
        let entryPath = file.originalName;
        if (file.folderId) {
          const folderPath = await storage.getFolderPath(file.folderId);
          if (folderPath.length > 0) {
            const pathParts = folderPath.map((f) => f.name).concat(file.originalName);
            entryPath = pathParts.join("/");
          }
        }
        archive.append(file.archivo, { name: entryPath });
      }

      await archive.finalize();

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "backup_executed",
        resourceType: "backup",
        resourceId: null,
        details: `Respaldo ejecutado: ${range} (${latestFiles.length} archivos)`,
        ipAddress: req.ip || req.socket?.remoteAddress || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
      });
    } catch (error) {
      console.error("Error generating backup:", error);
      res.status(500).send("Error al generar respaldo");
    }
  });

  return httpServer;
}
