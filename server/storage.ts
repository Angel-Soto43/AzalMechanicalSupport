import {
  users,
  files,
  folders,
  auditLogs,
  type User,
  type InsertUser,
  type File,
  type InsertFile,
  type Folder,
  type InsertFolder,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, and, gte, lte, like, isNull, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Files
  getFile(id: number): Promise<File | undefined>;
  getFileVersions(fileId: number): Promise<File[]>;
  getFilesByUser(userId: number): Promise<File[]>;
  getFilesByFolder(folderId: number): Promise<File[]>;
  getAllFiles(): Promise<File[]>;
  getRecentFiles(limit?: number): Promise<File[]>;
  getSharedFiles(excludeUserId: number): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, data: Partial<File>): Promise<File | undefined>;
  deleteFile(id: number, deletedBy: number): Promise<void>;
  searchFiles(params: { contractId?: string; uploaderId?: number; startDate?: Date; endDate?: Date }): Promise<File[]>;
  
  // Folders
  getFolderById(id: number): Promise<Folder | undefined>;
  getFolderPath(folderId: number): Promise<Folder[]>;
  getRootFolders(): Promise<Folder[]>;
  getFoldersByParent(parentId: number): Promise<Folder[]>;
  createFolder(data: InsertFolder): Promise<Folder>;
  deleteFolder(id: number): Promise<void>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  getRecentAuditLogs(limit?: number): Promise<AuditLog[]>;
  
  // Stats
  getStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    recentUploads: number;
    activeUsers: number;
  }>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  async getFolderPath(folderId: number): Promise<Folder[]> {
  const path: Folder[] = [];

  let current = await this.getFolderById(folderId);

  while (current) {
    path.unshift(current);

    if (current.parentId === null) break;

    current = await this.getFolderById(current.parentId);
  }

  return path;
}


  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Files
  async getFile(id: number): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(
      and(eq(files.id, id), eq(files.isDeleted, false))
    );
    return file;
  }
  async getFileIncludingDeleted(id: number): Promise<File | undefined> {
  const [file] = await db
    .select()
    .from(files)
    .where(eq(files.id, id));

  return file;
}
  async getFileVersions(fileId: number): Promise<File[]> {
  const file = await this.getFileIncludingDeleted(fileId);
  if (!file) return [];

  const versions: File[] = [file];

  let current = file;
  while (current.previousVersionId) {
    const prev = await this.getFileIncludingDeleted(
      current.previousVersionId
    );
    if (!prev) break;

    versions.push(prev);
    current = prev;
  }

  return versions.sort((a, b) => a.version - b.version);
}



  async getFilesByUser(userId: number): Promise<File[]> {
    return db
      .select()
      .from(files)
      .where(and(eq(files.uploadedBy, userId), eq(files.isDeleted, false)))
      .orderBy(desc(files.uploadedAt));
  }

  async getAllFiles(): Promise<File[]> {
    return db
      .select()
      .from(files)
      .where(eq(files.isDeleted, false))
      .orderBy(desc(files.uploadedAt));
  }
  // FILES BY FOLDER
  async getFilesByFolder(folderId: number) {
    return db
      .select()
      .from(files)
      .where(
        and(
          eq(files.folderId, folderId),
          eq(files.isDeleted, false)
        )
      )
      .orderBy(desc(files.uploadedAt));
  }


  async getRecentFiles(limit: number = 10): Promise<File[]> {
    return db
      .select()
      .from(files)
      .where(eq(files.isDeleted, false))
      .orderBy(desc(files.uploadedAt))
      .limit(limit);
  }

  async createFile(insertFile: InsertFile): Promise<File> {
  let version = 1;

  if (insertFile.previousVersionId) {
    const previousFile = await this.getFile(insertFile.previousVersionId);

    if (previousFile) {
      version = previousFile.version + 1;
    }
  }

  const [file] = await db
    .insert(files)
    .values({
      ...insertFile,
      version,
    })
    .returning();

  return file;
}

  async updateFile(id: number, data: Partial<File>): Promise<File | undefined> {
    const [file] = await db
      .update(files)
      .set(data)
      .where(eq(files.id, id))
      .returning();
    return file;
  }

  async deleteFile(id: number, deletedBy: number): Promise<void> {
    await db
      .update(files)
      .set({ isDeleted: true, deletedAt: new Date(), deletedBy })
      .where(eq(files.id, id));
  }

  async searchFiles(params: { 
    contractId?: string; 
    uploaderId?: number; 
    startDate?: Date; 
    endDate?: Date 
  }): Promise<File[]> {
    const conditions = [eq(files.isDeleted, false)];

    if (params.contractId) {
      conditions.push(like(files.contractId, `%${params.contractId}%`));
    }
    if (params.uploaderId) {
      conditions.push(eq(files.uploadedBy, params.uploaderId));
    }
    if (params.startDate) {
      conditions.push(gte(files.uploadedAt, params.startDate));
    }
    if (params.endDate) {
      conditions.push(lte(files.uploadedAt, params.endDate));
    }

    return db
      .select()
      .from(files)
      .where(and(...conditions))
      .orderBy(desc(files.uploadedAt));
  }

  async getSharedFiles(excludeUserId: number): Promise<File[]> {
    return db
      .select()
      .from(files)
      .where(and(eq(files.isDeleted, false)))
      .orderBy(desc(files.uploadedAt));
  }
  
  
  async getFolderById(id: number) {
  const [folder] = await db
    .select()
    .from(folders)
    .where(eq(folders.id, id));

  return folder;
}

  async getRootFolders() {
    return db
      .select()
      .from(folders)
      .where(isNull(folders.parentId))
      .orderBy(folders.name);
  }

  async getFoldersByParent(parentId: number) {
    return db
      .select()
      .from(folders)
      .where(eq(folders.parentId, parentId))
      .orderBy(folders.name);
  }

  async createFolder(insertFolder: InsertFolder) {
    const [folder] = await db
      .insert(folders)
      .values(insertFolder)
      .returning();
    return folder;
  }

  async deleteFolder(id: number) {
    await db.delete(folders).where(eq(folders.id, id));
  }

  
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(log).returning();
    return auditLog;
  }

  async getAuditLogs(limit?: number): Promise<AuditLog[]> {
    const query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }

  async getRecentAuditLogs(limit: number = 10): Promise<AuditLog[]> {
    return db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  
  async getStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    recentUploads: number;
    activeUsers: number;
  }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [fileStats] = await db
      .select({
        count: sql<number>`count(*)::int`,
        totalSize: sql<number>`coalesce(sum(${files.size}), 0)::bigint`,
      })
      .from(files)
      .where(eq(files.isDeleted, false));

    const [recentStats] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(files)
      .where(
        and(
          eq(files.isDeleted, false),
          gte(files.uploadedAt, sevenDaysAgo)
        )
      );

    const [userStats] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(users)
      .where(eq(users.isActive, true));

    return {
      totalFiles: fileStats?.count ?? 0,
      totalSize: Number(fileStats?.totalSize ?? 0),
      recentUploads: recentStats?.count ?? 0,
      activeUsers: userStats?.count ?? 0,
    };
  }
}

export const storage = new DatabaseStorage();
