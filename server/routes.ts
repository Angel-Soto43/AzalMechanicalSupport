import { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLicitacionSchema } from "@shared/schema";
import "isomorphic-fetch";

export async function registerRoutes(app: Express, httpServer: Server): Promise<Server> {

  // Configuración de cabeceras para todas las peticiones /api
  app.use("/api", (req, res, next) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    next();
  });

  // ✅ FLUJO REAL DE MICROSOFT AZURE (Usando tus variables del .env)
  app.get("/api/auth/microsoft", (req, res) => {
    const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.MICROSOFT_REDIRECT_URI || "http://localhost:5000/api/auth/callback");

    if (!clientId) {
      console.error("ERROR: MICROSOFT_CLIENT_ID no está definido en el .env");
      return res.status(500).json({ error: "Configuración de autenticación incompleta" });
    }

    // URL oficial de Microsoft para pedir la cuenta del usuario
    const azureUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
      `client_id=${clientId}` +
      `&response_type=code` +
      `&redirect_uri=${redirectUri}` +
      `&response_mode=query` +
      `&scope=openid%20profile%20email%20User.Read`;

    console.log("Iniciando sesión segura - Redirigiendo a Microsoft...");
    res.redirect(azureUrl);
  });

  // Callback: donde Microsoft regresa al usuario después de meter su cuenta
  app.get("/api/auth/callback", async (req, res) => {
    console.log("Registro exitoso en Microsoft. Acceso concedido al sistema Azal.");
    res.redirect("/");
  });


  // --- GESTIÓN DE CARPETAS Y ARCHIVOS ---
  app.get("/api/folders", async (_req, res) => {
    try {
      const lista = await storage.getFolders(1);
      res.status(200).json(lista || []);
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