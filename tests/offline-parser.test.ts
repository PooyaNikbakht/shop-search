import { describe, expect, it } from "vitest";
import { correctTypos, parseOffline } from "@/lib/parse/offline";

describe("parseOffline", () => {
  it("parses the headline example", () => {
    const { filters, unmapped } = parseOffline("waterproof women's hiking boots under $150, size 8, 4 stars and up");
    expect(filters).toMatchObject({
      categories: ["footwear"],
      genders: ["women"],
      priceMax: 150,
      sizes: ["8"],
      minRating: 4,
      waterproof: true,
    });
    expect(unmapped).toEqual([]);
  });

  it("handles ranges and k suffixes", () => {
    expect(parseOffline("tent under 1.5k").filters.priceMax).toBe(1500);
    expect(parseOffline("fleece between 50 and 80 bucks").filters).toMatchObject({ priceMin: 50, priceMax: 80 });
    expect(parseOffline("jackets $100-$200").filters).toMatchObject({ priceMin: 100, priceMax: 200 });
    expect(parseOffline("pack over $120").filters.priceMin).toBe(120);
  });

  it("handles gender unions", () => {
    expect(parseOffline("men's or unisex rain jacket").filters.genders).toEqual(["men", "unisex"]);
  });

  it("handles negation without also including the material", () => {
    const { filters } = parseOffline("hiking boots not leather");
    expect(filters.materialsExclude).toEqual(["leather"]);
    expect(filters.materialsInclude).toBeUndefined();
    expect(parseOffline("leather-free sandals").filters.materialsExclude).toEqual(["leather"]);
  });

  it("corrects misspellings", () => {
    expect(correctTypos("waterprof")).toBe("waterproof");
    expect(parseOffline("waterprof jakcet").filters).toMatchObject({ waterproof: true, categories: ["jackets"] });
  });

  it("maps colour synonyms and sizes", () => {
    const { filters } = parseOffline("gray or navy fleece jacket in medium");
    expect(filters.colours).toEqual(["grey", "navy"]);
    expect(filters.sizes).toEqual(["M"]);
    expect(parseOffline("2 person tent").filters.sizes).toEqual(["2P"]);
  });

  it("parses weight, stock and sale", () => {
    expect(parseOffline("tent under 2kg").filters.maxWeightGrams).toBe(2000);
    expect(parseOffline("boots on sale in stock").filters).toMatchObject({ onSale: true, inStock: true });
  });

  it("parses brands", () => {
    expect(parseOffline("summitcraft sleeping bag").filters.brands).toEqual(["Summitcraft"]);
    expect(parseOffline("alder and pike pants").filters.brands).toEqual(["Alder & Pike"]);
  });

  it("reports phrases it could not map", () => {
    expect(parseOffline("rain jacket for my dad").unmapped).toEqual(["for my dad"]);
    expect(parseOffline("headlamp as a gift").unmapped).toEqual(["as a gift"]);
    expect(parseOffline("boots, not black").unmapped).toEqual(["not black"]);
  });

  it("does not confuse kids with a thousand", () => {
    expect(parseOffline("under $50 kids jacket").filters).toMatchObject({ priceMax: 50, genders: ["kids"] });
  });

  it("always returns schema-valid filters", () => {
    for (const q of ["", "???", "size 99 boots", "5 stars", "between 900 and 100 dollars"]) {
      expect(() => parseOffline(q)).not.toThrow();
    }
    expect(parseOffline("between 900 and 100 dollars").filters).toMatchObject({ priceMin: 100, priceMax: 900 });
  });
});
