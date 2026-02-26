import { storage } from "../server/storage";

async function findFolderByName(name: string) {
  const roots = await storage.getRootFolders();

  async function walk(list: any[]): Promise<any | null> {
    for (const f of list) {
      if (f.name === name) return f;
      const children = await storage.getFoldersByParent(f.id);
      const found = await walk(children);
      if (found) return found;
    }
    return null;
  }

  return await walk(roots as any[]);
}

(async () => {
  try {
    const name = process.argv[2] || "AzalMechanicalSupport";
    console.log("Searching for folder named:", name);
    const folder = await findFolderByName(name);
    if (!folder) {
      console.log("Folder not found");
      process.exit(1);
    }

    console.log("Found folder:", folder.id, folder.name);

    console.log("Attempting to delete folder...");
    await storage.deleteFolder(folder.id, 1);
    console.log("deleteFolder finished successfully");
  } catch (err) {
    console.error("Error deleting folder:", err);
    process.exit(1);
  }
  process.exit(0);
})();
