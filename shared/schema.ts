import { pgTable, text, varchar, timestamp, integer, serial, boolean, bigint, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==========================================
// INTERFACES Y TIPOS
// ==========================================
export interface RawQuoteLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitMeasure?: string;
  techRequirements?: string;
  versionReference?: string;
  unitPrice: number;
  amount?: number;
}

export interface NormalizedQuoteLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitMeasure: string;
  techRequirements: string;
  versionReference: string;
  unitPriceCents: number;
  amountCents: number;
}

// ==========================================
// ENTIDADES DE LA BASE DE DATOS (ESQUEMAS)
// ==========================================

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

export const providers = pgTable("providers", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  businessActivity: text("business_activity").notNull().default(""), 
  legalAddress: text("legal_address").notNull().default(""), 
  rfc: text("rfc").notNull().default(""), 
  website: text("website").default(""), 
  legalRepresentative: text("legal_representative").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),

  // 🚀 NUEVOS CAMPOS: DATOS BANCARIOS DEL PROVEEDOR (VINCULADOS DESDE EL MODAL)
  bankName: text("bank_name").notNull().default(""),
  bankAccount: varchar("bank_account", { length: 50 }).notNull().default(""),
  bankBeneficiary: text("bank_beneficiary").notNull().default(""),

});

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  internalFolio: text("internal_folio").notNull().unique(),
  destinationCompany: text("destination_company").notNull(),
  requisitionNumber: text("requisition_number").notNull(),
  projectTitle: text("project_title").notNull(),
  quoteDate: text("quote_date").notNull(),
  commercialTerms: text("commercial_terms").notNull(),
  validityDays: integer("validity_days").notNull().default(120),
  paymentDays: integer("payment_days").notNull().default(0),
  deliveryTime: text("delivery_time").notNull().default(""),
  manufacturingTime: text("manufacturing_time").notNull().default(""),
  guaranteeMonths: integer("guarantee_months").notNull().default(0),
  compliancePercentage: numeric("compliance_percentage", { precision: 10, scale: 2 }).notNull().default("0.00"),
  deliveryPlace: text("delivery_place").notNull().default(""),
  contactPerson: text("contact_person").notNull().default(""),
  
  // CONDICIONES LEGALES CORPORATIVAS DEL PDF
  complianceWarranty: integer("compliance_warranty").notNull().default(0),
  goodsOrigin: text("goods_origin").notNull().default(""),
  providerNationality: text("provider_nationality").notNull().default(""),
  experienceYears: integer("experience_years").notNull().default(0),
  specialtyYears: integer("specialty_years").notNull().default(0),
  similarContracts: integer("similar_contracts").notNull().default(0),
  bankName: text("bank_name").notNull().default(""),
  bankAccount: text("bank_account").notNull().default(""),
  bankBeneficiary: text("bank_beneficiary").notNull().default(""),

  providerId: integer("provider_id").references(() => providers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),

  // 🚀 TAREAS 2 y 3: Campos relacionales añadidos de forma limpia y única
  empresaId: integer("empresa_id").references(() => providers.id), // Llave foránea real hacia empresas
  templateName: varchar("template_name", { length: 100 }).default("azal_official"), // Selección de plantilla

  companyOrigin: text("company_origin").notNull().default("AZAL"),
  proposalType: text("proposal_type").notNull().default("bienes"),

  // ─── Sección 1 "Atención" ────────────────────────────────────────────────
  attnDia: text("attn_dia").notNull().default(""),
  attnMes: text("attn_mes").notNull().default(""),
  attnAnio: text("attn_anio").notNull().default(""),
  attnLugar: text("attn_lugar").notNull().default(""),
  attnGrado: text("attn_grado").notNull().default(""),
  attnArea: text("attn_area").notNull().default(""),
  attnUbicacion: text("attn_ubicacion").notNull().default(""),
  attnDireccion: text("attn_direccion").notNull().default(""),
  attnCargo: text("attn_cargo").notNull().default(""),
  attnContacto: text("attn_contacto").notNull().default(""),

  // ─── Sección 2 "Condiciones comerciales" ─────────────────────────────────
  paymentTerms: text("payment_terms").notNull().default(""),
  hasManufacturingTime: boolean("has_manufacturing_time").notNull().default(false),
  deliverySingle: boolean("delivery_single").notNull().default(true),
  deliveryLocationsJson: text("delivery_locations_json").notNull().default("[]"),

  // ─── Sección 3 "Garantías y objetos sociales" ────────────────────────────
  qualityGuaranteesJson: text("quality_guarantees_json").notNull().default("[]"),
  selectedSocialObjectsJson: text("selected_social_objects_json").notNull().default("[]"),
});

export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").references(() => quotes.id),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unit: text("unit").notNull(),
  unitMeasure: text("unit_measure").notNull().default(""),
  techRequirements: text("tech_requirements").notNull().default(""),
  versionReference: text("version_reference").notNull().default(""),
  reqDate: text("req_date").notNull().default(""), 
  unitPrice: integer("unit_price").notNull().default(0),
  amount: integer("amount").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
  // DATOS INTERNOS DE GESTIÓN (OCULTOS EN EL PDF FINAL)
  supplier: text("supplier").default(""),
  purchaseCost: numeric("purchase_cost", { precision: 15, scale: 2 }).default("0"),
  profitMargin: numeric("profit_margin", { precision: 10, scale: 2 }).default("0"),
  profitFactor: numeric("profit_factor", { precision: 10, scale: 2 }).default("1"),
  noPartida: text("no_partida").notNull().default(""),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  correo: text("correo").notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
});

export const folders = pgTable("folders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  contractId: text("contract_id"),
  supplier: text("supplier"),
  version: integer("version").default(1),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  folderId: integer("folder_id").references(() => folders.id),
  previousVersionId: integer("previous_version_id"),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by").references(() => users.id),
});

// ==========================================
// ESQUEMAS DE VALIDACIÓN ZOD Y INFERENCIA
// ==========================================
export const insertLicitacionSchema = createInsertSchema(licitaciones);
export const insertProviderSchema = createInsertSchema(providers);
export const insertQuoteSchema = createInsertSchema(quotes);
export const insertQuoteItemSchema = createInsertSchema(quoteItems);
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const insertUserSchema = createInsertSchema(users);
export const insertFileSchema = createInsertSchema(files);
export const insertFolderSchema = createInsertSchema(folders);

export type Licitacion = typeof licitaciones.$inferSelect;
export type InsertLicitacion = typeof licitaciones.$inferInsert;
export type Provider = typeof providers.$inferSelect;
export type InsertProvider = typeof providers.$inferInsert;
export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = typeof quotes.$inferInsert;
export type QuoteItem = typeof quoteItems.$inferSelect;
export type InsertQuoteItem = typeof quoteItems.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type User = typeof users.$inferSelect & { displayName?: string };
export type File = typeof files.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type InsertFolder = typeof folders.$inferInsert;

export const loginSchema = z.object({ username: z.string(), password: z.string() });
export type LoginInput = z.infer<typeof loginSchema>;