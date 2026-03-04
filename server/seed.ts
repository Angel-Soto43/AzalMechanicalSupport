import { storage } from "./storage";

async function seed() {
  console.log("Iniciando seeder...");
  
  console.log("Las tablas de usuarios y archivos de la versión anterior han sido depuradas.");
  console.log("Esperando las nuevas entidades para inyectar datos de prueba...");

  // Probando que tu nueva tabla de auditoría (Día 4) funciona correctamente
  await storage.createAuditLog({
    action: "system_init",
    resourceType: "system",
    details: "Base de datos depurada e inicializada para el nuevo módulo.",
    correo: "sistema@toccel.com", 
    userAgent: "system-seeder",
  });

  console.log("Log de inicialización creado exitosamente en audit_logs.");
  console.log("Seed completado sin errores!");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });