import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth } from "./auth";

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ FUNCIÓN LOG LIMPIA (Sin hora, como la tenías antes)
export function log(message: string) {
  console.log(message);
}

(async () => {

  // 🟢 ESTO ES LO QUE FALTA: Conectamos Passport y las sesiones
  setupAuth(app);
  // 1. Registramos las rutas de la API (incluyendo el login de Microsoft)
  await registerRoutes(app, httpServer);

  // Manejo de errores
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  // 2. Configuración de Vite o Estáticos
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // 3. Definición de variables y encendido del servidor
  const port = parseInt(process.env.PORT || "5000", 10);
  const host = "localhost";

  httpServer.listen(
    {
      port,
      host,
    },
    () => {
     
      log(`serving on http://localhost:${port}`);
    },
  );
})();