import { auditLogs, type AuditLog, type InsertAuditLog, licitaciones, type Licitacion, type InsertLicitacion } from "@shared/schema";
import { db, pool } from "./db";
import { desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getRecentAuditLogs(limit?: number): Promise<AuditLog[]>;
  getLicitaciones(): Promise<Licitacion[]>;
  createLicitacion(licitacion: InsertLicitacion): Promise<Licitacion>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  constructor() {
    this.sessionStore = new PostgresSessionStore({ pool, createTableIfMissing: true });
  }

  async getLicitaciones(): Promise<Licitacion[]> {
    return await db.select().from(licitaciones).orderBy(desc(licitaciones.id));
  }

  async createLicitacion(insertLicitacion: InsertLicitacion): Promise<Licitacion> {
    const [licitacion] = await db.insert(licitaciones).values(insertLicitacion).returning();
    return licitacion;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(log).returning();
    return auditLog;
  }

  async getRecentAuditLogs(limit: number = 10): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }
}

export const storage = new DatabaseStorage();