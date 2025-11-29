import { storage } from "./storage";
import { hashPassword } from "./auth";

async function seed() {
  console.log("Checking for existing admin user...");
  
  const existingAdmin = await storage.getUserByUsername("admin");
  
  if (existingAdmin) {
    console.log("Admin user already exists, skipping seed.");
    return;
  }

  console.log("Creating admin user (Víctor Hernández)...");
  
  const hashedPassword = await hashPassword("admin123");
  
  const admin = await storage.createUser({
    username: "admin",
    password: hashedPassword,
    fullName: "Víctor Hernández",
    isAdmin: true,
    isActive: true,
  });

  console.log(`Admin user created successfully!`);
  console.log(`Username: admin`);
  console.log(`Password: admin123`);
  console.log(`Full Name: ${admin.fullName}`);

  // Create audit log for initial setup
  await storage.createAuditLog({
    userId: admin.id,
    action: "user_created",
    resourceType: "user",
    resourceId: admin.id,
    details: "Configuración inicial del sistema - Usuario administrador creado",
    ipAddress: "system",
    userAgent: "system",
  });

  console.log("Seed completed!");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
