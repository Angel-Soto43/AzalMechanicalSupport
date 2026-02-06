import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { hashPassword } from "../server/auth";

async function createAdmin() {
  const passwordHashed = await hashPassword("admin123");

  await db.insert(users).values({
    username: "admin",
    password: passwordHashed,
    fullName: "Administrador",
    isAdmin: true,
    isActive: true,
  });

  console.log("✅ Usuario admin creado");
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error("❌ Error creando usuario", err);
  process.exit(1);
});
