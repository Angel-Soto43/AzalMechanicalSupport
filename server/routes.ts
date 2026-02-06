import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireAdmin, hashPassword } from "./auth";
import { createUserSchema, updateUserSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "./db";
import { folders } from "@shared/schema";
import { eq } from "drizzle-orm";



// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    },
  }),
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
        return res.status(400).send("ID de carpeta inválido");
      }

      const files = await storage.getFilesByFolder(folderId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching files by folder:", error);
      res.status(500).send("Error al obtener archivos de la carpeta");
    }
  });
  // Obtener contenido completo de una carpeta (subcarpetas + archivos)
app.get("/api/folders/:id/content", requireAuth, async (req, res) => {
  try {
    const folderId = Number(req.params.id);

    if (isNaN(folderId)) {
      return res.status(400).send("ID de carpeta inválido");
    }

    const folder = await storage.getFolderById(folderId);
    if (!folder) {
      return res.status(404).send("Carpeta no encontrada");
    }

    const folders = await storage.getFoldersByParent(folderId);
    const files = await storage.getFilesByFolder(folderId);
    const path = await storage.getFolderPath(folderId);
    res.json({
      folder,
      path,
      folders,
      files,
    });

  } catch (error) {
    console.error("Error fetching folder content:", error);
    res.status(500).send("Error al obtener contenido de la carpeta");
  }
});

  // Obtener carpetas raíz (nivel superior)
  app.get("/api/folders/root", requireAuth, async (req, res) => {
    try {
      const folders = await storage.getRootFolders();
      res.json(folders);
    } catch (error) {
      console.error("Error fetching root folders:", error);
      res.status(500).send("Error al obtener carpetas raíz");
    }
  });

  // Obtener subcarpetas por parentId
  app.get("/api/folders/:parentId", requireAuth, async (req, res) => {
    try {
      const parentId = Number(req.params.parentId);
      const folders = await storage.getFoldersByParent(parentId);
      res.json(folders);
    } catch (error) {
      console.error("Error fetching child folders:", error);
      res.status(500).send("Error al obtener subcarpetas");
    }
  });

  // Crear carpeta
  app.post("/api/folders", requireAdmin, async (req, res) => {
    try {
      const { name, parentId } = req.body;

      if (!name) {
        return res.status(400).send("El nombre de la carpeta es obligatorio");
      }

    const folder = await storage.createFolder({
      name,
      parentId: parentId ?? null,
      userId: req.user!.id,
    });

    // Log
    await storage.createAuditLog({
      userId: req.user!.id,
      action: "folder_created",
      resourceType: "folder",
      resourceId: folder.id,
      details: `Carpeta creada: ${folder.name}`,
      ipAddress: req.ip || "unknown",
      userAgent: req.get("User-Agent") || "unknown",
    });

    res.status(201).json(folder);
  } catch (error) {
    console.error("Error creating folder:", error);
    res.status(500).send("Error al crear carpeta");
  }
});

