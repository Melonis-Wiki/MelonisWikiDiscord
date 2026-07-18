import "dotenv/config";

const SNOWFLAKE_RE = /^\d{17,20}$/;

export type AppConfig = {
  discordToken: string;
  guildId: string;
  adminRoleId: string;
  databaseUrl: string;
  openRouterApiKey: string;
  commandPrefix: string;
  wikiBaseUrl: string;
  openRouterModel: string;
  summaryCacheTtlMs: number;
  logLevel: "debug" | "info" | "warn" | "error";
};

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function requiredEnv(primaryName: string, legacyName?: string): string {
  const value = optionalEnv(primaryName) ?? (legacyName ? optionalEnv(legacyName) : undefined);
  if (!value) {
    const names = legacyName ? `${primaryName} or ${legacyName}` : primaryName;
    throw new Error(`Missing required environment variable: ${names}`);
  }
  return value;
}

function snowflake(name: string, value: string): string {
  if (!SNOWFLAKE_RE.test(value)) {
    throw new Error(`Invalid ${name}: expected a Discord snowflake`);
  }
  return value;
}

function url(name: string, value: string): string {
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("unsupported protocol");
    }
    return parsed.origin;
  } catch {
    throw new Error(`Invalid ${name}: expected an absolute http(s) URL`);
  }
}

function positiveInt(name: string, value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid ${name}: expected a positive integer`);
  }
  const numberValue = Number(value);
  if (!Number.isSafeInteger(numberValue) || numberValue <= 0) {
    throw new Error(`Invalid ${name}: expected a positive safe integer`);
  }
  return numberValue;
}

function logLevel(value: string | undefined): AppConfig["logLevel"] {
  if (!value) return "info";
  if (value === "debug" || value === "info" || value === "warn" || value === "error") {
    return value;
  }
  throw new Error("Invalid LOG_LEVEL: expected debug, info, warn, or error");
}

function prefix(value: string | undefined): string {
  const resolved = value ?? "?";
  if (resolved.length < 1 || resolved.length > 3 || /\s/.test(resolved)) {
    throw new Error("Invalid COMMAND_PREFIX: expected 1-3 non-whitespace characters");
  }
  return resolved;
}

export const config: AppConfig = {
  discordToken: requiredEnv("DISCORD_TOKEN", "BOT"),
  guildId: snowflake("DISCORD_GUILD_ID", requiredEnv("DISCORD_GUILD_ID", "SERV")),
  adminRoleId: snowflake("ADMIN_ROLE_ID", requiredEnv("ADMIN_ROLE_ID", "ROLE")),
  databaseUrl: requiredEnv("DATABASE_URL", "DB"),
  openRouterApiKey: requiredEnv("OPENROUTER_API_KEY", "AI"),
  commandPrefix: prefix(optionalEnv("COMMAND_PREFIX")),
  wikiBaseUrl: url("WIKI_BASE_URL", optionalEnv("WIKI_BASE_URL") ?? "https://melonis.wiki"),
  openRouterModel: optionalEnv("OPENROUTER_MODEL") ?? "google/gemma-4-31b-it",
  summaryCacheTtlMs:
    positiveInt("SUMMARY_CACHE_TTL_HOURS", optionalEnv("SUMMARY_CACHE_TTL_HOURS"), 36) *
    60 *
    60 *
    1000,
  logLevel: logLevel(optionalEnv("LOG_LEVEL"))
};
