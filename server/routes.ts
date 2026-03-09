import { ConfidentialClientApplication, Configuration } from "@azure/msal-node";
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

  // 2. Endpoint de Callback (Microsoft regresa aquí con los datos del usuario)
  app.get("/api/auth/callback", async (req, res) => {
    try {
      const tokenRequest = {
        code: req.query.code as string,
        scopes: ["user.read"],
        redirectUri: process.env.MICROSOFT_REDIRECT_URI!,
      };

      // Intercambiamos el código por el token y los datos del usuario
      const response = await msalClient.acquireTokenByCode(tokenRequest);
      
      // Guardamos el correo y nombre en la sesión de Express
      (req.session as any).user = {
        email: response.account?.username || response.account?.name,
        name: response.account?.name,
        homeAccountId: response.account?.homeAccountId
      };

      // Guardamos la sesión y redirigimos al frontend
      req.session.save(() => {
        // Redirige a la raíz de tu frontend (ajusta si la ruta es diferente)
        res.redirect("/"); 
      });

    } catch (error) {
      console.error("Error en el callback de Microsoft:", error);
      res.status(500).send("Error en la autenticación. Por favor, intenta de nuevo.");
    }
  });

  // 3. Endpoint para que el Frontend sepa quién está conectado
  app.get("/api/auth/me", (req, res) => {
    const user = (req.session as any).user;
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: "No autenticado" });
    }
  });

  // 4. Endpoint de Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

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