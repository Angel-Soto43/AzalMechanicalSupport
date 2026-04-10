import { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import { storage } from "./storage";
import { insertLicitacionSchema } from "@shared/schema";
import "isomorphic-fetch";
import { getMicrosoftFiles, 
        getMicrosoftQuota, 
        getMicrosoftFolders, 
        getMicrosoftRecentFiles, 
        createMicrosoftFolder, 
        uploadFileToGraph } from "./microsoft-graph";
import { requireAuth } from "./auth";
import { getMicrosoftFilesPaginated } from "./microsoft-graph";

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

  // ☁️ 100% NUBE: CREAR CARPETAS DIRECTO EN ONEDRIVE + AUDITORÍA FORZADA
  app.post("/api/folders", requireAuth, async (req: any, res) => {
    try {
      const name = req.body?.name;

      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "El nombre de la carpeta es obligatorio" });
      }

      if (!req.user.accessToken || !req.user.refreshToken) {
        return res.status(401).json({ error: "No hay sesión activa con Microsoft OneDrive" });
      }

      const nuevaCarpetaNube = await createMicrosoftFolder(
        req.user.accessToken, 
        req.user.refreshToken, 
        req.user.id, 
        name.trim()
      );

      // ✅ AUDITORÍA FORZADA
      try {
        await storage.createAuditLog({
          userId: req.user.id,
          action: "Crear carpeta",
          details: `Carpeta creada en OneDrive: ${name.trim()}`
        });
        console.log("✅ Auditoría registrada: Crear carpeta");
      } catch (auditErr: any) {
        console.error("⚠️ Error en auditoría (Carpetas):", auditErr.message || auditErr);
      }

      res.status(201).json(nuevaCarpetaNube);

    } catch (e: any) {
      console.error("❌ Error creando carpeta en la nube:", e.message);
      res.status(500).json({ error: "No se pudo crear la carpeta en OneDrive" });
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

  // ☁️ 100% NUBE: SUBIR ARCHIVOS DIRECTO A ONEDRIVE + AUDITORÍA FORZADA
  app.post("/api/files/upload", requireAuth, upload.single("file"), async (req: any, res) => {
    try {
      const file = req.file;

      if (!file || !file.buffer) {
        return res.status(400).json({ error: "No se recibió el archivo correctamente" });
      }

      if (!req.user.accessToken) {
        return res.status(401).json({ error: "No hay sesión activa con Microsoft OneDrive" });
      }

      console.log(`☁️ Subiendo archivo ${file.originalname} directo a OneDrive...`);

      const graphResponse = await uploadFileToGraph(
        req.user.accessToken, 
        file.originalname, 
        file.buffer, 
        file.mimetype, 
        file.size
      );

      // ✅ AUDITORÍA FORZADA
      try {
        await storage.createAuditLog({
          userId: req.user.id,
          action: "Subir archivo",
          details: `Archivo subido a OneDrive: ${file.originalname}`
        });
        console.log("✅ Auditoría registrada: Subir archivo");
      } catch (auditErr: any) {
        console.error("⚠️ Error en auditoría (Archivos):", auditErr.message || auditErr);
      }

      return res.status(201).json({
        id: graphResponse.id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        webUrl: graphResponse.webUrl,
        source: 'microsoft',
      });

    } catch (e: any) {
      console.error("❌ Error subiendo archivo a la nube:", e.message);
      res.status(500).json({ error: e.message || "Error interno al subir archivo a OneDrive" });
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
  // ☁️ RUTA PAGINADA PARA LA TABLA
  // ☁️ RUTA PAGINADA PARA LA TABLA
  app.get("/api/files-all", requireAuth, async (req: any, res) => {
    try {
      console.log(`\n📍 LLAMADA A /api/files-all RECIBIDA. Frontend conectado con éxito.`);
      const user = req.user;
      const accessToken = user?.accessToken;
      const refreshToken = user?.refreshToken;
      
      if (!accessToken) {
        console.error("⚠️ Alerta: No se encontró accessToken para este usuario.");
      }

      const cursor = req.query.cursor as string; 
      let localFiles: any[] = [];
      
      if (!cursor) {
        try { localFiles = await storage.getAllFiles(); } catch(e) {}
      }

      let microsoftData = { files: [], nextLink: null };

      if (accessToken && refreshToken) {
        console.log(`🔍 Pidiendo archivos a Microsoft (Cursor: ${cursor ? 'Siguiente Página' : 'Página 1'})...`);
        microsoftData = await getMicrosoftFilesPaginated(accessToken, refreshToken, user.id, cursor);
        console.log(`✅ Se enviarán ${microsoftData.files.length} archivos a la tabla.`);
      }

      res.json({
        files: [...localFiles, ...microsoftData.files],
        nextCursor: microsoftData.nextLink
      });

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
      const refreshToken = user?.refreshToken;
      const userId = user?.id;

      if (!accessToken) {
        return res.status(401).json({ error: "No access token available" });
      }

      const quota = await getMicrosoftQuota(accessToken, refreshToken, userId);
      res.json(quota);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Dashboard: Información 100% Exclusiva y Precisa de OneDrive
  app.get("/api/dashboard", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const accessToken = user?.accessToken;
      const refreshToken = user?.refreshToken;
      const userId = user?.id;

      // 🚀 Hacemos un solo escaneo masivo (Más rápido y eficiente)
      const microsoftFiles = accessToken && refreshToken
        ? await getMicrosoftFiles(accessToken, refreshToken, userId)
        : [];

      const quota = accessToken
        ? await getMicrosoftQuota(accessToken, refreshToken, userId)
        : { used: 0, total: 5 * 1024 * 1024 * 1024 };

      // 1. Conteo total
      const fileCount = microsoftFiles.length;
      
      // 2. Filtro estricto y preciso de los últimos 7 días
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const recentFiles = microsoftFiles
        .filter((file: any) => {
           // Checamos la fecha real del archivo
           const fileDate = new Date(file.createdDateTime || file.lastModifiedDateTime || 0);
           return fileDate >= sevenDaysAgo;
        })
        .sort((a: any, b: any) => {
           const dateA = new Date(a.lastModifiedDateTime || a.createdDateTime || 0).getTime();
           const dateB = new Date(b.lastModifiedDateTime || b.createdDateTime || 0).getTime();
           return dateB - dateA; // Ordenamos del más nuevo al más viejo
        })
        .slice(0, 10) // Tomamos el Top 10
        .map((item: any) => {
          const fecha = item.createdDateTime || item.lastModifiedDateTime || new Date().toISOString();
          return {
            id: item.id,
            name: item.name,
            size: item.size || 0,
            uploadedAt: fecha,
            lastModifiedDateTime: fecha,
            type: item.file?.mimeType || 'application/octet-stream',
            mimeType: item.file?.mimeType || 'application/octet-stream',
            webUrl: item.webUrl,
          };
        });

      // 3. Cálculos de almacenamiento
      const storageUsed = quota.used || 0;
      const storageTotal = quota.total || 5 * 1024 * 1024 * 1024;
      const usagePercent = storageTotal > 0 ? Math.round((storageUsed / storageTotal) * 100) : 0;

      res.json({
        fileCount,
        storageUsed,
        storageTotal,
        usagePercent,
        recentFiles, // Ahora sí, precisión milimétrica 🎯
      });
    } catch (e: any) {
      console.error('❌ Error en /api/dashboard:', e.message);
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
  
  // 1. Ruta de Logs: Con requireAuth para que reconozca tu sesión de danmen27@outlook.com
  app.get("/api/audit-logs", requireAuth, async (req: any, res) => {
    try {
      // Traemos los 100 más recientes. Esto debería incluir los tuyos y los de sistema.
      const logs = await storage.getRecentAuditLogs(100);
      res.json(logs || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 2. Ruta de Estadísticas: También con requireAuth
  app.get("/api/stats", requireAuth, async (req: any, res) => {
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