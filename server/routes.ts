import { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import { storage } from "./storage";
import { insertLicitacionSchema } from "@shared/schema";
import "isomorphic-fetch";
import { getMicrosoftFiles, getMicrosoftQuota, uploadFileToGraph } from "./microsoft-graph";
import { requireAuth } from "./auth";

const upload = multer({ storage: multer.memoryStorage() });
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export async function registerRoutes(app: Express, httpServer: Server): Promise<Server> {

  // Configuración de cabeceras para todas las peticiones /api
  app.use("/api", (req, res, next) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    next();
  });

  // Microsoft auth routes are handled in server/auth.ts (Passport + OIDC).
  // Dejar este bloque vacío aquí para evitar rutas duplicadas / conflicto de flujo.



  // --- GESTIÓN DE CARPETAS Y ARCHIVOS ---
  app.get("/api/folders", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const lista = await storage.getRootFolders(userId);
      res.status(200).json(lista || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/folders/:id/content", requireAuth, async (req: any, res) => {
    try {
      const folderId = Number(req.params.id);
      const folder = await storage.getFolderById(folderId);
      if (!folder) {
        return res.status(404).json({ error: "Carpeta no encontrada" });
      }

      const pathFolders = await storage.getFolderPath(folderId);
      const subfolders = await storage.getSubfolders(folderId);
      const files = await storage.getFilesByFolder(folderId);

      res.json({ folder, path: pathFolders, folders: subfolders, files });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/files/upload", requireAuth, upload.single("file"), async (req: any, res) => {
    try {
      const file = req.file;
      console.log("/api/files/upload request", {
        hasUser: !!req.user,
        userId: req.user?.id,
        hasFile: !!file,
        fileName: file?.originalname,
        fileSize: file?.size,
        hasBuffer: !!file?.buffer,
        folderId: req.body.folderId,
        contractId: req.body.contractId,
        supplier: req.body.supplier,
      });

      if (!file) {
        return res.status(400).json({ error: "No se recibió el archivo" });
      }

      if (!file.buffer) {
        return res.status(500).json({ error: "El archivo no se procesó correctamente en el servidor" });
      }

      const folderId = req.body.folderId ? Number(req.body.folderId) : null;
      const contractId = req.body.contractId ?? "";
      const supplier = req.body.supplier ?? "";
      const uploaderId = req.user.id;
      const storedFilename = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.originalname}`;
      const filePath = path.join(uploadsDir, storedFilename);

      await fs.promises.writeFile(filePath, file.buffer);

      const createdFile = await storage.createFile({
        filename: storedFilename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        contractId,
        supplier,
        version: 1,
        uploadedAt: new Date(),
        uploadedBy: uploaderId,
        folderId,
        previousVersionId: null,
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });

      if (req.user.accessToken) {
        try {
          await uploadFileToGraph(req.user.accessToken, file.originalname, file.buffer, file.mimetype, file.size);
        } catch (graphError: any) {
          console.error("Error al subir a Microsoft Graph:", graphError);
        }
      }

      res.status(201).json(createdFile);
    } catch (e: any) {
      console.error("Error en /api/files/upload:", e);
      res.status(500).json({ error: e.message || "Error interno al subir archivo" });
    }
  });

  app.get("/api/files/:id/download", requireAuth, async (req: any, res) => {
    try {
      const fileId = Number(req.params.id);
      const file = await storage.getFileById(fileId);
      if (!file) {
        return res.status(404).json({ error: "Archivo no encontrado" });
      }

      const filePath = path.join(uploadsDir, file.filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Archivo no disponible en el servidor" });
      }

      res.download(filePath, file.originalName);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/files", async (_req, res) => {
    try {
      const lista = await storage.getAllFiles();
      res.json(lista || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // DEBUG: Ver archivos locales
  app.get("/api/debug/files", async (_req, res) => {
    try {
      const localFiles = await storage.getAllFiles();
      res.json({
        count: localFiles.length,
        files: localFiles.map(f => ({
          id: f.id,
          originalName: f.originalName,
          uploadedAt: f.uploadedAt,
          isDeleted: f.isDeleted,
          size: f.size
        }))
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // NUEVO: Obtener archivos de Microsoft Drive del usuario autenticado
  app.get("/api/microsoft-files", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const accessToken = user?.accessToken;
      const refreshToken = user?.refreshToken;

      console.log('📍 /api/microsoft-files - Usuario:', user?.oid, 'Token disponible:', !!accessToken);

      if (!accessToken || !refreshToken) {
        console.error('❌ No access token or refresh token para usuario:', user?.oid);
        return res.status(401).json({ error: "No access token or refresh token available" });
      }

      const microsoftFiles = await getMicrosoftFiles(accessToken, refreshToken, user.id);
      console.log('✅ Archivos obtenidos de Microsoft:', microsoftFiles?.length || 0);
      
      res.json(microsoftFiles || []);
    } catch (e: any) {
      console.error('❌ Error en /api/microsoft-files:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // NUEVO: Obtener archivos combinados (locales + Microsoft)
  app.get("/api/files-all", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const accessToken = user?.accessToken;

      console.log('📍 /api/files-all - Usuario:', user?.oid, 'Token disponible:', !!accessToken);

      // Obtener archivos locales
      const localFiles = await storage.getAllFiles();
      console.log('✅ Archivos locales:', localFiles?.length || 0);

      // Obtener archivos de Microsoft si tenemos accessToken
      let microsoftFiles: any[] = [];
      if (accessToken && refreshToken) {
        try {
          microsoftFiles = await getMicrosoftFiles(accessToken, refreshToken, user.id);
          console.log('✅ Archivos de Microsoft:', microsoftFiles?.length || 0);
        } catch (error) {
          console.error("❌ Error fetching Microsoft files:", error);
        }
      } else {
        console.warn('⚠️ No hay accessToken o refreshToken disponible');
      }

      // Combinar ambas listas
      const allFiles = [...localFiles, ...microsoftFiles];
      console.log('📊 Total archivos:', allFiles?.length || 0);
      
      res.json(allFiles || []);
    } catch (e: any) {
      console.error('❌ Error en /api/files-all:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // NUEVO: Obtener información de almacenamiento de Microsoft
  app.get("/api/microsoft-quota", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const accessToken = user?.accessToken;

      if (!accessToken) {
        return res.status(401).json({ error: "No access token available" });
      }

      const quota = await getMicrosoftQuota(accessToken);
      res.json(quota);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  // --- AUDITORÍA Y ESTADÍSTICAS ---
  app.get("/api/audit-logs", async (_req, res) => {
    try {
      const logs = await storage.getRecentAuditLogs(100);
      res.json(logs || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/stats", async (_req, res) => {
    try {
      const licitaciones = await storage.getLicitaciones();
      const logs = await storage.getRecentAuditLogs(100);
      res.json({
        totalLicitaciones: licitaciones.length,
        totalLogs: logs.length,
        ultimaActividad: logs[0]?.createdAt || new Date(),
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  // --- LICITACIONES ---
  app.get("/api/licitaciones", async (_req, res) => {
    const lista = await storage.getLicitaciones();
    res.json(lista || []);
  });

  app.post("/api/licitaciones", async (req, res) => {
    try {
      const data = insertLicitacionSchema.parse(req.body);
      const nueva = await storage.createLicitacion(data);
      res.status(201).json(nueva);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  return httpServer;
}