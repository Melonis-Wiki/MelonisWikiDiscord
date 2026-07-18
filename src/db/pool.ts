import pg from "pg";
import { config } from "../config/env.js";

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 8,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 8_000
});

export async function closePool(): Promise<void> {
  await pool.end();
}
