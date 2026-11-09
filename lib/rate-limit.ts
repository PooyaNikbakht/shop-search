/**
 * In-memory caps for the public demo: a sliding one-hour window per IP plus a
 * global daily budget. State lives in the running instance only, so on
 * Cloudflare Workers each isolate keeps its own counts. That is acceptable for
 * a cost guard on a demo; a shared store (Durable Objects, KV, Redis) would be
 * the production answer.
 */
export interface LimitConfig {
  perIpPerHour: number;
  globalPerDay: number;
}

export type LimitResult = { ok: true } | { ok: false; reason: "ip" | "global" };

const HOUR = 60 * 60 * 1000;

export class DemoLimiter {
  private hits = new Map<string, number[]>();
  private day = "";
  private dayCount = 0;

  constructor(
    private config: LimitConfig,
    private now: () => number = Date.now,
  ) {}

  /** Records a hit if allowed. Callers only invoke this for paid LLM calls. */
  take(ip: string): LimitResult {
    const now = this.now();
    const today = new Date(now).toISOString().slice(0, 10);
    if (today !== this.day) {
      this.day = today;
      this.dayCount = 0;
    }
    if (this.dayCount >= this.config.globalPerDay) return { ok: false, reason: "global" };

    const recent = (this.hits.get(ip) ?? []).filter((t) => now - t < HOUR);
    if (recent.length >= this.config.perIpPerHour) {
      this.hits.set(ip, recent);
      return { ok: false, reason: "ip" };
    }
    recent.push(now);
    this.hits.set(ip, recent);
    this.dayCount += 1;
    if (this.hits.size > 5000) this.prune(now);
    return { ok: true };
  }

  private prune(now: number) {
    for (const [ip, times] of this.hits) {
      if (times.every((t) => now - t >= HOUR)) this.hits.delete(ip);
    }
  }
}

function intFromEnv(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export function limitConfigFromEnv(env: Record<string, string | undefined>): LimitConfig {
  return {
    perIpPerHour: intFromEnv(env.DEMO_LIMIT_PER_IP_PER_HOUR, 20),
    globalPerDay: intFromEnv(env.DEMO_LIMIT_GLOBAL_PER_DAY, 1000),
  };
}
