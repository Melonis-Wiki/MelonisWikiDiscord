import type { AppConfig } from "../config/env.js";
import { config } from "../config/env.js";

const LEVELS: Record<AppConfig["logLevel"], number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function enabled(level: AppConfig["logLevel"]): boolean {
  return LEVELS[level] >= LEVELS[config.logLevel];
}

function log(level: AppConfig["logLevel"], message: string, meta?: unknown): void {
  if (!enabled(level)) return;
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
  if (meta === undefined) {
    console[level === "debug" ? "log" : level](line);
    return;
  }
  console[level === "debug" ? "log" : level](line, meta);
}

export const logger = {
  debug: (message: string, meta?: unknown) => log("debug", message, meta),
  info: (message: string, meta?: unknown) => log("info", message, meta),
  warn: (message: string, meta?: unknown) => log("warn", message, meta),
  error: (message: string, meta?: unknown) => log("error", message, meta)
};
