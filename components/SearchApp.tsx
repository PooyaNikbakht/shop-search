"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SORTS, SORT_LABELS, type Sort } from "@/lib/catalog-meta";
import { describeFilters } from "@/lib/describe";
import type { SearchResult } from "@/lib/engine";
import type { ParseResult } from "@/lib/parse/types";
import { isEmptyFilters, safeNormalizeFilters, type Filters } from "@/lib/schema";
import { DEFAULT_STATE, productQuery, stateFromParams, stateToParams, type ProviderName, type SearchState } from "@/lib/url";
import { ChipBar } from "./ChipBar";
import { Facets } from "./Facets";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { CategoryTiles } from "./CategoryTiles";
import { Hero } from "./Hero";
import { ExampleChips, SearchBar } from "./SearchBar";

type Products =
  | { status: "loading"; data: SearchResult | null }
  | { status: "ready"; data: SearchResult }
  | { status: "error"; data: SearchResult | null; message: string };

interface ParseMeta {
  /** Filters key the interpretation belongs to; stale once chips change. */
  key: string;
  interpretation: string;
  warning?: string;
  demoMode?: boolean;
}

const PROVIDER_LABELS: Record<ProviderName, string> = {
  anthropic: "Claude",
  openai: "OpenAI",
  offline: "Offline parser",
};

