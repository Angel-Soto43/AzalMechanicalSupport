import { storage } from "../server/storage";
import fs from "fs";
import path from "path";

(async () => {
  try {
    console.log("Creating test folder...");
    const folder = await storage.createFolder({
      name: `e2e-delete-test-soft-${Date.now()}`,
      parentId: null,
      userId: 1,
    } as any);

    console.log("Folder created", folder.id);

    // create a file record in DB
    const file = await storage.createFile({
      contractId: "test",
      supplier: "test",
      folderId: folder.id,
      filename: `test-soft-${Date.now()}.txt`,
      originalName: "test.txt",
      mimeType: "text/plain",
      size: 10,
      uploadedBy: 1,
      previousVersionId: null,
    } as any);

    console.log("File record created", file.id, file.filename);

    // ensure uploads dir exists and create the physical file so removeFilePermanently can unlink it
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, file.filename);
    fs.writeFileSync(filePath, "test content");
    console.log("Physical file created at", filePath);

    // Soft-delete the file first
    console.log("Soft-deleting file", file.id);
    await storage.deleteFile(file.id, 1);
    const afterSoft = await storage.getFileIncludingDeleted(file.id);
    console.log("File after soft-delete (isDeleted should be true):", afterSoft?.isDeleted);

    console.log("Calling deleteFolder for", folder.id);
    await storage.deleteFolder(folder.id, 1);
    console.log("deleteFolder completed");

    const check = await storage.getFileIncludingDeleted(file.id);
    console.log("File after deleteFolder (should be undefined):", check);

  } catch (err) {
    console.error("Error during test-delete-folder-soft:", err);
    process.exit(1);
  }
  process.exit(0);
})();
