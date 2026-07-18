import { pool } from "./pool.js";

export type WarningRecord = {
  id: string;
  moderator_id: string;
  reason: string;
  created_at: Date;
};

export type ModerationLogRecord = {
  action: string;
  moderator_id: string;
  reason: string;
  created_at: Date;
};

export async function addWarning(
  userId: string,
  moderatorId: string,
  reason: string
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO warnings (user_id, moderator_id, reason) VALUES ($1, $2, $3)",
      [userId, moderatorId, reason]
    );
    const result = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM warnings WHERE user_id = $1",
      [userId]
    );
    await client.query("COMMIT");
    return Number(result.rows[0]?.count ?? "0");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function getWarnings(userId: string, limit = 25): Promise<WarningRecord[]> {
  const result = await pool.query<WarningRecord>(
    `SELECT id::text, moderator_id, reason, created_at
     FROM warnings
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, Math.min(Math.max(limit, 1), 50)]
  );
  return result.rows;
}

export async function logModeration(
  action: string,
  userId: string | null,
  moderatorId: string,
  reason: string
): Promise<void> {
  await pool.query(
    "INSERT INTO moderation_logs (action, user_id, moderator_id, reason) VALUES ($1, $2, $3, $4)",
    [action, userId, moderatorId, reason]
  );
}

export async function getModerationLogs(
  userId: string,
  limit = 10
): Promise<ModerationLogRecord[]> {
  const result = await pool.query<ModerationLogRecord>(
    `SELECT action, moderator_id, reason, created_at
     FROM moderation_logs
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, Math.min(Math.max(limit, 1), 25)]
  );
  return result.rows;
}
