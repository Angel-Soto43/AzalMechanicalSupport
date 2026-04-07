import {
  auditLogs, type AuditLog, type InsertAuditLog,
  licitaciones, type Licitacion, type InsertLicitacion,
  users, files, folders, type Folder, type InsertFolder,
  type User
} from "@shared/schema";
import { db, pool } from "./db";
import { desc, eq, or } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getRecentAuditLogs(limit?: number): Promise<AuditLog[]>;
  getLicitaciones(): Promise<Licitacion[]>;
  createLicitacion(licitacion: InsertLicitacion): Promise<Licitacion>;

  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<User, "id" | "createdAt" | "lastLogin">): Promise<User>;
  getOrCreateUserByEmail(email: string, fullName: string): Promise<User>;
  updateUserTokens(id: number, accessToken: string, refreshToken: string): Promise<void>;

  getFolders(userId: number): Promise<Folder[]>;
  getRootFolders(userId: number): Promise<Folder[]>;
  getSubfolders(parentId: number): Promise<Folder[]>;
  getFolderById(folderId: number): Promise<Folder | undefined>;
  getFolderPath(folderId: number): Promise<Folder[]>;
  createFolder(folder: InsertFolder): Promise<Folder>;

  getFilesByFolder(folderId: number): Promise<any[]>;
  getAllFiles(): Promise<any[]>;
  createFile(file: any): Promise<any>;
  getFileById(fileId: number): Promise<any | undefined>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  constructor() {
    this.sessionStore = new PostgresSessionStore({ pool, createTableIfMissing: true });
  }


  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.correo, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(user: Omit<User, "id" | "createdAt" | "lastLogin">): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getOrCreateUserByEmail(email: string, fullName: string): Promise<User> {
    const existing = await this.getUserByEmail(email);
    if (existing) return existing;

    const password = `ms-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return await this.createUser({
      fullName,
      correo: email,
      password,
      isAdmin: false,
      isActive: true,
      failedLoginAttempts: 0,
    });
  }

  async updateUserTokens(id: number, accessToken: string, refreshToken: string): Promise<void> {
    await db.update(users).set({ accessToken, refreshToken }).where(eq(users.id, id));
  }

  async getFolders(userId: number): Promise<Folder[]> {
    return await db
      .select()
      .from(folders)
      .where(eq(folders.userId, userId))
      .orderBy(desc(folders.createdAt));
  }

  async getRootFolders(userId: number): Promise<Folder[]> {
    return await db
      .select()
      .from(folders)
      .where(eq(folders.userId, userId), eq(folders.parentId, null))
      .orderBy(desc(folders.createdAt));
  }

  async getSubfolders(parentId: number): Promise<Folder[]> {
    return await db
      .select()
      .from(folders)
      .where(eq(folders.parentId, parentId))
      .orderBy(desc(folders.createdAt));
  }

  async getFolderById(folderId: number): Promise<Folder | undefined> {
    const [folder] = await db
      .select()
      .from(folders)
      .where(eq(folders.id, folderId));
    return folder;
  }

  async getFolderPath(folderId: number): Promise<Folder[]> {
    const path: Folder[] = [];
    let current = await this.getFolderById(folderId);
    while (current) {
      path.unshift(current);
      if (!current.parentId) break;
      current = await this.getFolderById(current.parentId);
    }
    return path;
  }

  async createFolder(insertFolder: InsertFolder): Promise<Folder> {
    const [folder] = await db.insert(folders).values(insertFolder).returning();
    return folder;
  }

  async getFilesByFolder(folderId: number): Promise<any[]> {
    return await db
      .select({
        id: files.id,
        filename: files.filename,
        originalName: files.originalName,
        mimeType: files.mimeType,
        size: files.size,
        contractId: files.contractId,
        supplier: files.supplier,
        version: files.version,
        uploadedAt: files.uploadedAt,
        folderId: files.folderId,
        previousVersionId: files.previousVersionId,
        isDeleted: files.isDeleted,
        deletedAt: files.deletedAt,
        uploadedBy: files.uploadedBy,
        ownerCorreo: users.correo,
      })
      .from(files)
      .leftJoin(users, eq(files.uploadedBy, users.id))
      .where(eq(files.folderId, folderId), eq(files.isDeleted, false))
      .orderBy(desc(files.uploadedAt));
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
      .leftJoin(users, eq(files.uploadedBy, users.id))
      .where(eq(files.isDeleted, false))
      .orderBy(desc(files.uploadedAt));
  }

  async createFile(file: any): Promise<any> {
    const [created] = await db.insert(files).values(file).returning();
    return created;
  }

  async getFileById(fileId: number): Promise<any | undefined> {
    const [file] = await db
      .select({
        id: files.id,
        filename: files.filename,
        originalName: files.originalName,
        mimeType: files.mimeType,
        size: files.size,
        contractId: files.contractId,
        supplier: files.supplier,
        version: files.version,
        uploadedAt: files.uploadedAt,
        folderId: files.folderId,
        isDeleted: files.isDeleted,
        uploadedBy: files.uploadedBy,
      })
      .from(files)
      .where(eq(files.id, fileId));
    return file;
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
      .leftJoin(users, eq(files.uploadedBy, users.id))
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