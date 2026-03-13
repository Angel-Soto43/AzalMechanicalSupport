import { ConfidentialClientApplication, Configuration } from "@azure/msal-node";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertLicitacionSchema } from "@shared/schema";
import "isomorphic-fetch";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // setupAuth(app); // Sigue comentado para tu bypass

  // --- RUTAS DE LICITACIONES ---
  app.get("/api/licitaciones", async (_req, res) => {
    const lista = await storage.getLicitaciones();
    res.json(lista);
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

  // --- ✅ NUEVO: ENDPOINT DE ESTADÍSTICAS REALES ---
  app.get("/api/stats", async (_req, res) => {
    try {
      const licitaciones = await storage.getLicitaciones();
      const logs = await storage.getRecentAuditLogs(100);

      // Calculamos datos dinámicos
      res.json({
        totalLicitaciones: licitaciones.length,
        totalLogs: logs.length,
        ultimaActividad: logs[0]?.createdAt || new Date(),
        // Puedes agregar más datos aquí para el Dashboard
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- AUDITORÍA ---
  app.get("/api/audit-logs/recent", async (_req, res) => {
    const logs = await storage.getRecentAuditLogs(10);
    res.json(logs);
  });

  return httpServer;
}