import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { buildAnthropicRequest, createAnthropicParser, supportsServerFallback, type AnthropicLike } from "@/lib/parse/anthropic";
import { finalize, parseQuery, resolveProvider } from "@/lib/parse";
import { createOpenAIParser, type OpenAILike } from "@/lib/parse/openai";
import type { LlmOutput } from "@/lib/parse/prompt";
import { DemoLimiter } from "@/lib/rate-limit";

const output: LlmOutput = {
  filters: {
    categories: ["footwear"], brands: null, genders: ["women"], priceMin: null, priceMax: 150, minRating: 4,
    sizes: ["8"], colours: null, materialsInclude: null, materialsExclude: null, waterproof: true,
    maxWeightGrams: null, inStock: null, onSale: null, keywords: ["boots"],
  },
  interpretation: "Women's waterproof boots under $150, size 8, rated 4 stars and up.",
  unmapped: [],
};

function mockAnthropic(response: Record<string, unknown>) {
  const parse = vi.fn().mockResolvedValue(response);
  return { client: { beta: { messages: { parse } } } as unknown as AnthropicLike, parse };
}

function mockOpenAI(response: Record<string, unknown>) {
  const parse = vi.fn().mockResolvedValue(response);
  return { client: { responses: { parse } } as unknown as OpenAILike, parse };
}

describe("Anthropic adapter", () => {
  it("sends a request shape valid for claude-opus-5-5", async () => {
    const { client, parse } = mockAnthropic({ stop_reason: "end_turn", parsed_output: output });
    const raw = await createAnthropicParser({ client, model: "claude-opus-5-5" }).parse("boots");
    expect(raw.filters).toEqual(output.filters);
    const body = parse.mock.calls[0][0];
    expect(body.model).toBe("claude-opus-5-5");
    expect(body.output_config.effort).toBe("low");
    expect(body.output_config.format.type).toBe("json_schema");
    expect(body.fallbacks).toBe("default");
    expect(body.betas).toEqual(["server-side-fallback-2026-07-01"]);
    for (const banned of ["temperature", "top_p", "top_k", "thinking", "tool_choice"]) expect(body).not.toHaveProperty(banned);
    expect(body.messages.at(-1).role).toBe("user");
  });

  it("omits the server-side fallback on Haiku 5.5", () => {
    expect(supportsServerFallback("claude-haiku-5-5")).toBe(false);
    const body = buildAnthropicRequest("claude-haiku-5-5", "boots");
    expect(body).not.toHaveProperty("fallbacks");
    expect(body).not.toHaveProperty("betas");
    expect(body.output_config.effort).toBe("low");
  });

  it("defaults to claude-opus-5-5", async () => {
    const { client, parse } = mockAnthropic({ stop_reason: "end_turn", parsed_output: output });
    await createAnthropicParser({ client }).parse("boots");
    expect(parse.mock.calls[0][0].model).toBe("claude-opus-5-5");
  });

  it("treats a refusal as an error", async () => {
    const { client } = mockAnthropic({ stop_reason: "refusal", parsed_output: null });
    await expect(createAnthropicParser({ client }).parse("x")).rejects.toThrow(/declined/);
  });

  it("rejects output that does not match the schema", async () => {
    const { client } = mockAnthropic({ stop_reason: "end_turn", parsed_output: { filters: { brands: ["Acme"] } } });
    await expect(createAnthropicParser({ client }).parse("x")).rejects.toThrow(/schema/);
  });
});

describe("OpenAI adapter", () => {
  it("requires OPENAI_MODEL", () => {
    expect(() => createOpenAIParser({})).toThrow(/OPENAI_MODEL/);
  });

  it("uses the Responses API with a zod text format", async () => {
    const { client, parse } = mockOpenAI({ output: [], output_parsed: output });
    const raw = await createOpenAIParser({ client, model: "test-model" }).parse("boots");
    expect(raw.unmapped).toEqual([]);
    const body = parse.mock.calls[0][0];
    expect(body.model).toBe("test-model");
    expect(body.input).toBe("boots");
    expect(body.text.format.type).toBe("json_schema");
    expect(body.text.format.strict).toBe(true);
  });

  it("treats a refusal as an error", async () => {
    const { client } = mockOpenAI({
      output: [{ type: "message", content: [{ type: "refusal", refusal: "no" }] }],
      output_parsed: null,
    });
    await expect(createOpenAIParser({ client, model: "m" }).parse("x")).rejects.toThrow(/declined/);
  });
});

describe("parseQuery", () => {
  const env = { LLM_PROVIDER: "anthropic" };

  it("picks providers from env", () => {
    expect(resolveProvider({})).toBe("offline");
    expect(resolveProvider({ OPENAI_API_KEY: "k" })).toBe("openai");
    expect(resolveProvider({ OPENAI_API_KEY: "k", ANTHROPIC_API_KEY: "k" })).toBe("anthropic");
    expect(resolveProvider({ LLM_PROVIDER: "offline", ANTHROPIC_API_KEY: "k" })).toBe("offline");
  });

  it("returns validated LLM filters", async () => {
    const { client } = mockAnthropic({ stop_reason: "end_turn", parsed_output: output });
    const result = await parseQuery("boots", { env, parser: createAnthropicParser({ client }), limiter: new DemoLimiter({ perIpPerHour: 5, globalPerDay: 5 }) });
    expect(result.provider).toBe("anthropic");
    expect(result.filters.priceMax).toBe(150);
    expect(result.warning).toBeUndefined();
  });

  it("falls back to offline when the provider errors", async () => {
    const parse = vi.fn().mockRejectedValue(new Anthropic.RateLimitError(429, undefined, "slow down", new Headers()));
    const parser = createAnthropicParser({ client: { beta: { messages: { parse } } } as unknown as AnthropicLike });
    const result = await parseQuery("waterproof boots", { env, parser, limiter: new DemoLimiter({ perIpPerHour: 5, globalPerDay: 5 }) });
    expect(result.provider).toBe("offline");
    expect(result.demoMode).toBe(true);
    expect(result.warning).toMatch(/busy/);
    expect(result.filters.waterproof).toBe(true);
  });

  it("never applies output that fails validation", () => {
    expect(() => finalize({ filters: { priceMin: 200, priceMax: 100 }, interpretation: "", unmapped: [] }, "openai")).toThrow();
  });

  it("switches to offline when a cap is hit", async () => {
    const { client, parse } = mockAnthropic({ stop_reason: "end_turn", parsed_output: output });
    const parser = createAnthropicParser({ client });
    const limiter = new DemoLimiter({ perIpPerHour: 1, globalPerDay: 10 });
    await parseQuery("boots", { env, parser, limiter, ip: "1.1.1.1" });
    const second = await parseQuery("boots", { env, parser, limiter, ip: "1.1.1.1" });
    expect(second.provider).toBe("offline");
    expect(second.demoMode).toBe(true);
    expect(parse).toHaveBeenCalledTimes(1);
  });
});

describe("DemoLimiter", () => {
  it("enforces per-IP hourly and global daily caps", () => {
    let now = Date.UTC(2026, 0, 1, 12);
    const limiter = new DemoLimiter({ perIpPerHour: 2, globalPerDay: 3 }, () => now);
    expect(limiter.take("a").ok).toBe(true);
    expect(limiter.take("a").ok).toBe(true);
    expect(limiter.take("a")).toEqual({ ok: false, reason: "ip" });
    expect(limiter.take("b").ok).toBe(true);
    expect(limiter.take("c")).toEqual({ ok: false, reason: "global" });
    now += 24 * 60 * 60 * 1000;
    expect(limiter.take("a").ok).toBe(true);
  });
});
