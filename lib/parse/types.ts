import type { Filters } from "../schema";
import type { ProviderName } from "../url";

export type { ProviderName };

export interface ParseResult {
  filters: Filters;
  interpretation: string;
  unmapped: string[];
  provider: ProviderName;
  /** Set when the requested provider could not answer and another one did. */
  warning?: string;
  /** True when a public-demo cap or provider failure forced the offline parser. */
  demoMode?: boolean;
  latencyMs?: number;
}

/** What every provider adapter returns before the shared validation step. */
export interface RawParse {
  filters: unknown;
  interpretation: string;
  unmapped: string[];
}

export interface Parser {
  name: ProviderName;
  parse(query: string, signal?: AbortSignal): Promise<RawParse>;
}

/** Thrown when a provider answers but its output fails schema validation. */
export class ParseValidationError extends Error {
  constructor(message: string, readonly issues?: unknown) {
    super(message);
    this.name = "ParseValidationError";
  }
}

/** Thrown when a provider declines to answer (for example a safety refusal). */
export class ProviderRefusalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderRefusalError";
  }
}
