import { Pool } from "pg";
import { env } from "../../lib/env";

async function main() {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 1,
  });

  console.log("Cleaning up conflicting enums...");
  try {
    await pool.query('DROP TYPE IF EXISTS provider_type, role, run_status, step_status, verdict CASCADE;');
    console.log("Enums cleaned up successfully.");
  } catch (err) {
    console.error("Failed to clean up enums:", err);
  } finally {
    await pool.end();
  }
}

main();
