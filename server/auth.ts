import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}


const SESSION_MAX_AGE = 30 * 60 * 1000;


const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION = 15 * 60 * 1000; // 15 minutes

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
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          return done(null, false, { message: "Usuario no encontrado" });
        }

        
        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
          return done(null, false, { message: "Cuenta bloqueada temporalmente" });
        }

        
        if (!user.isActive) {
          return done(null, false, { message: "Cuenta desactivada" });
        }

        const isValid = await comparePasswords(password, user.password);
        
        if (!isValid) {
          // Increment failed attempts
          const newAttempts = (user.failedLoginAttempts || 0) + 1;
          const lockedUntil = newAttempts >= MAX_FAILED_ATTEMPTS 
            ? new Date(Date.now() + LOCK_DURATION) 
            : null;
          
          await storage.updateUser(user.id, { 
            failedLoginAttempts: newAttempts,
            lockedUntil
          });

          return done(null, false, { message: "Contraseña incorrecta" });
        }

        
        await storage.updateUser(user.id, {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLogin: new Date()
        });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  
  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const userAgent = req.get("User-Agent") || "unknown";

    passport.authenticate("local", async (err: any, user: SelectUser | false, info: any) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        
        await storage.createAuditLog({
          userId: null,
          action: "login_failed",
          resourceType: "session",
          details: `Intento fallido para usuario: ${req.body.username}`,
          ipAddress: ip,
          userAgent,
        });

        
        const existingUser = await storage.getUserByUsername(req.body.username);
        if (existingUser?.lockedUntil && new Date(existingUser.lockedUntil) > new Date()) {
          return res.status(423).send("Cuenta bloqueada temporalmente por múltiples intentos fallidos");
        }

        return res.status(401).send(info?.message || "Credenciales inválidas");
      }

      req.login(user, async (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }

        
        await storage.createAuditLog({
          userId: user.id,
          action: "login",
          resourceType: "session",
          details: `Inicio de sesión exitoso`,
          ipAddress: ip,
          userAgent,
        });

        
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  
  app.post("/api/logout", async (req, res, next) => {
    const userId = req.user?.id;
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const userAgent = req.get("User-Agent") || "unknown";

    req.logout(async (err) => {
      if (err) {
        return next(err);
      }

      if (userId) {
        await storage.createAuditLog({
          userId,
          action: "logout",
          resourceType: "session",
          details: "Cierre de sesión",
          ipAddress: ip,
          userAgent,
        });
      }

      res.sendStatus(200);
    });
  });

  
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    const { password, ...userWithoutPassword } = req.user!;
    res.json(userWithoutPassword);
  });
}


export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).send("No autenticado");
  }
  next();
}


export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).send("No autenticado");
  }
  if (!req.user?.isAdmin) {
    return res.status(403).send("Acceso denegado - Se requieren permisos de administrador");
  }
  next();
}
