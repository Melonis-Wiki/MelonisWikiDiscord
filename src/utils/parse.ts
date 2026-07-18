import type { Message } from "discord.js";

const SNOWFLAKE_RE = /^\d{17,20}$/;

export function parseCommand(content: string, prefix = "?"): { command: string; args: string[] } {
  const trimmed = content.trim();
  if (!trimmed.startsWith(prefix)) {
    return { command: "", args: [] };
  }

  const body = trimmed.slice(prefix.length).trim();
  if (!body) return { command: "", args: [] };

  const [command = "", ...args] = body.split(/\s+/);
  return { command: command.toLowerCase(), args };
}

export function parseUserId(message: Pick<Message, "mentions">, arg: string | undefined): string | null {
  if (!arg) return null;

  const mention = arg.match(/^<@!?(\d{17,20})>$/);
  if (mention?.[1]) return mention[1];

  if (SNOWFLAKE_RE.test(arg)) return arg;

  return message.mentions.users.first()?.id ?? null;
}

export function parsePositiveInt(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export function parseNonNegativeInt(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) return null;
  return parsed;
}

export function parseDurationMinutes(value: string | undefined): number | null {
  const parsed = parsePositiveInt(value);
  if (parsed === null || parsed > 40_320) return null;
  return parsed;
}
