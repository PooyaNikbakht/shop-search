import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { LlmOutputSchema, SYSTEM_PROMPT, llmOutputToRaw } from "./prompt";
import { ParseValidationError, ProviderRefusalError, type Parser, type RawParse } from "./types";

/** Minimal surface of the SDK the adapter uses, so tests can pass a mock. */
export interface OpenAILike {
  responses: { parse: OpenAI["responses"]["parse"] };
}

export function buildOpenAIRequest(model: string, query: string) {
  return {
    model,
    instructions: SYSTEM_PROMPT,
    input: query,
    text: { format: zodTextFormat(LlmOutputSchema, "search_filters") },
  };
}

export function createOpenAIParser(options: { client?: OpenAILike; model?: string; timeoutMs?: number } = {}): Parser {
  const model = options.model;
  if (!model) throw new Error("OPENAI_MODEL must be set when LLM_PROVIDER is openai.");
  let client = options.client;
  return {
    name: "openai",
    async parse(query: string, signal?: AbortSignal): Promise<RawParse> {
      client ??= new OpenAI({ maxRetries: 1 });
      const response = await client.responses.parse(buildOpenAIRequest(model, query), {
        signal,
        timeout: options.timeoutMs,
      });
      for (const item of response.output ?? []) {
        if (item.type !== "message") continue;
        for (const part of item.content) {
          if (part.type === "refusal") throw new ProviderRefusalError("The model declined this query.");
        }
      }
      const parsed = LlmOutputSchema.safeParse(response.output_parsed);
      if (!parsed.success) throw new ParseValidationError("OpenAI returned output that does not match the schema.", parsed.error.issues);
      return llmOutputToRaw(parsed.data);
    },
  };
}
