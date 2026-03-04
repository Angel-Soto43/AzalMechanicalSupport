import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication (Mantiene la configuración de sesión base)
  setupAuth(app);

  // ============ Audit Logs Routes ============
  
  app.get("/api/audit-logs", async (req, res) => {
    try {
      const logs = await storage.getAuditLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).send("Error al obtener registros de auditoría");
    }
  });

  app.get("/api/audit-logs/recent", async (req, res) => {
    try {
      const logs = await storage.getRecentAuditLogs(10);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching recent audit logs:", error);
      res.status(500).send("Error al obtener registros recientes");
    }
  });

  // ====================================================================
  // AQUI IRÁN TUS NUEVOS ENDPOINTS DEL MÓDULO DE LICITACIONES
  // (GET /api/licitaciones, POST /api/propuestas, etc.)
  // ====================================================================

  return httpServer;
}