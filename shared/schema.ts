import { pgTable, text, varchar, timestamp, integer, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";


export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});


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


export const licitaciones = pgTable("licitaciones", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  numeroLicitacion: text("numero_licitacion").notNull().unique(),
  cliente: text("cliente").notNull(),
  estado: text("estado").notNull().default("abierta"),
  fechaCierre: text("fecha_cierre"),
  presupuesto: integer("presupuesto").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});


export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  correo: text("correo").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: text("is_admin").default("false"),
  lastLogin: timestamp("last_login"),
});


export const folders = pgTable("folders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  contractId: text("contract_id"),
  supplier: text("supplier"),
  version: integer("version").default(1),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  uploaderId: integer("uploader_id").references(() => users.id),
});


export const insertLicitacionSchema = createInsertSchema(licitaciones);
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const insertUserSchema = createInsertSchema(users);
export const insertFileSchema = createInsertSchema(files);
export const insertFolderSchema = createInsertSchema(folders);


export type Licitacion = typeof licitaciones.$inferSelect;
export type InsertLicitacion = typeof licitaciones.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type User = typeof users.$inferSelect;
export type File = typeof files.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type InsertFolder = typeof folders.$inferInsert;


export const loginSchema = z.object({ username: z.string(), password: z.string() });