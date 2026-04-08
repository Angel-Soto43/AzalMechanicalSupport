import { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import { storage } from "./storage";
import { insertLicitacionSchema } from "@shared/schema";
import "isomorphic-fetch";
import { getMicrosoftFiles, getMicrosoftQuota, getMicrosoftFolders, createMicrosoftFolder, uploadFileToGraph } from "./microsoft-graph";
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

  app.post("/api/folders", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const name = req.body?.name;
      const parentId = req.body?.parentId != null ? Number(req.body.parentId) : null;

      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "El nombre de la carpeta es obligatorio" });
      }

      const folderData: any = {
        name: name.trim(),
        userId,
      };
      if (parentId != null) {
        folderData.parentId = parentId;
      }

      const folder = await storage.createFolder(folderData);

      if (req.user.accessToken && req.user.refreshToken) {
        try {
          await createMicrosoftFolder(req.user.accessToken, req.user.refreshToken, req.user.id, name.trim());
        } catch (graphError: any) {
          console.warn("No se pudo crear la carpeta en OneDrive:", graphError.message || graphError);
        }
      }

      res.status(201).json(folder);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/folders/:id", requireAuth, async (req: any, res) => {
    try {
      const folderId = Number(req.params.id);
      const name = req.body?.name;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "El nombre de la carpeta es obligatorio" });
      }

      const folder = await storage.getFolderById(folderId);
      if (!folder) {
        return res.status(404).json({ error: "Carpeta no encontrada" });
      }
      if (folder.userId !== req.user.id) {
        return res.status(403).json({ error: "No autorizado" });
      }

      const updatedFolder = await storage.updateFolderName(folderId, name.trim());
      res.status(200).json(updatedFolder);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/folders/:id", requireAuth, async (req: any, res) => {
    try {
      const folderId = Number(req.params.id);
      const folder = await storage.getFolderById(folderId);
      if (!folder) {
        return res.status(404).json({ error: "Carpeta no encontrada" });
      }
      if (folder.userId !== req.user.id) {
        return res.status(403).json({ error: "No autorizado" });
      }

      await storage.deleteFolder(folderId);
      res.status(204).end();
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

      let createdFile: any = null;
      try {
        createdFile = await storage.createFile({
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
      } catch (dbError: any) {
        console.warn("⚠️ No se pudo guardar metadatos en la DB, se omite el registro local:", dbError.message || dbError);
      }

      let graphResponse: any = null;
      if (req.user.accessToken) {
        try {
          graphResponse = await uploadFileToGraph(req.user.accessToken, file.originalname, file.buffer, file.mimetype, file.size);
        } catch (graphError: any) {
          console.error("Error al subir a Microsoft Graph:", graphError);
        }
      }

      if (createdFile) {
        return res.status(201).json(createdFile);
      }

      return res.status(201).json({
        id: graphResponse?.id || null,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        webUrl: graphResponse?.webUrl || null,
        source: graphResponse ? 'microsoft' : 'local',
      });
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

  // Obtener carpetas de Microsoft
  app.get("/api/microsoft-folders", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const accessToken = user?.accessToken;
      const refreshToken = user?.refreshToken;

      if (!accessToken || !refreshToken) {
        console.error('❌ No access token or refresh token para usuario:', user?.oid);
        return res.status(401).json({ error: "No access token or refresh token available" });
      }

      const microsoftFolders = await getMicrosoftFolders(accessToken, refreshToken, user.id);
      console.log('✅ Carpetas obtenidas de Microsoft:', microsoftFolders?.length || 0);
      
      res.json(microsoftFolders || []);
    } catch (e: any) {
      console.error('❌ Error en /api/microsoft-folders:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/microsoft-folders", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const accessToken = user?.accessToken;
      const refreshToken = user?.refreshToken;
      const folderName = req.body?.name;

      if (!accessToken || !refreshToken) {
        console.error('❌ No access token or refresh token para usuario:', user?.oid);
        return res.status(401).json({ error: "No access token or refresh token available" });
      }

      if (!folderName || typeof folderName !== 'string' || !folderName.trim()) {
        return res.status(400).json({ error: "El nombre de la carpeta es obligatorio" });
      }

      const createdFolder = await createMicrosoftFolder(accessToken, refreshToken, user.id, folderName.trim());
      console.log('✅ Carpeta creada en Microsoft:', createdFolder);
      res.status(201).json(createdFolder);
    } catch (e: any) {
      console.error('❌ Error en POST /api/microsoft-folders:', e.message || e);
      res.status(500).json({ error: e.message || 'Error interno al crear carpeta en OneDrive' });
    }
  });

  // NUEVO: Obtener archivos combinados (locales + Microsoft)
  app.get("/api/files-all", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const accessToken = user?.accessToken;
      const refreshToken = user?.refreshToken;

      console.log('📍 /api/files-all - Usuario:', user?.oid, 'Token disponible:', !!accessToken);

      // Obtener archivos locales
      let localFiles: any[] = [];
      try {
        localFiles = await storage.getAllFiles();
        console.log('✅ Archivos locales:', localFiles?.length || 0);
      } catch (dbError: any) {
        console.warn('⚠️ No se pudo obtener archivos locales de la DB, se omite la lista local:', dbError.message || dbError);
      }

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

  // Dashboard: Información consolidada de OneDrive
  app.get("/api/dashboard", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const accessToken = user?.accessToken;
      const refreshToken = user?.refreshToken;
      const userId = user?.id;

      console.log('📊 /api/dashboard - Calculando estadísticas para usuario:', user?.oid, 'ID:', userId);

      // Obtener datos de archivo y almacenamiento de OneDrive
      let fileCount = 0;
      let storageUsed = 0;
      let storageTotal = 5 * 1024 * 1024 * 1024; // 5GB default
      let recentFiles: any[] = [];
      let allFiles: any[] = [];

      // 1. Primero intentar obtener archivos locales
      try {
        const localFiles = await storage.getAllFiles();
        console.log('✅ Archivos locales obtenidos:', localFiles?.length || 0);
        if (localFiles && localFiles.length > 0) {
          console.log('   Primer archivo local:', {
            id: localFiles[0]?.id,
            name: localFiles[0]?.originalName,
            uploadedAt: localFiles[0]?.uploadedAt,
          });
        }
        allFiles = [...(localFiles || [])];
      } catch (dbError: any) {
        console.error('❌ Error obteniendo archivos locales:', dbError.message);
      }

      // 2. Intentar obtener archivos de Microsoft
      if (accessToken && refreshToken) {
        try {
          const microsoftFiles = await getMicrosoftFiles(accessToken, refreshToken, userId);
          console.log('✅ Archivos de Microsoft obtenidos:', microsoftFiles?.length || 0);
          if (microsoftFiles && microsoftFiles.length > 0) {
            console.log('   Primer archivo Microsoft:', {
              id: microsoftFiles[0]?.id,
              name: microsoftFiles[0]?.originalName,
              uploadedAt: microsoftFiles[0]?.uploadedAt,
            });
            allFiles = [...allFiles, ...microsoftFiles];
          }
        } catch (error: any) {
          console.warn("⚠️ Error obteniendo archivos de Microsoft:", error.message);
        }
      } else {
        console.warn('⚠️ No hay tokens de Microsoft disponibles para usuario:', userId);
      }

      fileCount = allFiles.length;
      console.log('📊 Total de archivos (Local + Microsoft):', fileCount);

      // 3. Obtener información de almacenamiento de Microsoft
      if (accessToken) {
        try {
          const quota = await getMicrosoftQuota(accessToken);
          storageUsed = quota.used || 0;
          storageTotal = quota.total || storageTotal;
          console.log('✅ Almacenamiento Microsoft - Usado:', storageUsed, 'Total:', storageTotal);
        } catch (error: any) {
          console.warn('⚠️ Error obteniendo cuota de Microsoft:', error.message);
        }
      }

      // 4. Obtener archivos recientes (últimos 10), ordenados por fecha
      if (allFiles && allFiles.length > 0) {
        recentFiles = allFiles
          .sort((a: any, b: any) => {
            const dateA = new Date(a.uploadedAt).getTime();
            const dateB = new Date(b.uploadedAt).getTime();
            return dateB - dateA; // Más recientes primero
          })
          .slice(0, 10);
        console.log('✅ Archivos recientes después de ordenar:', recentFiles.length);
        if (recentFiles.length > 0) {
          console.log('   Archivo más reciente:', {
            id: recentFiles[0]?.id,
            name: recentFiles[0]?.originalName || recentFiles[0]?.name,
            uploadedAt: recentFiles[0]?.uploadedAt,
          });
        }
      } else {
        console.warn('⚠️ Sin archivos para mostrar como recientes');
      }

      // 5. Calcular porcentaje de uso
      const usagePercent = storageTotal > 0 
        ? Math.round((storageUsed / storageTotal) * 100)
        : 0;

      // 6. Construir respuesta consolidada del dashboard
      const dashboardData = {
        fileCount,
        storageUsed,
        storageTotal,
        usagePercent,
        recentFiles: recentFiles.map((file: any) => ({
          id: file.id,
          name: file.originalName || file.name || 'Sin nombre',
          size: file.size || 0,
          uploadedAt: file.uploadedAt || new Date().toISOString(),
          mimeType: file.mimeType || 'application/octet-stream',
          webUrl: file.webUrl || null,
        })),
      };

      console.log('📊 Dashboard data final:', {
        fileCount: dashboardData.fileCount,
        storageUsed: dashboardData.storageUsed,
        usagePercent: dashboardData.usagePercent,
        recentFilesCount: dashboardData.recentFiles.length,
        recentFilesNames: dashboardData.recentFiles.slice(0, 3).map(f => f.name),
      });

      res.json(dashboardData);
    } catch (e: any) {
      console.error('❌ Error en /api/dashboard:', e.message, e.stack);
      // Retornar datos vacíos en lugar de error para que el frontend no falle
      res.json({
        fileCount: 0,
        storageUsed: 0,
        storageTotal: 5 * 1024 * 1024 * 1024,
        usagePercent: 0,
        recentFiles: [],
      });
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