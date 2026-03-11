import { ConfidentialClientApplication, Configuration } from "@azure/msal-node";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertLicitacionSchema } from "@shared/schema"; // Asegúrate de tener esto en tu schema.ts

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication (Mantiene la configuración de sesión base)
  setupAuth(app);

  const msalConfig: Configuration = {
    auth: {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    }
  };
  const msalClient = new ConfidentialClientApplication(msalConfig);

  // 1. Endpoint para iniciar el login (Redirige a Microsoft)
  app.get("/api/auth/microsoft", async (req, res) => {
    try {
      const authCodeUrlParameters = {
        scopes: ["user.read"],
        redirectUri: process.env.MICROSOFT_REDIRECT_URI!,
      };
      const response = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
      res.redirect(response);
    } catch (error) {
      console.error("Error al generar la URL de Microsoft:", error);
      res.status(500).json({ error: "Error al iniciar sesión con Microsoft" });
    }
  });

  // 2. Endpoint de Callback (Microsoft regresa aquí)
  app.get("/api/auth/callback", async (req, res) => {
    try {
      console.log("🔄 1. Microsoft regresó a nuestro servidor...");
      const tokenRequest = {
        code: req.query.code as string,
        scopes: ["user.read"],
        redirectUri: process.env.MICROSOFT_REDIRECT_URI!,
      };

      const response = await msalClient.acquireTokenByCode(tokenRequest);
      console.log("✅ 2. Token de Microsoft obtenido para:", response.account?.username);

      (req.session as any).user = {
        id: 1,
        username: response.account?.username || "usuario",
        fullName: response.account?.name || "Usuario Microsoft",
        displayName: response.account?.name,
        email: response.account?.username,
        isAdmin: true,
        isActive: true
      };

      console.log("📦 3. Guardando sesión en la base de datos...");
      req.session.save((err) => {
        if (err) {
          console.error("❌ ERROR AL GUARDAR SESIÓN:", err);
          return res.status(500).send("Error de sesión");
        }
        console.log("💾 4. Sesión guardada. Redirigiendo al Frontend (/).");
        res.redirect("/");
      });

    } catch (error) {
      console.error("❌ Error en el callback de Microsoft:", error);
      res.status(500).send("Error en la autenticación.");
    }
  });

  // 3. Endpoints de usuario y sesión
  app.get("/api/user", (req, res) => {
    const user = (req.session as any).user;
    if (user) {
      res.json(user);
    } else {
      res.status(401).send("No autenticado");
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // ============ Audit Logs Routes ============
  app.get("/api/audit-logs", async (req, res) => {
    const logs = await storage.getAuditLogs();
    res.json(logs);
  });

  // ============ MÓDULO DE LICITACIONES (SPRINT 1) ============

  // Obtener todas las licitaciones
  app.get("/api/licitaciones", async (req, res) => {
    try {
      const licitaciones = await storage.getLicitaciones();
      res.json(licitaciones);
    } catch (error) {
      res.status(500).send("Error al obtener licitaciones");
    }
  });

  // Crear una nueva licitación
  app.post("/api/licitaciones", async (req, res) => {
    try {
      const parsed = insertLicitacionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }
      const newLicitacion = await storage.createLicitacion(parsed.data);
      res.status(201).json(newLicitacion);
    } catch (error) {
      res.status(500).send("Error al crear licitación");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}