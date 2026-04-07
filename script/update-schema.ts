import "dotenv/config";
import { Pool } from '@neondatabase/serverless';

async function updateSchema() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts integer DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until timestamp;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login timestamp;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();
      ALTER TABLE users ADD COLUMN IF NOT EXISTS access_token text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token text;
    `);
    console.log("Schema updated");
  } catch (error) {
    console.error("Error updating schema:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

updateSchema();