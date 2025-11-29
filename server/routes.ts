import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireAdmin, hashPassword } from "./auth";
import { createUserSchema, updateUserSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

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

  // Upload file
  app.post("/api/files/upload", requireAuth, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send("No se proporcionó ningún archivo");
      }

      const { contractId } = req.body;
      if (!contractId) {
        // Delete the uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).send("El ID de contrato es requerido");
      }

      const file = await storage.createFile({
        contractId,
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
        details: `Archivo subido: ${file.originalName} (Contrato: ${contractId})`,
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
      const fileId = parseInt(req.params.id);
      const existingFile = await storage.getFile(fileId);

      if (!existingFile) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).send("Archivo no encontrado");
      }

      // Check if user owns the file
      if (existingFile.uploadedBy !== req.user!.id && !req.user!.isAdmin) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(403).send("No tienes permiso para actualizar este archivo");
      }

      if (!req.file) {
        return res.status(400).send("No se proporcionó ningún archivo");
      }

      // Create new version
      const newFile = await storage.createFile({
        contractId: existingFile.contractId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedBy: req.user!.id,
        previousVersionId: existingFile.id,
      });

      // Update version number
      await storage.updateFile(newFile.id, { version: existingFile.version + 1 });

      // Mark old file as deleted (soft delete previous version)
      await storage.deleteFile(existingFile.id, req.user!.id);

      // Log action
      await storage.createAuditLog({
        userId: req.user!.id,
        action: "upload",
        resourceType: "file",
        resourceId: newFile.id,
        details: `Nueva versión subida: ${newFile.originalName} (v${existingFile.version + 1})`,
        ipAddress: req.ip || req.socket.remoteAddress || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
      });

      const updatedFile = await storage.getFile(newFile.id);
      const enrichedFiles = await enrichFilesWithUploader([updatedFile!]);
      res.status(201).json(enrichedFiles[0]);
    } catch (error) {
      console.error("Error updating file version:", error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).send("Error al actualizar versión");
    }
  });

  // Download file
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

      // Log download
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

  // Preview file
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

  // Delete file (admin only)
  app.delete("/api/files/:id", requireAdmin, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);

      if (!file) {
        return res.status(404).send("Archivo no encontrado");
      }

      await storage.deleteFile(fileId, req.user!.id);

      // Log deletion
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

  // ============ User Routes (Admin only) ============

  // Get all users
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      // Remove passwords from response
      const usersWithoutPasswords = allUsers.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).send("Error al obtener usuarios");
    }
  });

  // Create user
  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const validation = createUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).send(validation.error.errors[0].message);
      }

      const { username, password, fullName, isAdmin, isActive } = validation.data;

      // Check if username already exists
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

      // Log user creation
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

  // Update user
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

      // Log user update
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

  // ============ Audit Log Routes ============

  // Get all audit logs
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

  // Get recent audit logs
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
