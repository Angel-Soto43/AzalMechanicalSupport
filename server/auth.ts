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
    console.log("📝 serializeUser called with user:", user?.id, user?.correo);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    console.log("🔄 deserializeUser called with id:", id);
    try {
      const user = await storage.getUserById(id);
      console.log("✅ User fetched:", user?.id, user?.correo, !!user?.accessToken);
      done(null, user);
    } catch (error) {
      console.error("❌ Error in deserializeUser:", error);
      done(error, null);
    }
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
    
    // 🔑 SCOPES para obtener Token de Microsoft Graph
    scope: [
      'openid',
      'profile',
      'offline_access',
      'User.Read',
      'Files.Read',
      'Files.Read.All',
      'Files.ReadWrite',
      'Files.ReadWrite.All',
    ],
    
    state: false,
    nonce: false,
    clockSkew: 3600,
  },
  async (iss: any, sub: any, profile: any, accessToken: any, refreshToken: any, done: any) => {
    console.log('🔐 OIDC callback called with profile:', profile?.displayName, 'accessToken:', !!accessToken);
    if (!profile) {
      console.error('❌ No profile in OIDC callback');
      return done(null, false);
    }

    const email = profile._json?.email || profile._json?.preferred_username || profile.upn;
    console.log('📧 Email extracted:', email);
    if (!email) {
      console.error('❌ No email found in profile');
      return done(new Error('No se encontró correo del usuario en el perfil de Microsoft'));
    }

    const fullName = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() || email;
    console.log('👤 Full name:', fullName);

    try {
      const localUser = await storage.getOrCreateUserByEmail(email, fullName);
      console.log('✅ Local user created/found:', localUser.id, localUser.correo);
      await storage.updateUserTokens(localUser.id, accessToken, refreshToken);
      console.log('✅ Tokens updated for user');
      const user = {
        ...localUser,
        accessToken,
        refreshToken,
        microsoftProfile: profile._json,
      };
      console.log('🔑 User with tokens created');
      return done(null, user);
    } catch (error) {
      console.error('❌ Error in getOrCreateUserByEmail or updateTokens:', error);
      return done(error);
    }
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
    }, (err: any, user: any, info: any) => {
      if (err) {
        console.error('Auth callback error:', err);
        return res.redirect('/auth');
      }
      if (!user) {
        console.error('Auth callback no user:', info);
        return res.redirect('/auth');
      }

      req.logIn(user, (loginErr: any) => {
        if (loginErr) {
          console.error('Error en req.logIn:', loginErr);
          return next(loginErr);
        }

        req.session.save((saveErr: any) => {
          if (saveErr) {
            console.error('Error saving session after auth:', saveErr);
          }
          res.redirect('/');
        });
      });
    })(req, res, next);
  };

  app.post('/api/auth/callback', callbackHandler);
  app.get('/api/auth/callback', callbackHandler);

  app.get("/api/user", (req, res) => {
    console.log("🔍 /api/user called - isAuthenticated:", req.isAuthenticated(), "sessionID:", req.sessionID, "user:", !!req.user);
    if (!req.isAuthenticated()) {
      console.log("❌ Not authenticated");
      return res.sendStatus(401);
    }
    console.log("✅ Returning user:", req.user.id, req.user.correo);
    res.json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error('Error destruyendo sesión al salir:', destroyErr);
        }
        res.clearCookie('connect.sid');
        res.sendStatus(200);
      });
    });
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).send("No autorizado.");
  }
  next();
}