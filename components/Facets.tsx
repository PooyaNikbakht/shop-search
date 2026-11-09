"use client";

import { useId, useState } from "react";
import {
  CATEGORY_LABELS,
  GENDER_LABELS,
  PRICE_BUCKETS,
  type Brand,
  type Category,
  type Gender,
} from "@/lib/catalog-meta";
import type { Facets as FacetData } from "@/lib/engine";
import type { Filters } from "@/lib/schema";

type ListKey = "categories" | "brands" | "genders";

function toggle<T extends string>(list: readonly T[] | undefined, value: T): T[] | undefined {
  const set = new Set(list ?? []);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return set.size ? [...set].sort() : undefined;
}

export function Facets({
  facets,
  filters,
  onChange,
}: {
  facets: FacetData | null;
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  const [allBrands, setAllBrands] = useState(false);
  if (!facets) return <FacetsSkeleton />;

  const setList = <T extends string>(key: ListKey, value: T) =>
    onChange({ ...filters, [key]: toggle(filters[key] as T[] | undefined, value) });

  const brands = allBrands ? facets.brands : facets.brands.slice(0, 6);
  const activeBucket = PRICE_BUCKETS.find((b) => b.min === filters.priceMin && b.max === filters.priceMax)?.id;

  return (
    <div className="flex flex-col gap-6 text-sm">
      <Group title="Category">
        {facets.categories.map((f) => (
          <Check
            key={f.value}
            label={CATEGORY_LABELS[f.value]}
            count={f.count}
            checked={filters.categories?.includes(f.value) ?? false}
            onChange={() => setList<Category>("categories", f.value)}
          />
        ))}
      </Group>

      <Group title="Gender">
        {facets.genders.map((f) => (
          <Check
            key={f.value}
            label={GENDER_LABELS[f.value]}
            count={f.count}
            checked={filters.genders?.includes(f.value) ?? false}
            onChange={() => setList<Gender>("genders", f.value)}
          />
        ))}
      </Group>

      <Group title="Price">
        {facets.price.map((f) => {
          const bucket = PRICE_BUCKETS.find((b) => b.id === f.value)!;
          const checked = activeBucket === bucket.id;
          return (
            <Check
              key={f.value}
              label={bucket.label}
              count={f.count}
              checked={checked}
              onChange={() =>
                onChange({
                  ...filters,
                  priceMin: checked ? undefined : bucket.min,
                  priceMax: checked ? undefined : bucket.max,
                })
              }
            />
          );
        })}
      </Group>

      <Group title="Brand">
        {brands.map((f) => (
          <Check
            key={f.value}
            label={f.value}
            count={f.count}
            checked={filters.brands?.includes(f.value) ?? false}
            onChange={() => setList<Brand>("brands", f.value)}
          />
        ))}
        {facets.brands.length > 6 && (
          <button
            type="button"
            onClick={() => setAllBrands(!allBrands)}
            className="mt-1 self-start text-xs text-muted underline underline-offset-4 hover:text-ink"
            aria-expanded={allBrands}
          >
            {allBrands ? "Show fewer brands" : `Show all ${facets.brands.length} brands`}
          </button>
        )}
      </Group>

      <Group title="Rating">
        {[4.5, 4, 3.5].map((r) => (
          <Check
            key={r}
            label={`${r}+ stars`}
            checked={filters.minRating === r}
            onChange={() => onChange({ ...filters, minRating: filters.minRating === r ? undefined : r })}
          />
        ))}
      </Group>

      <Group title="More">
        <Check
          label="Waterproof"
          checked={filters.waterproof === true}
          onChange={() => onChange({ ...filters, waterproof: filters.waterproof === true ? undefined : true })}
        />
        <Check
          label="In stock"
          checked={filters.inStock === true}
          onChange={() => onChange({ ...filters, inStock: filters.inStock ? undefined : true })}
        />
        <Check
          label="On sale"
          checked={filters.onSale === true}
          onChange={() => onChange({ ...filters, onSale: filters.onSale ? undefined : true })}
        />
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</legend>
      {children}
    </fieldset>
  );
}

function Check({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}) {
  const id = useId();
  const empty = count === 0 && !checked;
  return (
    <div className={`flex items-center gap-2 py-0.5 ${empty ? "opacity-50" : ""}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 shrink-0 rounded border-border accent-[var(--accent)]"
      />
      <label htmlFor={id} className="flex flex-1 cursor-pointer justify-between gap-2">
        <span>{label}</span>
        {count !== undefined && <span className="font-mono text-xs text-muted">{count.toLocaleString("en-US")}</span>}
      </label>
    </div>
  );
}

function FacetsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="h-4 animate-pulse rounded bg-surface" style={{ width: `${50 + ((i * 17) % 40)}%` }} />
      ))}
    </div>
  );
}
