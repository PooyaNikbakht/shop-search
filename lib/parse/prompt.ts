import { z } from "zod";
import {
  ALL_SIZES,
  BRANDS,
  CATEGORIES,
  COLOURS,
  GENDERS,
  MATERIALS,
} from "../catalog-meta";
import type { RawParse } from "./types";

/**
 * The shape LLMs must return. Every field is present and nullable, which both
 * Anthropic and OpenAI strict structured outputs accept. Enums come straight
 * from the catalog, so the model cannot invent a brand or colour.
 */
export const LlmFiltersSchema = z.object({
  categories: z.array(z.enum(CATEGORIES)).nullable(),
  brands: z.array(z.enum(BRANDS)).nullable(),
  genders: z.array(z.enum(GENDERS)).nullable(),
  priceMin: z.number().nullable(),
  priceMax: z.number().nullable(),
  minRating: z.number().nullable(),
  sizes: z.array(z.enum(ALL_SIZES as [string, ...string[]])).nullable(),
  colours: z.array(z.enum(COLOURS)).nullable(),
  materialsInclude: z.array(z.enum(MATERIALS)).nullable(),
  materialsExclude: z.array(z.enum(MATERIALS)).nullable(),
  waterproof: z.boolean().nullable(),
  maxWeightGrams: z.number().nullable(),
  inStock: z.boolean().nullable(),
  onSale: z.boolean().nullable(),
  keywords: z.array(z.string()).nullable(),
});

export const LlmOutputSchema = z.object({
  filters: LlmFiltersSchema,
  interpretation: z.string(),
  unmapped: z.array(z.string()),
});
export type LlmOutput = z.infer<typeof LlmOutputSchema>;

export const SYSTEM_PROMPT = `You turn a shopper's search into filters for an outdoor gear store.

Return JSON that matches the schema. Use null for any filter the shopper did not ask for. Only use values from these lists:
- categories: ${CATEGORIES.join(", ")}
- brands: ${BRANDS.join(", ")}
- genders: ${GENDERS.join(", ")}
- colours: ${COLOURS.join(", ")}
- materials: ${MATERIALS.join(", ")}
- sizes: ${ALL_SIZES.join(", ")} (shoe sizes are US numbers like "8" or "10.5"; tents use "2P" for 2-person; apparel uses XS to XXL)

Rules:
- Prices are in US dollars. "under 150" sets priceMax 150. "between 50 and 80" sets both. "1.5k" means 1500.
- "4 stars and up" sets minRating 4. "top rated" means 4.5.
- "men's or unisex" means genders ["men", "unisex"]. Words like "for my dad" do not set a gender; report them as unmapped.
- "not leather", "no down", "leather-free" go in materialsExclude. "vegan" excludes leather, suede, down and merino.
- Map synonyms and fix obvious typos: "gray" is grey, "goretex" is gore-tex, "wool" is merino, "waterprof" is waterproof.
- Weight limits go in maxWeightGrams ("under 2kg" is 2000).
- inStock and onSale are true only when asked for, otherwise null.
- keywords: up to 4 short product words that narrow results inside a category, such as "boots", "rain", "puffer", "trail", "ultralight". Use the plain singular or plural form a product title would use. Do not repeat words already captured by another filter.
- unmapped: copy, word for word, each phrase from the query that no filter can express (for example "for my dad", "as a gift", "not black", "cheap"). Leave out filler words.
- interpretation: one short plain sentence describing the search, under 20 words.`;

/** Converts the model's nullable output into the input expected by the filter schema. */
export function llmOutputToRaw(output: LlmOutput): RawParse {
  return {
    filters: output.filters,
    interpretation: output.interpretation,
    unmapped: output.unmapped,
  };
}
