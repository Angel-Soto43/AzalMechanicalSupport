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
    resave: true, 
    saveUninitialized: true,
    store: storage.sessionStore,
    cookie: {
      maxAge: SESSION_MAX_AGE,
      httpOnly: true,
      secure: false, // false para localhost
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
    identityMetadata: `https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration`,
    clientID: process.env.MICROSOFT_CLIENT_ID || '', 
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    responseType: 'code',
    responseMode: 'query',
    redirectUrl: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:5000/api/auth/callback',
    allowHttpForRedirectUrl: true,
    validateIssuer: false,
    passReqToCallback: false,
    scope: ['openid', 'profile', 'offline_access', 'user.read'],
    
    // 🛡️ RELAJAMOS LA SEGURIDAD PARA EVITAR EL "NULL"
    state: false,
    nonce: false,
    clockSkew: 3600, // Le damos 1 hora de margen de error al reloj
  },
  async (req: any, iss: any, sub: any, profile: any, accessToken: any, refreshToken: any, done: any) => {
    // Si llegamos aquí, Microsoft ya nos dio los datos
    if (!profile) return done(null, false);
    return done(null, profile);
  }
));

  // 4. Rutas de Autenticación
  app.get('/api/auth/microsoft', (req, res, next) => {
    passport.authenticate('azuread-openidconnect', { failureRedirect: '/auth' })(req, res, next);
  });

  const callbackHandler = (req: any, res: any, next: any) => {
    passport.authenticate('azuread-openidconnect', {
      failureRedirect: '/auth',
      failureMessage: true
    }, (err: any, user: any) => {
      if (err || !user) {
        return res.redirect('/auth');
      }

      req.logIn(user, (loginErr: any) => {
        if (loginErr) return next(loginErr);

        req.session.save(() => {
          res.redirect('/');
        });
      });
    })(req, res, next);
  };

  app.post('/api/auth/callback', callbackHandler);
  app.get('/api/auth/callback', callbackHandler);

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

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