# Azal Mechanical Supports - Cloud File Manager

## Overview

This is a secure cloud-based document management system built for Azal Mechanical Supports, an industrial supply company. The application enables centralized storage, management, and auditing of contracts and operational documents with enterprise-grade security compliance (ISO 27001, ISO 27002, IEEE 12207).

The system features role-based access control with a Chief Administrator (Víctor Hernández) who manages all users and has oversight of all file operations, while regular users can upload, view, and download their own files. All system activities are logged for audit purposes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18+ with TypeScript, built using Vite for development and production builds.

**UI Component System**: shadcn/ui components based on Radix UI primitives, styled with Tailwind CSS using the "New York" variant. The design follows Material Design principles with enterprise refinements, drawing inspiration from Google Drive's file management patterns.

**Routing**: Wouter for lightweight client-side routing with protected routes for authenticated users and admin-only routes for administrative functions.

**State Management**: 
- TanStack Query (React Query) for server state management with infinite stale time and disabled auto-refetch
- React Hook Form with Zod validation for form state
- React Context for authentication state

**Key Design Decisions**:
- Component-based architecture with clear separation between pages, components, and UI primitives
- Protected routes redirect unauthenticated users to login page
- Theme support (light/dark/system) with localStorage persistence
- Responsive design with mobile-first approach using Tailwind breakpoints

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js.

**Session Management**: Express-session with PostgreSQL session store (connect-pg-simple) for persistent sessions. Sessions expire after 30 minutes of inactivity.

**Authentication Strategy**:
- Custom username/password authentication using Passport.js with local strategy
- Password hashing using Node.js scrypt with random salts
- Failed login tracking with account lockout after 5 failed attempts (15-minute lock duration)
- No third-party OAuth providers (per requirement RF-01)

**File Upload Handling**: Multer middleware for multipart/form-data processing with:
- Local disk storage in `uploads/` directory
- 50MB file size limit
- Whitelist of allowed MIME types (documents, images, archives)
- Unique filename generation using timestamp and random suffix

**Security Measures**:
- Session secret required via environment variable
- HTTPS enforcement expected in production (TLS 1.2+)
- Password timing-safe comparison to prevent timing attacks
- Rate limiting capabilities (dependencies included)

**API Structure**: RESTful endpoints organized by resource type:
- `/api/login`, `/api/logout` - Authentication
- `/api/user` - Current user session
- `/api/users/*` - User management (admin only)
- `/api/files/*` - File operations
- `/api/audit-logs` - Audit trail access (admin only)

### Data Storage

**Database**: PostgreSQL via Neon serverless driver with WebSocket support.

**ORM**: Drizzle ORM with type-safe schema definitions and Zod integration for validation.

**Schema Design**:

1. **Users Table**: Stores user credentials, admin flags, account status, failed login tracking, and lockout timestamps
2. **Files Table**: Stores file metadata including contract ID, original/stored filenames, MIME type, size, uploader reference, upload timestamp, version tracking, and soft delete flags
3. **Audit Logs Table**: Records all system actions with user ID, action type, resource type/ID, IP address, user agent, and timestamp

**Key Decisions**:
- Soft deletes for files (isDeleted flag) to maintain audit trail
- Version tracking support for files with previousVersionId reference
- Audit logs capture all user actions including login attempts, file operations, and user management
- Session data stored in PostgreSQL for persistence across server restarts

**Migrations**: Managed through Drizzle Kit with migrations output to `migrations/` directory.

### External Dependencies

**Database Service**: Neon PostgreSQL serverless (requires DATABASE_URL environment variable).

**Core Backend Dependencies**:
- express - Web server framework
- passport / passport-local - Authentication
- express-session / connect-pg-simple - Session management
- multer - File upload handling
- drizzle-orm / drizzle-zod - Database ORM and validation
- bcrypt alternative: scrypt (built-in Node.js crypto)

**Core Frontend Dependencies**:
- react / react-dom - UI framework
- @tanstack/react-query - Server state management
- react-hook-form - Form state management
- zod - Schema validation
- wouter - Client-side routing
- date-fns - Date formatting and manipulation

**UI Component Library**: 
- @radix-ui/* - Headless UI primitives (dialog, dropdown, select, etc.)
- tailwindcss - Utility-first CSS framework
- class-variance-authority - Component variant management
- lucide-react - Icon library

**Build Tools**:
- vite - Frontend build tool and dev server
- esbuild - Server-side bundling for production
- typescript - Type safety across stack

**Development Tools**:
- @replit/vite-plugin-* - Replit-specific development enhancements (cartographer, dev-banner, runtime-error-modal)

**Font Loading**: Google Fonts API for Inter (primary), Roboto Mono (metadata), and additional display fonts.

**Environment Variables Required**:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for session encryption
- `NODE_ENV` - Environment mode (development/production)