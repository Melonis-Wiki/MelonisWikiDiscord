/**
 * Limits on the paid model call behind /article.
 *
 * Every cache miss used to call the model, so concurrent commands for the same
 * article each paid for their own summary and wiki edits could force fresh
 * ones without bound. These limits are per process, which matches the bot's
 * single gateway connection.
 */

type Window = { limit: number; windowMs: number };

/** /article invocations one Discord user may make. */
const USER_COMMANDS: Window = { limit: 5, windowMs: 60_000 };
/** Model calls for the whole guild; past these the article excerpt is shown. */
const MODEL_CALLS: Window[] = [
  { limit: 30, windowMs: 60 * 60_000 },
  { limit: 200, windowMs: 24 * 60 * 60_000 }
];
/** A summary refreshed this recently is reused even if the article was edited since. */
export const ARTICLE_REFRESH_COOLDOWN_MS = 15 * 60_000;

const userHits = new Map<string, number[]>();
const modelHits: number[] = [];
const inFlight = new Map<string, Promise<unknown>>();

function recent(hits: number[], windowMs: number, now: number): number[] {
  return hits.filter((at) => now - at < windowMs);
}

/** Records one /article command for `userId`; false when over the limit. */
export function takeUserCommand(userId: string, now = Date.now()): boolean {
  const hits = recent(userHits.get(userId) ?? [], USER_COMMANDS.windowMs, now);
  if (hits.length >= USER_COMMANDS.limit) {
    userHits.set(userId, hits);
    return false;
  }
  hits.push(now);
  userHits.set(userId, hits);
  if (userHits.size > 10_000) {
    for (const [id, list] of userHits) {
      if (recent(list, USER_COMMANDS.windowMs, now).length === 0) userHits.delete(id);
    }
  }
  return true;
}

/** Records one model call; false (and nothing recorded) when any budget is spent. */
export function takeModelBudget(now = Date.now()): boolean {
  const longest = Math.max(...MODEL_CALLS.map((w) => w.windowMs));
  const kept = recent(modelHits, longest, now);
  modelHits.splice(0, modelHits.length, ...kept);
  if (MODEL_CALLS.some((w) => recent(kept, w.windowMs, now).length >= w.limit)) return false;
  modelHits.push(now);
  return true;
}

/** Runs `work` once per key at a time; concurrent callers share its result. */
export function shareInFlight<T>(key: string, work: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;
  const run = work().finally(() => inFlight.delete(key));
  inFlight.set(key, run);
  return run;
}
