import { ConfidentialClientApplication, Configuration } from "@azure/msal-node";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";

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
        scopes: ["user.read", "Files.ReadWrite.All"], 
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
        scopes: ["user.read", "Files.ReadWrite.All"], 
        redirectUri: process.env.MICROSOFT_REDIRECT_URI!,
      };

      // Intercambiamos el código por el token y los datos del usuario
      const response = await msalClient.acquireTokenByCode(tokenRequest);
      
      /**
       * @description Construcción del objeto de sesión del usuario.
       * Se incluye el accessToken, el cual es estrictamente necesario para 
       * autorizar las futuras llamadas a Microsoft Graph API.
       */
      (req.session as any).user = {
        id: 1, 
        username: response.account?.username || "usuario",
        fullName: response.account?.name || "Usuario Microsoft",
        email: response.account?.username,
        isAdmin: true,
        isActive: true,
        accessToken: response.accessToken // <- Nueva propiedad indispensable
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

  // ========================================================
  // ZONA 2: INTEGRACIÓN CON ONEDRIVE (DÍA 7)
  // ========================================================

  /**
   * @route GET /api/drive/structure
   * @description Obtiene la estructura de carpetas y archivos en la raíz del OneDrive del usuario autenticado.
   * @access Protegido (Requiere sesión activa y accessToken de Microsoft Graph)
   */
  app.get("/api/drive/structure", async (req, res) => {
    try {
      const user = (req.session as any).user;
      
      // 1. Validación de seguridad y autorización
      if (!user || !user.accessToken) {
        return res.status(401).json({ 
          error: "No autorizado. Token de acceso faltante o sesión expirada." 
        });
      }

      // 2. Inicialización del cliente de Microsoft Graph
      const graphClient = Client.init({
        authProvider: (done) => {
          done(null, user.accessToken);
        }
      });

      // 3. Petición a la API de Microsoft para obtener los elementos de la carpeta raíz
      // El endpoint /me/drive/root/children lista los metadatos de los archivos.
      const driveItems = await graphClient.api('/me/drive/root/children').get();

      // 🧹 LIMPIEZA DE DATOS (DTO)
      // Recorremos la respuesta de Microsoft y armamos nuestros propios objetos limpios
      const cleanData = driveItems.value.map((item: any) => ({
        id: item.id,
        name: item.name,
        isFolder: !!item.folder, // Si Microsoft nos manda la propiedad 'folder', esto da true
        size: item.size, // Tamaño en bytes
        lastModified: item.lastModifiedDateTime,
        url: item.webUrl // Un link directo por si en el front quieren abrirlo en el navegador
      }));

      // 4. Respuesta limpia al cliente
      res.json({
        success: true,
        count: cleanData.length,
        data: cleanData
      });

    } catch (error: any) {
      console.error("Error crítico al obtener la estructura de OneDrive:", error.message);
      res.status(500).json({ 
        error: "Fallo al conectar con los servicios de almacenamiento de Microsoft." 
      });
    }
  }); 

  /**
   * @route GET /api/dashboard/stats
   * @description Obtiene estadísticas de almacenamiento y archivos recientes para el Dashboard.
   * @access Protegido (Requiere sesión activa y accessToken)
   */
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const user = (req.session as any).user;
      
      if (!user || !user.accessToken) {
        return res.status(401).json({ error: "No autorizado." });
      }

      const graphClient = Client.init({
        authProvider: (done) => {
          done(null, user.accessToken);
        }
      });

      // 🚀 TRUCO NINJA: Peticiones en paralelo para mayor velocidad
      const [driveInfo, recentItems] = await Promise.all([
        graphClient.api('/me/drive').get(), // Trae la cuota de almacenamiento
        graphClient.api('/me/drive/recent').top(5).get() // Trae los 5 archivos más recientes
      ]);

      // 🧹 DTO: Empaquetamos todo limpio para el Frontend
      const stats = {
        storage: {
          totalBytes: driveInfo.quota?.total || 0,
          usedBytes: driveInfo.quota?.used || 0,
          remainingBytes: driveInfo.quota?.remaining || 0,
          // Calculamos el porcentaje de uso directamente en el backend
          usedPercentage: driveInfo.quota?.total 
            ? Math.round((driveInfo.quota.used / driveInfo.quota.total) * 100) 
            : 0
        },
        recentFiles: recentItems.value.map((item: any) => ({
          id: item.id,
          name: item.name,
          lastModified: item.lastModifiedDateTime,
          url: item.webUrl,
          size: item.size
        }))
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      console.error("Error al obtener estadísticas del dashboard:", error.message);
      res.status(500).json({ error: "Fallo al obtener las estadísticas." });
    }
  });

  // ====================================================================
  // AQUI IRÁN TUS NUEVOS ENDPOINTS DEL MÓDULO DE LICITACIONES
  // (GET /api/licitaciones, POST /api/propuestas, etc.)
  // ====================================================================

  return httpServer;
}