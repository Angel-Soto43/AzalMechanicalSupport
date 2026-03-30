import { storage } from "./storage";

async function seed() {
  await storage.createAuditLog({
    action: "system_init",
    resourceType: "system",
    details: "Base de datos depurada e inicializada para el nuevo módulo.",
    correo: "sistema@toccel.com", 
    userAgent: "system-seeder",
  });
}

seed()
  .then(() => process.exit(0))
  .catch((_error) => {
    process.exit(1);
  });