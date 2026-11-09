/**
 * Parser eval. Usage: npm run eval -- --provider=offline|anthropic|openai [--verbose]
 * Prints per-field precision and recall, exact-match rate, failed-case diffs
 * and latency, then writes a JSON report to evals/results/.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createParser, finalize } from "../lib/parse";
import type { ProviderName } from "../lib/parse/types";
import { normalizeFilters, type Filters } from "../lib/schema";
import { PROVIDERS } from "../lib/url";
import {
  SCORED_FIELDS, compareField, compareUnmapped, filtersEqual, percentile, ratio,
  type Counts, type ScoredField,
} from "./score";

interface EvalCase {
  id: string;
  tags: string[];
  query: string;
  expected: Filters;
  unmapped?: string[];
}

const here = dirname(fileURLToPath(import.meta.url));
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(resolve(here, "..", file));
  } catch {
    // Optional: keys can also come from the shell.
  }
}

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"] as const;
  }),
);
const provider = (args.get("provider") ?? "offline") as ProviderName;
if (!(PROVIDERS as readonly string[]).includes(provider)) {
  console.error(`Unknown provider "${provider}". Use one of: ${PROVIDERS.join(", ")}`);
  process.exit(2);
}
if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set. Add it to .env.local or the shell.");
  process.exit(2);
}
if (provider === "openai" && (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL)) {
  console.error("OPENAI_API_KEY and OPENAI_MODEL must both be set.");
  process.exit(2);
}

const cases: EvalCase[] = JSON.parse(readFileSync(resolve(here, "cases.json"), "utf8"));
const parser = createParser(provider, process.env);
const fields: ScoredField[] = [...SCORED_FIELDS, "unmapped"];
const totals = Object.fromEntries(fields.map((f) => [f, { tp: 0, fp: 0, fn: 0 }])) as Record<ScoredField, Counts>;

const results = [];
let exact = 0;
const latencies: number[] = [];

for (const c of cases) {
  const expected = normalizeFilters(c.expected);
  const started = performance.now();
  let predicted: Filters = {};
  let unmapped: string[] = [];
  let error: string | undefined;
  try {
    const out = finalize(await parser.parse(c.query), provider);
    predicted = out.filters;
    unmapped = out.unmapped;
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }
  const ms = performance.now() - started;
  latencies.push(ms);

  const diffs: string[] = [];
  for (const f of SCORED_FIELDS) {
    const counts = compareField(expected[f], predicted[f]);
    totals[f].tp += counts.tp;
    totals[f].fp += counts.fp;
    totals[f].fn += counts.fn;
    if (counts.fp || counts.fn) {
      diffs.push(`${f}: expected ${JSON.stringify(expected[f] ?? null)}, got ${JSON.stringify(predicted[f] ?? null)}`);
    }
  }
  const um = compareUnmapped(c.unmapped ?? [], unmapped);
  totals.unmapped.tp += um.tp;
  totals.unmapped.fp += um.fp;
  totals.unmapped.fn += um.fn;
  if (um.fp || um.fn) diffs.push(`unmapped: expected ${JSON.stringify(c.unmapped ?? [])}, got ${JSON.stringify(unmapped)}`);

  const isExact = !error && filtersEqual(expected, predicted);
  if (isExact) exact += 1;
  results.push({ id: c.id, query: c.query, tags: c.tags, exact: isExact, ms: Math.round(ms), expected, predicted, unmapped, keywords: predicted.keywords ?? [], diffs, error });
}

const pct = (v: number | null) => (v === null ? "   n/a" : `${(v * 100).toFixed(1).padStart(5)}%`);
const fieldReport = fields.map((f) => {
  const t = totals[f];
  return { field: f, ...t, precision: ratio(t.tp, t.tp + t.fp), recall: ratio(t.tp, t.tp + t.fn) };
});
const micro = SCORED_FIELDS.reduce((acc, f) => ({ tp: acc.tp + totals[f].tp, fp: acc.fp + totals[f].fp, fn: acc.fn + totals[f].fn }), { tp: 0, fp: 0, fn: 0 });

console.log(`\nshop-search parser eval  provider=${provider}  cases=${cases.length}\n`);
console.log("field               precision   recall    tp   fp   fn");
for (const r of fieldReport) {
  if (r.tp + r.fp + r.fn === 0) continue;
  console.log(`${r.field.padEnd(18)}  ${pct(r.precision)}    ${pct(r.recall)}  ${String(r.tp).padStart(4)} ${String(r.fp).padStart(4)} ${String(r.fn).padStart(4)}`);
}
const microP = ratio(micro.tp, micro.tp + micro.fp);
const microR = ratio(micro.tp, micro.tp + micro.fn);
console.log(`${"all filters (micro)".padEnd(18)}  ${pct(microP)}    ${pct(microR)}  ${String(micro.tp).padStart(4)} ${String(micro.fp).padStart(4)} ${String(micro.fn).padStart(4)}`);
console.log(`\nexact filter match: ${exact}/${cases.length} (${((exact / cases.length) * 100).toFixed(1)}%)`);
const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
console.log(`latency: mean ${mean.toFixed(1)} ms, p50 ${percentile(latencies, 50).toFixed(1)} ms, p95 ${percentile(latencies, 95).toFixed(1)} ms`);

const failed = results.filter((r) => r.diffs.length || r.error);
if (failed.length) {
  console.log(`\nfailed cases (${failed.length}):`);
  for (const r of failed) {
    console.log(`\n  [${r.id}] "${r.query}"`);
    if (r.error) console.log(`    error: ${r.error}`);
    for (const d of r.diffs) console.log(`    ${d}`);
  }
}

const report = {
  provider,
  model: provider === "anthropic" ? process.env.ANTHROPIC_MODEL || "claude-opus-5-5" : provider === "openai" ? process.env.OPENAI_MODEL : "rules",
  createdAt: new Date().toISOString(),
  cases: cases.length,
  exactMatch: exact / cases.length,
  micro: { precision: microP, recall: microR },
  fields: fieldReport,
  latencyMs: { mean, p50: percentile(latencies, 50), p95: percentile(latencies, 95) },
  results,
};
const outDir = resolve(here, "results");
mkdirSync(outDir, { recursive: true });
const stamp = report.createdAt.replace(/[:.]/g, "-");
writeFileSync(resolve(outDir, `${provider}-${stamp}.json`), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(resolve(outDir, `${provider}-latest.json`), `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nreport: evals/results/${provider}-latest.json`);

// Quality gate: fail the run (and CI) if micro F1 drops below the threshold.
const minF1 = Number(args.get("min-f1") ?? 0.9);
const f1 = microP !== null && microR !== null && microP + microR > 0 ? (2 * microP * microR) / (microP + microR) : 0;
console.log(`micro F1 ${(f1 * 100).toFixed(1)}% (gate ${(minF1 * 100).toFixed(0)}%)`);
if (f1 < minF1) {
  console.error("Eval below the quality gate.");
  process.exit(1);
}
