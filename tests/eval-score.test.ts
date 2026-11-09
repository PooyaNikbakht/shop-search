import { describe, expect, it } from "vitest";
import { compareField, compareUnmapped, filtersEqual, percentile } from "@/evals/score";

describe("eval scoring", () => {
  it("counts array and scalar atoms", () => {
    expect(compareField(["men", "unisex"], ["men"])).toEqual({ tp: 1, fp: 0, fn: 1 });
    expect(compareField(150, 120)).toEqual({ tp: 0, fp: 1, fn: 1 });
    expect(compareField(undefined, undefined)).toEqual({ tp: 0, fp: 0, fn: 0 });
  });
  it("matches unmapped phrases by content words", () => {
    expect(compareUnmapped(["for my dad"], ["dad"])).toEqual({ tp: 1, fp: 0, fn: 0 });
    expect(compareUnmapped([], ["cheap"])).toEqual({ tp: 0, fp: 1, fn: 0 });
  });
  it("ignores keywords in exact match", () => {
    expect(filtersEqual({ categories: ["tents"] }, { categories: ["tents"], keywords: ["ultralight"] })).toBe(true);
  });
  it("computes percentiles", () => {
    expect(percentile([5, 1, 3], 50)).toBe(3);
  });
});
