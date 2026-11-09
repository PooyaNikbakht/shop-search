"use client";

export const EXAMPLE_QUERIES = [
  "waterproof women's hiking boots under $150, size 8, 4 stars and up",
  "men's or unisex rain jacket between 100 and 250 bucks, not black",
  "ultralight 2 person tent under 2kg",
  "vegan trail runners size 10.5 for my dad",
];

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M6 1.5 7.2 5a1.2 1.2 0 0 0 .8.8L11.5 7 8 8.2a1.2 1.2 0 0 0-.8.8L6 12.5 4.8 9a1.2 1.2 0 0 0-.8-.8L.5 7 4 5.8a1.2 1.2 0 0 0 .8-.8z" />
      <path d="M12.5 9.5l.6 1.7c.06.17.2.3.37.37l1.73.63-1.73.6a.6.6 0 0 0-.37.37l-.6 1.73-.63-1.73a.6.6 0 0 0-.37-.37L9.8 11.8l1.7-.63a.6.6 0 0 0 .37-.37z" />
    </svg>
  );
}

/** Example prompts, styled for the dark hero band. */
export function ExampleChips({ busy, onPick }: { busy: boolean; onPick: (query: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-hero-muted">
        <SparkleIcon className="h-3.5 w-3.5 text-accent-2" />
        Try asking
      </span>
      {EXAMPLE_QUERIES.map((q, i) => (
        <button
          key={q}
          type="button"
          disabled={busy}
          onClick={() => onPick(q)}
          // Two examples on phones keep the search card near the top of the first screen.
          className={`${i >= 2 ? "hidden sm:inline-block" : ""} max-w-full truncate rounded-full border border-hero-line px-3 py-1.5 text-xs text-hero-ink transition-colors hover:border-hero-ink hover:bg-hero-ink hover:text-hero disabled:opacity-60`}
        >
          {q}
        </button>
      ))}
    </div>
  );
}

/** Controlled by the parent so example chips can fill the input too. */
export function SearchBar({
  value,
  onValueChange,
  busy,
  onSubmit,
}: {
  value: string;
  onValueChange: (value: string) => void;
  busy: boolean;
  onSubmit: (query: string) => void;
}) {
  function submit(query: string) {
    const q = query.trim();
    if (!q || busy) return;
    onSubmit(q);
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
      className="flex flex-col gap-2 rounded-[8px] border border-border bg-card p-2 focus-within:border-accent focus-within:outline-2 focus-within:outline-accent sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 pl-3">
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-accent" fill="none" aria-hidden="true" focusable="false">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <label htmlFor="q" className="sr-only">
          Describe what you are looking for
        </label>
        <input
          id="q"
          name="q"
          type="search"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          maxLength={300}
          autoComplete="off"
          placeholder="Try: waterproof women's hiking boots under $150, size 8"
          className="h-12 w-full min-w-0 bg-transparent text-base text-ink placeholder:text-muted focus:outline-none sm:h-14 sm:text-lg"
        />
      </div>
      <button
        type="submit"
        disabled={busy || !value.trim()}
        aria-busy={busy}
        className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[6px] bg-accent px-6 font-semibold text-accent-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-75"
      >
        {busy ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : (
          <SparkleIcon className="h-4 w-4" />
        )}
        {busy ? "Understanding" : "Search"}
      </button>
    </form>
  );
}
