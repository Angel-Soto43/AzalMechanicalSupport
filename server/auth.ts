import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { storage } from "./storage";

const SESSION_MAX_AGE = 30 * 60 * 1000;

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set for secure session management");
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: SESSION_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
    rolling: true,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  
  // ¡Adiós Passport y validaciones locales!
}

// ========================================================
// REFACTORIZACIÓN DÍA 5: BACKEND SIN VALIDACIÓN POR ROL
// ========================================================

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Como ya no hay roles ni login local, dejamos pasar la petición.
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Sin validación por rol: todos los llamados pasan directo al controlador.
  next();
}