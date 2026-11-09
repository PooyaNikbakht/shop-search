import { COLOUR_HEX, type Category, type Colour } from "@/lib/catalog-meta";

/** Simple line drawings, one per category, tinted with the product's main colour. */
export const CATEGORY_SHAPES: Record<Category, string> = {
  footwear:
    "M30 24h20v26c6 2 14 4 24 6 10 2 16 6 16 12v4H26c-2 0-4-2-4-4V54c0-4 4-6 6-8z M26 72h66",
  jackets:
    "M46 16l14 8 14-8 18 10 10 26-12 4-6-14v42H36V42l-6 14-12-4 10-26z M60 24v50",
  pants: "M38 14h44l6 66H68l-8-44-8 44H32z M38 22h44",
  "base-layers": "M44 18l16 6 16-6 22 12-8 16-10-4v36H40V42l-10 4-8-16z M52 20c2 6 14 6 16 0",
  backpacks:
    "M42 26c0-8 8-12 18-12s18 4 18 12v50c0 4-2 6-6 6H48c-4 0-6-2-6-6z M48 50h24v18H48z M52 14c0-4 3-6 8-6s8 2 8 6",
  tents: "M14 78L60 18l46 60z M60 18v60 M50 78l10-22 10 22",
  "sleeping-bags":
    "M40 22c0-8 8-12 20-12s20 4 20 12v52c0 6-8 8-20 8s-20-2-20-8z M46 22c0-4 6-6 14-6s14 2 14 6v6H46z",
  accessories: "M30 58c0-18 12-32 30-32s30 14 30 32z M26 58h68v10H26z M60 26v-6",
};

export function ProductArt({ category, colour, className }: { category: Category; colour: Colour; className?: string }) {
  const fill = COLOUR_HEX[colour];
  return (
    <svg
      viewBox="0 0 120 90"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d={CATEGORY_SHAPES[category]}
        fill={fill}
        fillOpacity={0.85}
        stroke="var(--ink)"
        strokeOpacity={0.7}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
