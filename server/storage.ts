import {
  auditLogs, type AuditLog, type InsertAuditLog,
  licitaciones, type Licitacion, type InsertLicitacion,
  users, files, folders, type Folder, type InsertFolder
} from "@shared/schema";
import { db, pool } from "./db";
import { desc, eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getRecentAuditLogs(limit?: number): Promise<AuditLog[]>;
  getLicitaciones(): Promise<Licitacion[]>;
  createLicitacion(licitacion: InsertLicitacion): Promise<Licitacion>;


  getFolders(userId: number): Promise<Folder[]>;
  createFolder(folder: InsertFolder): Promise<Folder>;

  getAllFiles(): Promise<any[]>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  constructor() {
    this.sessionStore = new PostgresSessionStore({ pool, createTableIfMissing: true });
  }


  async getFolders(userId: number): Promise<Folder[]> {
    return await db
      .select()
      .from(folders)
      .where(eq(folders.userId, userId))
      .orderBy(desc(folders.createdAt));
  }

  async createFolder(insertFolder: InsertFolder): Promise<Folder> {
    const [folder] = await db.insert(folders).values(insertFolder).returning();
    return folder;
  }

  // Licitaciones
  async getLicitaciones(): Promise<Licitacion[]> {
    return await db.select().from(licitaciones).orderBy(desc(licitaciones.id));
  }

  async createLicitacion(insertLicitacion: InsertLicitacion): Promise<Licitacion> {
    const [licitacion] = await db.insert(licitaciones).values(insertLicitacion).returning();
    return licitacion;
  }


  async getAllFiles(): Promise<any[]> {
    return await db
      .select({
        id: files.id,
        originalName: files.originalName,
        size: files.size,
        uploadedAt: files.uploadedAt,
        mimeType: files.mimeType,
        contractId: files.contractId,
        correo: users.correo,
      })
      .from(files)
      .leftJoin(users, eq(files.uploaderId, users.id))
      .orderBy(desc(files.uploadedAt));
  }


  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(log).returning();
    return auditLog;
  }

  async getRecentAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }
}

export const storage = new DatabaseStorage();