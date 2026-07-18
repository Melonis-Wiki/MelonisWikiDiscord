export function clip(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  if (maxLength <= 3) return text.slice(0, maxLength);
  return `${text.slice(0, maxLength - 3)}...`;
}

export function cleanDiscordText(text: string): string {
  return text
    .replace(/\0/g, "")
    .replace(/@everyone/g, "@\u200beveryone")
    .replace(/@here/g, "@\u200bhere")
    .trim();
}

export function reasonText(parts: readonly string[], fallback: string, maxLength = 512): string {
  const reason = cleanDiscordText(parts.join(" "));
  return clip(reason || fallback, maxLength);
}

export function isoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
