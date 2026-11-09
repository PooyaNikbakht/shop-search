import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { describeFilters } from "../describe";
import { DemoLimiter, limitConfigFromEnv } from "../rate-limit";
import { safeNormalizeFilters } from "../schema";
import { PROVIDERS } from "../url";
import { createAnthropicParser } from "./anthropic";
import { offlineParser } from "./offline";
import { createOpenAIParser } from "./openai";
import {
  ParseValidationError,
  ProviderRefusalError,
  type ParseResult,
  type Parser,
  type ProviderName,
  type RawParse,
} from "./types";

export type Env = Record<string, string | undefined>;

/**
 * LLM_PROVIDER wins when set. Otherwise the first provider with a key:
 * Anthropic, then OpenAI. With no key, the offline parser.
 */
export function resolveProvider(env: Env): ProviderName {
  const explicit = env.LLM_PROVIDER?.trim().toLowerCase();
  if (explicit && (PROVIDERS as readonly string[]).includes(explicit)) return explicit as ProviderName;
  if (env.ANTHROPIC_API_KEY) return "anthropic";
  if (env.OPENAI_API_KEY) return "openai";
  return "offline";
}

export function createParser(provider: ProviderName, env: Env): Parser {
  const timeoutMs = Number(env.PARSE_TIMEOUT_MS) || 10000;
  switch (provider) {
    case "anthropic":
      return createAnthropicParser({ model: env.ANTHROPIC_MODEL, timeoutMs });
    case "openai":
      return createOpenAIParser({ model: env.OPENAI_MODEL, timeoutMs });
    case "offline":
      return offlineParser;
  }
}

/** Turns any provider error into a short message that is safe to show users. */
export function friendlyError(error: unknown): string {
  if (error instanceof ProviderRefusalError) return "The AI parser declined this query, so the offline parser answered.";
  if (error instanceof ParseValidationError) return "The AI parser returned filters that failed validation, so the offline parser answered.";
  if (error instanceof Anthropic.AuthenticationError || error instanceof OpenAI.AuthenticationError)
    return "The AI provider rejected the API key, so the offline parser answered.";
  if (error instanceof Anthropic.RateLimitError || error instanceof OpenAI.RateLimitError)
    return "The AI provider is busy right now, so the offline parser answered.";
  if (error instanceof Anthropic.APIConnectionTimeoutError || error instanceof OpenAI.APIConnectionTimeoutError)
    return "The AI parser took too long, so the offline parser answered.";
  if (error instanceof Anthropic.APIError || error instanceof OpenAI.APIError)
    return "The AI provider returned an error, so the offline parser answered.";
  return "The AI parser is unavailable, so the offline parser answered.";
}

function cleanUnmapped(list: readonly string[]): string[] {
  return Array.from(new Set(list.map((s) => s.trim().replace(/\s+/g, " ")).filter((s) => s.length > 0 && s.length <= 80))).slice(0, 10);
}

/**
 * Validates provider output with the shared schema. Output that fails is never
 * applied; the caller falls back to the offline parser.
 */
export function finalize(raw: RawParse, provider: ProviderName): ParseResult {
  const result = safeNormalizeFilters(raw.filters);
  if (!result.success) throw new ParseValidationError("Filters failed validation.", result.error.issues);
  const interpretation = raw.interpretation.trim().slice(0, 240) || describeFilters(result.data);
  return { filters: result.data, interpretation, unmapped: cleanUnmapped(raw.unmapped), provider };
}

export interface ParseOptions {
  env?: Env;
  ip?: string;
  /** Inject a parser (tests) instead of building one from env. */
  parser?: Parser;
  limiter?: DemoLimiter;
}

let sharedLimiter: DemoLimiter | undefined;
function defaultLimiter(env: Env): DemoLimiter {
  sharedLimiter ??= new DemoLimiter(limitConfigFromEnv(env));
  return sharedLimiter;
}

async function offline(query: string, extra: Partial<ParseResult> = {}): Promise<ParseResult> {
  return { ...finalize(await offlineParser.parse(query), "offline"), ...extra };
}

export async function parseQuery(query: string, options: ParseOptions = {}): Promise<ParseResult> {
  const env = options.env ?? process.env;
  const started = Date.now();
  const provider = options.parser?.name ?? resolveProvider(env);

  if (provider === "offline") return { ...(await offline(query)), latencyMs: Date.now() - started };

  const limiter = options.limiter ?? defaultLimiter(env);
  const gate = limiter.take(options.ip ?? "unknown");
  if (!gate.ok) {
    const warning =
      gate.reason === "ip"
        ? "You have hit the demo limit for AI searches this hour, so the offline parser answered."
        : "The demo has used its AI budget for today, so the offline parser answered.";
    return { ...(await offline(query, { warning, demoMode: true })), latencyMs: Date.now() - started };
  }

  try {
    const parser = options.parser ?? createParser(provider, env);
    const raw = await parser.parse(query);
    return { ...finalize(raw, provider), latencyMs: Date.now() - started };
  } catch (error) {
    console.warn(`[parse] ${provider} failed: ${error instanceof Error ? error.name : "unknown error"}`);
    return {
      ...(await offline(query, { warning: friendlyError(error), demoMode: true })),
      latencyMs: Date.now() - started,
    };
  }
}