// Eliminar carpeta (admin)
app.delete("/api/folders/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await storage.deleteFolder(id);
    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting folder:", error);
    res.status(500).send("Error al eliminar carpeta");
  }
});

  // ============ File Routes ============

  // Get current user's files
  app.get("/api/files/my", requireAuth, async (req, res) => {
    try {
      const files = await storage.getFilesByUser(req.user!.id);
      const enrichedFiles = await enrichFilesWithUploader(files);
      res.json(enrichedFiles);
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
      if (!contractId) {
        fs.unlinkSync(req.file.path);
        return res.status(400).send("El ID de contrato es requerido");
      }

      if (!supplier) {
        fs.unlinkSync(req.file.path);
        return res.status(400).send("El proveedor es requerido");
      }

      const file = await storage.createFile({
        contractId,
        supplier,
        folderId: folderId ? Number(folderId) : null,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedBy: req.user!.id,
        previousVersionId: null,
      });

      // Log upload action
      await storage.createAuditLog({
        userId: req.user!.id,
        action: "upload",
        resourceType: "file",
        resourceId: file.id,
        details: `Archivo subido: ${file.originalName} (Contrato: ${contractId}, Proveedor: ${supplier})`,
        ipAddress: req.ip || req.socket.remoteAddress || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
      });

      const enrichedFiles = await enrichFilesWithUploader([file]);
      res.status(201).json(enrichedFiles[0]);
    } catch (error) {
      console.error("Error uploading file:", error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).send("Error al subir archivo");
    }
  });

  // Update file version
  app.post("/api/files/:id/version", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    const existingFile = await storage.getFile(fileId);

    if (!existingFile) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).send("Archivo no encontrado");
    }

    // Permisos: dueño o admin
    if (existingFile.uploadedBy !== req.user!.id && !req.user!.isAdmin) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).send("No tienes permiso para actualizar este archivo");
    }

    if (!req.file) {
      return res.status(400).send("No se proporcionó ningún archivo");
    }

    
    const newFile = await storage.createFile({
      contractId: existingFile.contractId,
      supplier: existingFile.supplier,
      folderId: existingFile.folderId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user!.id,
      previousVersionId: existingFile.id, 
    });

    // Log
    await storage.createAuditLog({
      userId: req.user!.id,
      action: "upload_version",
      resourceType: "file",
      resourceId: newFile.id,
      details: `Nueva versión de ${existingFile.originalName}`,
      ipAddress: req.ip || "unknown",
      userAgent: req.get("User-Agent") || "unknown",
    });

    res.status(201).json(newFile);
  } catch (error) {
    console.error("Error updating file version:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).send("Error al actualizar versión");
  }
});
// Obtener historial de versiones de un archivo
app.get("/api/files/:id/versions", requireAuth, async (req, res) => {
  try {
    console.log("➡️ GET /api/files/:id/versions");
    console.log("📥 req.params.id =", req.params.id);

    const fileId = Number(req.params.id);
    console.log("🔢 fileId convertido =", fileId);

    if (isNaN(fileId)) {
      console.log("❌ fileId NO es un número");
      return res.status(400).send("ID de archivo inválido");
    }

    console.log("🔍 Buscando archivo principal con id =", fileId);
    const file = await storage.getFile(fileId);
    console.log("📄 Archivo encontrado =", file);

    if (!file) {
      console.log("❌ No existe archivo con ese ID");
      return res.status(404).send("Archivo no encontrado");
    }

    console.log("🧬 Buscando versiones del archivo id =", fileId);
    const versions = await storage.getFileVersions(fileId);
    console.log("📚 Versiones encontradas =", versions);

    res.json(versions);
  } catch (error) {
    console.error("🔥 Error obteniendo versiones:", error);
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

      const filePath = path.join(UPLOADS_DIR, file.filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).send("Archivo no encontrado en el servidor");
      }

      
      await storage.createAuditLog({
        userId: req.user!.id,
        action: "download",
        resourceType: "file",
        resourceId: file.id,
        details: `Descarga: ${file.originalName}`,
        ipAddress: req.ip || req.socket.remoteAddress || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
      });

      res.download(filePath, file.originalName);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).send("Error al descargar archivo");
    }
  });

  
  app.get("/api/files/:id/preview", requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);

      if (!file) {
        return res.status(404).send("Archivo no encontrado");
      }

      const filePath = path.join(UPLOADS_DIR, file.filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).send("Archivo no encontrado en el servidor");
      }

      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Disposition", `inline; filename="${file.originalName}"`);
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error previewing file:", error);
      res.status(500).send("Error al previsualizar archivo");
    }
  });
  
app.patch("/api/files/:id/move", requireAdmin, async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    const { folderId } = req.body;

    if (isNaN(fileId) || !folderId) {
      return res.status(400).send("Datos inválidos");
    }

    const file = await storage.getFile(fileId);
    if (!file) {
      return res.status(404).send("Archivo no encontrado");
    }

    await storage.updateFile(fileId, {
      folderId: Number(folderId),
    });

    
    await storage.createAuditLog({
      userId: req.user!.id,
      action: "move",
      resourceType: "file",
      resourceId: fileId,
      details: `Archivo movido: ${file.originalName} → carpeta ${folderId}`,
      ipAddress: req.ip || "unknown",
      userAgent: req.get("User-Agent") || "unknown",
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error moving file:", error);
    res.status(500).send("Error al mover archivo");
  }
});

  
  app.delete("/api/files/:id", requireAdmin, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
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
      res.status(500).send("Error al eliminar archivo");
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

      const { username, password, fullName, isAdmin, isActive } = validation.data;

      
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

  return httpServer;
}