export function SearchApp() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const state = useMemo(() => stateFromParams(params), [params]);
  const query = productQuery(state);
  const filtersKey = JSON.stringify(state.filters);

  const [response, setResponse] = useState<{ key: string; data: SearchResult | null; error?: string } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [meta, setMeta] = useState<ParseMeta | null>(null);
  const [reload, setReload] = useState(0);
  // Input text follows the URL query, but stays editable (and fillable by example chips).
  const [draft, setDraft] = useState(state.q);
  const [draftFor, setDraftFor] = useState(state.q);
  if (draftFor !== state.q) {
    setDraftFor(state.q);
    setDraft(state.q);
  }
  const drawer = useRef<HTMLDialogElement>(null);
  const resultsTop = useRef<HTMLDivElement>(null);

  const navigate = useCallback(
    (next: SearchState, mode: "push" | "replace" = "push") => {
      const qs = stateToParams(next).toString();
      router[mode](qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  // Fetch a page of products whenever the filters, sort or page in the URL change.
  // Loading is derived: the last response belongs to a different request key.
  const requestKey = `${query}#${reload}`;
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/products?${query}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Search failed (${res.status}).`);
        const data = (await res.json()) as SearchResult;
        setResponse({ key: requestKey, data });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setResponse((prev) => ({
          key: requestKey,
          data: prev?.data ?? null,
          error: err instanceof Error ? err.message : "Search failed.",
        }));
      });
    return () => controller.abort();
  }, [query, requestKey]);

  const products: Products =
    !response || response.key !== requestKey
      ? { status: "loading", data: response?.data ?? null }
      : response.error !== undefined
        ? { status: "error", data: response.data, message: response.error }
        : { status: "ready", data: response.data! };

  async function runParse(q: string) {
    if (parsing) return;
    setDraft(q);
    setParsing(true);
    setParseError("");
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const body = (await res.json()) as ParseResult | { error: string };
      if (!res.ok || "error" in body) throw new Error("error" in body ? body.error : "Could not read that search.");
      setMeta({
        key: JSON.stringify(body.filters),
        interpretation: body.interpretation,
        warning: body.warning,
        demoMode: body.demoMode,
      });
      navigate({ q, filters: body.filters, sort: state.sort, page: 1, unmapped: body.unmapped, via: body.provider });
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Could not read that search. Try again.");
    } finally {
      setParsing(false);
    }
  }

  /** Chip and facet edits re-query products only; the LLM is not called again. */
  function updateFilters(next: Filters) {
    const result = safeNormalizeFilters(next);
    navigate({ ...state, filters: result.success ? result.data : state.filters, page: 1 });
  }

  function setSort(sort: Sort) {
    navigate({ ...state, sort, page: 1 }, "replace");
  }

  function setPage(page: number) {
    navigate({ ...state, page });
    resultsTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const data = products.data;
  const hasFilters = !isEmptyFilters(state.filters);
  const interpretation =
    meta && meta.key === filtersKey ? meta.interpretation : hasFilters ? describeFilters(state.filters) : "";
  const statusText =
    products.status === "loading"
      ? "Loading results"
      : data
        ? `${data.total.toLocaleString("en-US")} ${data.total === 1 ? "product" : "products"}`
        : "";

  return (
    <>
      <header>
        <Hero examples={<ExampleChips busy={parsing} onPick={runParse} />} />
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="relative z-10 -mt-12 sm:-mt-14 lg:-mt-16">
          <SearchBar value={draft} onValueChange={setDraft} busy={parsing} onSubmit={runParse} />
        </div>

        <div className="mt-6">
          <CategoryTiles filters={state.filters} onChange={updateFilters} />
        </div>

        <section aria-label="Search understanding" className="mt-5 flex flex-col gap-3">
          <div aria-live="polite" className="flex flex-col gap-2 empty:hidden">
            {parsing && <p className="text-sm text-muted">Reading your search...</p>}
            {parseError && (
              <p role="alert" className="text-sm text-danger">
                {parseError}
              </p>
            )}
            {!parsing && interpretation && (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="text-muted">Understood:</span>
                <span>{interpretation}</span>
                {state.via && (
                  <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-muted">
                    {PROVIDER_LABELS[state.via]}
                  </span>
                )}
              </p>
            )}
            {!parsing && state.unmapped.length > 0 && (
              <p className="text-sm text-muted">
                Couldn&apos;t match:{" "}
                {state.unmapped.map((u, i) => (
                  <span key={u}>
                    {i > 0 && ", "}
                    <span className="font-mono text-ink">&lsquo;{u}&rsquo;</span>
                  </span>
                ))}
              </p>
            )}
            {!parsing && meta?.demoMode && meta.key === filtersKey && (
              <p className="text-xs text-muted">
                <span className="font-medium text-ink">Demo mode.</span> {meta.warning}
              </p>
            )}
          </div>
          <ChipBar filters={state.filters} onChange={updateFilters} onClear={() => navigate(DEFAULT_STATE)} />
        </section>

        <div ref={resultsTop} className="mt-8 grid scroll-mt-4 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden lg:block" aria-label="Filters">
            <Facets facets={data?.facets ?? null} filters={state.filters} onChange={updateFilters} />
          </aside>

          <main className="min-w-0 pb-16">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <p className="text-sm" aria-live="polite" aria-atomic="true">
                {statusText}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => drawer.current?.showModal()}
                  className="inline-flex h-9 items-center rounded-[8px] border border-border px-3 text-sm lg:hidden"
                >
                  Filters
                </button>
                <label htmlFor="sort" className="sr-only">
                  Sort by
                </label>
                <select
                  id="sort"
                  value={state.sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="h-9 rounded-[8px] border border-border bg-background px-2 text-sm"
                >
                  {SORTS.map((s) => (
                    <option key={s} value={s}>
                      {SORT_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Results
              products={products}
              onRetry={() => setReload((n) => n + 1)}
              onClear={() => navigate({ ...state, filters: {}, page: 1, unmapped: [] })}
              hasFilters={hasFilters}
            />

            {data && products.status !== "error" && data.pageCount > 1 && (
              <Pagination page={data.page} pageCount={data.pageCount} onPage={setPage} />
            )}
          </main>
        </div>

        <dialog
          ref={drawer}
          aria-label="Filters"
          className="m-0 ml-auto h-dvh max-h-dvh w-[min(22rem,100vw)] max-w-full border-l border-border bg-background p-0 text-ink"
          onClick={(e) => e.target === drawer.current && drawer.current?.close()}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-semibold">Filters</h2>
              <button type="button" onClick={() => drawer.current?.close()} className="rounded-[8px] px-2 py-1 text-sm text-muted hover:text-ink">
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <Facets facets={data?.facets ?? null} filters={state.filters} onChange={updateFilters} />
            </div>
            <div className="border-t border-border p-4">
              <button
                type="button"
                onClick={() => drawer.current?.close()}
                className="h-11 w-full rounded-[8px] bg-accent font-medium text-accent-ink"
              >
                Show {data ? data.total.toLocaleString("en-US") : ""} results
              </button>
            </div>
          </div>
        </dialog>
      </div>
    </>
  );
}

function Results({
  products,
  onRetry,
  onClear,
  hasFilters,
}: {
  products: Products;
  onRetry: () => void;
  onClear: () => void;
  hasFilters: boolean;
}) {
  const grid = "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4";
  if (products.status === "error") {
    return (
      <div role="alert" className="rounded-[8px] border border-border p-6 text-center">
        <p className="font-medium">Something went wrong loading products.</p>
        <p className="mt-1 text-sm text-muted">{products.message}</p>
        <button type="button" onClick={onRetry} className="mt-4 rounded-[8px] border border-border px-4 py-2 text-sm hover:border-accent">
          Try again
        </button>
      </div>
    );
  }
  if (products.status === "loading") {
    return (
      <div className={grid} aria-busy="true">
        {Array.from({ length: 8 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (products.data.total === 0) {
    return (
      <div className="rounded-[8px] border border-border p-8 text-center">
        <p className="font-medium">No products match all of these filters.</p>
        <p className="mt-1 text-sm text-muted">
          Try removing a chip above, widening the price range, or dropping a size.
        </p>
        {hasFilters && (
          <button type="button" onClick={onClear} className="mt-4 rounded-[8px] border border-border px-4 py-2 text-sm hover:border-accent">
            Clear all filters
          </button>
        )}
      </div>
    );
  }
  return (
    <ul className={grid}>
      {products.data.items.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}

function Pagination({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (p: number) => void }) {
  const pages = useMemo(() => {
    const set = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
    return [...set].sort((a, b) => a - b);
  }, [page, pageCount]);
  const btn = "inline-flex h-9 min-w-9 items-center justify-center rounded-[8px] border px-3 text-sm";
  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <button type="button" className={`${btn} border-border disabled:opacity-40`} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p - pages[i - 1] > 1 && <span className="text-muted" aria-hidden="true">...</span>}
          <button
            type="button"
            className={`${btn} ${p === page ? "border-accent bg-accent text-accent-ink" : "border-border hover:border-accent"}`}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
            onClick={() => onPage(p)}
          >
            {p}
          </button>
        </span>
      ))}
      <button type="button" className={`${btn} border-border disabled:opacity-40`} disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </nav>
  );
}
