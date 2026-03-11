import { pgTable, text, varchar, timestamp, integer, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==========================================
// TABLAS DEL SISTEMA BASE (Azal Mechanical)
// ==========================================

export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  resourceType: text("resource_type"),
  resourceId: integer("resource_id"),
  details: text("details"),
  correo: varchar("correo", { length: 255 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ==========================================
// TABLAS DEL SPRINT 1: LICITACIONES
// ==========================================

export const licitaciones = pgTable("licitaciones", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  numeroLicitacion: text("numero_licitacion").notNull().unique(),
  cliente: text("cliente").notNull(),
  estado: text("estado").notNull().default("abierta"),
  fechaCierre: timestamp("fecha_cierre"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Nota: Mantengo materiales por si lo usas después, pero está aislado.
export const materiales = pgTable("materiales", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  cantidad: integer("cantidad").notNull().default(0),
  unidad: text("unit").notNull(),
  ubicacion: text("ubicacion"),
});

// ==========================================
// SCHEMAS Y TIPOS
// ==========================================

export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const insertLicitacionSchema = createInsertSchema(licitaciones);
export const insertMaterialSchema = createInsertSchema(materiales);

export type AuditLog = typeof auditLogs.$inferSelect;
export type Licitacion = typeof licitaciones.$inferSelect;
export type Material = typeof materiales.$inferSelect;

export type InsertLicitacion = typeof licitaciones.$inferInsert;
export type InsertMaterial = typeof materiales.$inferInsert;

// ==========================================
// COMPATIBILIDAD Y AUTH (Mocks para evitar Errores de Vite)
// ==========================================

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const createUserSchema = z.object({
  username: z.string(),
  password: z.string(),
  fullName: z.string().optional(),
});

export const insertUserSchema = createUserSchema;

export const updateUserSchema = z.object({
  username: z.string().optional(),
  password: z.string().optional(),
  fullName: z.string().optional(),
  isAdmin: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type User = {
  id: number;
  username: string;
  fullName?: string;
  displayName?: string;
  email?: string;
  isAdmin: boolean;
  isActive: boolean;
};