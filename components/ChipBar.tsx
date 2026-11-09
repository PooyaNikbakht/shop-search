"use client";

import { useEffect, useId, useRef, useState } from "react";
import { filtersToChips, removeChip, type Chip } from "@/lib/describe";
import type { Filters } from "@/lib/schema";

export function ChipBar({
  filters,
  onChange,
  onClear,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  onClear: () => void;
}) {
  const chips = filtersToChips(filters);
  const [editing, setEditing] = useState<string | null>(null);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters" role="group">
      {chips.map((chip) => (
        <div key={chip.id} className="relative">
          <span className="inline-flex items-center overflow-hidden rounded-full border border-border bg-surface font-mono text-xs">
            {chip.editable ? (
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={editing === chip.id}
                onClick={() => setEditing(editing === chip.id ? null : chip.id)}
                className="py-1.5 pl-3 pr-1.5 hover:text-accent"
                title="Edit"
              >
                {chip.label}
                <span className="sr-only"> (edit)</span>
                <svg viewBox="0 0 12 12" className="ml-1 inline h-2.5 w-2.5" aria-hidden="true">
                  <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            ) : (
              <span className="py-1.5 pl-3 pr-1">{chip.label}</span>
            )}
            <button
              type="button"
              onClick={() => onChange(removeChip(filters, chip))}
              aria-label={`Remove filter: ${chip.label}`}
              className="flex h-7 w-7 items-center justify-center text-muted hover:text-danger"
            >
              <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
                <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </span>
          {editing === chip.id && (
            <RangePopover
              chip={chip}
              filters={filters}
              onClose={() => setEditing(null)}
              onApply={(next) => {
                setEditing(null);
                onChange(next);
              }}
            />
          )}
        </div>
      ))}
      <button type="button" onClick={onClear} className="px-2 py-1 text-xs text-muted underline underline-offset-4 hover:text-ink">
        Clear all
      </button>
    </div>
  );
}

function RangePopover({
  chip,
  filters,
  onApply,
  onClose,
}: {
  chip: Chip;
  filters: Filters;
  onApply: (next: Filters) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const id = useId();
  const [min, setMin] = useState(filters.priceMin?.toString() ?? "");
  const [max, setMax] = useState(filters.priceMax?.toString() ?? "");
  const [rating, setRating] = useState(String(filters.minRating ?? 4));
  const [kg, setKg] = useState(filters.maxWeightGrams ? String(filters.maxWeightGrams / 1000) : "");
  const [error, setError] = useState("");

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("input,select")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.parentElement?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [onClose]);

  function apply() {
    const next: Filters = { ...filters };
    if (chip.editable === "price") {
      const lo = min.trim() === "" ? undefined : Number(min);
      const hi = max.trim() === "" ? undefined : Number(max);
      if ((lo !== undefined && !(lo >= 0)) || (hi !== undefined && !(hi > 0))) return setError("Enter positive numbers.");
      if (lo !== undefined && hi !== undefined && lo > hi) return setError("Min must be less than max.");
      next.priceMin = lo;
      next.priceMax = hi;
    } else if (chip.editable === "rating") {
      next.minRating = Number(rating);
    } else if (chip.editable === "weight") {
      const v = Number(kg);
      if (!(v > 0)) return setError("Enter a weight above 0.");
      next.maxWeightGrams = Math.round(v * 1000);
    }
    onApply(next);
  }

  const input = "h-9 w-full rounded-[8px] border border-border bg-background px-2 text-sm";
  return (
    <form
      ref={ref}
      role="dialog"
      aria-label={`Edit ${chip.label}`}
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="fixed inset-x-4 bottom-4 z-30 rounded-[8px] border border-border bg-background p-3 sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:w-64"
    >
      {chip.editable === "price" && (
        <div className="flex items-end gap-2">
          <label className="flex-1 text-xs text-muted" htmlFor={`${id}-min`}>
            Min $
            <input id={`${id}-min`} inputMode="decimal" className={input} value={min} onChange={(e) => setMin(e.target.value)} />
          </label>
          <span className="pb-2 text-muted" aria-hidden="true">to</span>
          <label className="flex-1 text-xs text-muted" htmlFor={`${id}-max`}>
            Max $
            <input id={`${id}-max`} inputMode="decimal" className={input} value={max} onChange={(e) => setMax(e.target.value)} />
          </label>
        </div>
      )}
      {chip.editable === "rating" && (
        <label className="block text-xs text-muted" htmlFor={`${id}-rating`}>
          Minimum rating
          <select id={`${id}-rating`} className={input} value={rating} onChange={(e) => setRating(e.target.value)}>
            {["3", "3.5", "4", "4.5", "4.8"].map((r) => (
              <option key={r} value={r}>
                {r}+ stars
              </option>
            ))}
          </select>
        </label>
      )}
      {chip.editable === "weight" && (
        <label className="block text-xs text-muted" htmlFor={`${id}-kg`}>
          Max weight (kg)
          <input id={`${id}-kg`} inputMode="decimal" className={input} value={kg} onChange={(e) => setKg(e.target.value)} />
        </label>
      )}
      {error && (
        <p className="mt-2 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-[8px] px-3 py-1.5 text-sm text-muted hover:text-ink">
          Cancel
        </button>
        <button type="submit" className="rounded-[8px] bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink">
          Apply
        </button>
      </div>
    </form>
  );
}
