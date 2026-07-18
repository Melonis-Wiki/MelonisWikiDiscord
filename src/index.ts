import { config } from "./config/env.js";
import { createDiscordClient } from "./bot/client.js";
import { runMigrations } from "./db/migrations.js";
import { closePool } from "./db/pool.js";
import { logger } from "./utils/logger.js";

const client = createDiscordClient();

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}; shutting down`);
  await client.destroy();
  await closePool();
}

process.on("SIGINT", () => {
  void shutdown("SIGINT").finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM").finally(() => process.exit(0));
});

process.on("unhandledRejection", (error) => {
  logger.error("Unhandled promise rejection", error);
});

async function main(): Promise<void> {
  await runMigrations();
  await client.login(config.discordToken);
}

main().catch((error) => {
  logger.error("Startup failed", error);
  process.exit(1);
});
