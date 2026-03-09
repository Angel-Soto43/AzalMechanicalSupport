import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==========================================
// TABLAS DEL SISTEMA BASE
// ==========================================

// Session table - created by connect-pg-simple for Express session management
export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: text("sess").notNull(), // JSON stringified session data
  expire: timestamp("expire").notNull(),
});

// Audit logs table - tracks all system actions
// Nota: 'userId' fue eliminado preventivamente para no romper dependencias.
// Los ajustes finales de esta tabla corresponden al Día 4.
export const auditLogs = pgTable("audit_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  action: text("action").notNull(), 
  resourceType: text("resource_type"), 
  resourceId: integer("resource_id"),
  details: text("details"),
  correo: varchar("correo", { length: 255 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ==========================================
// AQUI IRÁN LAS NUEVAS TABLAS DE LICITACIONES
// (proveedores, licitaciones, propuestas)
// ==========================================


// ==========================================
// SCHEMAS Y TIPOS
// ==========================================

export const insertAuditLogSchema = createInsertSchema(auditLogs);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ==========================================
// MOCKS TEMPORALES PARA EL FRONTEND
// (Eliminar cuando el Front termine de limpiar las vistas)
// ==========================================

export const loginSchema = z.any();
export type LoginInput = any;

export const createUserSchema = z.any();
export type CreateUserInput = any;

export const updateUserSchema = z.any();
export type UpdateUserInput = any;

export type User = any;