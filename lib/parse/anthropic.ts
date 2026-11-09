import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { LlmOutputSchema, SYSTEM_PROMPT, llmOutputToRaw } from "./prompt";
import { ParseValidationError, ProviderRefusalError, type Parser, type RawParse } from "./types";

export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5-5";

/** Minimal surface of the SDK the adapter uses, so tests can pass a mock. */
export interface AnthropicLike {
  beta: { messages: { parse: Anthropic["beta"]["messages"]["parse"] } };
}

/**
 * Server-side refusal fallback is opt-in and not available on every model.
 * Claude Haiku 5.5 has no server-side fallback, so the parameter is left out.
 */
export function supportsServerFallback(model: string): boolean {
  return !model.startsWith("claude-haiku");
}

export function buildAnthropicRequest(model: string, query: string) {
  return {
    model,
    // Thinking is adaptive by default on current models and counts toward this limit.
    max_tokens: 4096,
    system: [{ type: "text" as const, text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" as const } }],
    messages: [{ role: "user" as const, content: query }],
    // Low effort keeps search latency down. No temperature, thinking budget or prefill:
    // current models reject them.
    output_config: { effort: "low" as const, format: betaZodOutputFormat(LlmOutputSchema) },
    ...(supportsServerFallback(model)
      ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
      : {}),
  };
}

export function createAnthropicParser(options: { client?: AnthropicLike; model?: string; timeoutMs?: number } = {}): Parser {
  const model = options.model || DEFAULT_ANTHROPIC_MODEL;
  let client = options.client;
  return {
    name: "anthropic",
    async parse(query: string, signal?: AbortSignal): Promise<RawParse> {
      client ??= new Anthropic({ maxRetries: 1 });
      const response = await client.beta.messages.parse(buildAnthropicRequest(model, query), {
        signal,
        timeout: options.timeoutMs,
      });
      // Branch on stop_reason before reading content.
      if (response.stop_reason === "refusal") {
        throw new ProviderRefusalError("The model declined this query.");
      }
      if (response.stop_reason === "max_tokens") {
        throw new ParseValidationError("The model ran out of tokens before finishing.");
      }
      const parsed = LlmOutputSchema.safeParse(response.parsed_output);
      if (!parsed.success) throw new ParseValidationError("Claude returned output that does not match the schema.", parsed.error.issues);
      return llmOutputToRaw(parsed.data);
    },
  };
}
