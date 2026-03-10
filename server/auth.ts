import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { OIDCStrategy } from "passport-azure-ad";
import { storage } from "./storage";

const SESSION_MAX_AGE = 30 * 60 * 1000;

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set for secure session management");
  }

  // 1. Configuración de Sesiones
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: true, // Cambiado a true para estabilidad en el callback
    saveUninitialized: true,
    store: storage.sessionStore,
    cookie: {
      maxAge: SESSION_MAX_AGE,
      httpOnly: true,
      secure: false, // Debe ser false en localhost
      sameSite: "lax",
    },
    rolling: true,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));

  // 2. Inicializar Passport
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((obj: any, done) => {
    done(null, obj);
  });

  // 3. Estrategia de Microsoft Azure AD
  passport.use('azuread-openidconnect', new OIDCStrategy({
    identityMetadata: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/v2.0/.well-known/openid-configuration`,
    clientID: process.env.MICROSOFT_CLIENT_ID!,
    responseType: 'code id_token',
    responseMode: 'form_post',
    redirectUrl: process.env.MICROSOFT_REDIRECT_URI!,
    allowHttpForRedirectUrl: true,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    validateIssuer: false,
    passReqToCallback: false,
    scope: ['profile', 'offline_access', 'user.read', 'email'],
    useCookieInsteadOfSession: false, // Cambiado a false para usar la sesión de express
    loggingLevel: 'info'
  }, // <--- AQUÍ SE CIERRAN LAS OPCIONES
  async (iss: any, sub: any, profile: any, accessToken: any, refreshToken: any, done: any) => {
    if (!profile.oid) {
      return done(new Error("No se encontró el OID de Microsoft"), null);
    }
    return done(null, profile);
  }));

  // 4. Rutas de Autenticación
  app.get('/api/auth/azure',
    passport.authenticate('azuread-openidconnect', { failureRedirect: '/auth' })
  );

  app.post('/api/auth/callback', (req, res, next) => {
    passport.authenticate('azuread-openidconnect', {
      failureRedirect: '/auth',
      failureMessage: true
    }, (err, user) => {
      if (err) {
        console.error("❌ ERROR DE AZURE:", err);
        return res.status(500).send("Error técnico en el servidor.");
      }
      if (!user) return res.redirect('/auth');

      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.redirect('/');
      });
    })(req, res, next);
  });

  /*app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });*/

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).send("No autorizado.");
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).send("No autorizado.");
  }
  next();
}