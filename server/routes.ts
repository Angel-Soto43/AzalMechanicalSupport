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

  // 3. Endpoint para que el Frontend sepa quién está conectado
  app.get("/api/auth/me", (req, res) => {
    const user = (req.session as any).user;
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: "No autenticado" });
    }
  });
  /// Endpoint de compatibilidad para el Frontend viejo
  app.get("/api/user", (req, res) => {
    console.log("👀 5. El Frontend preguntó: '¿Hay alguien logueado?'");
    
    const user = (req.session as any).user;
    
    if (user) {
      console.log("🟢 6. ¡Sí! Dejando pasar a:", user.username);
      res.json(user);
    } else {
      console.log("🔴 6. ¡No hay nadie en la memoria! Pateando al login...");
      res.status(401).send("No autenticado");
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