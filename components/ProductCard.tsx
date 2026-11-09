import Image from "next/image";
import { photoFor } from "@/config/photos";
import { CATEGORY_LABELS, COLOUR_HEX } from "@/lib/catalog-meta";
import { formatPrice } from "@/lib/describe";
import type { Product } from "@/lib/schema";
import { ProductArt } from "./ProductArt";

export function ProductCard({ product }: { product: Product }) {
  const onSale = product.compareAtPrice !== undefined;
  const discount = onSale ? Math.round((1 - product.price / product.compareAtPrice!) * 100) : 0;
  const photo = photoFor(product);
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[8px] border border-border bg-background">
      <div className="relative aspect-[4/3] bg-surface">
        {photo ? (
          <Image
            src={`/photos/${photo.key}`}
            alt={photo.alt}
            fill
            sizes="(min-width: 1280px) 250px, (min-width: 768px) 30vw, 50vw"
            className="object-cover"
          />
        ) : (
          <ProductArt category={product.category} colour={product.colours[0]} className="h-full w-full p-4" />
        )}
        {photo && (
          <span
            className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full border border-border bg-background px-1.5 py-1"
            title={`Colours: ${product.colours.join(", ")}`}
          >
            <span className="sr-only">Colours: {product.colours.join(", ")}</span>
            {product.colours.map((c) => (
              <span
                key={c}
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full border border-ink/25"
                style={{ backgroundColor: COLOUR_HEX[c] }}
              />
            ))}
          </span>
        )}
        {onSale && (
          <span className="absolute left-2 top-2 rounded-[6px] border border-danger bg-background px-1.5 py-0.5 font-mono text-[11px] text-danger">
            -{discount}%
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="truncate text-xs text-muted">
          {product.brand} <span aria-hidden="true">·</span> {CATEGORY_LABELS[product.category]}
        </p>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{product.title}</h3>
        <p className="flex items-center gap-1 text-xs text-muted" aria-label={`Rated ${product.rating} out of 5 from ${product.reviewCount.toLocaleString("en-US")} reviews`}>
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current text-ink" aria-hidden="true">
            <path d="M10 1.8l2.5 5.3 5.8.7-4.3 4 1.1 5.7L10 14.7l-5.1 2.8L6 11.8l-4.3-4 5.8-.7z" />
          </svg>
          <span className="text-ink">{product.rating.toFixed(1)}</span>
          <span>({product.reviewCount.toLocaleString("en-US")})</span>
        </p>
        <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-2 pt-1">
          <p className="flex items-baseline gap-1.5">
            <span className={`text-base font-semibold ${onSale ? "text-danger" : ""}`}>
              <span className="sr-only">{onSale ? "Sale price " : "Price "}</span>
              {formatPrice(product.price)}
            </span>
            {onSale && (
              <s className="text-xs text-muted">
                <span className="sr-only">Was </span>
                {formatPrice(product.compareAtPrice!)}
              </s>
            )}
          </p>
          <p className={`text-xs ${product.inStock ? "text-accent" : "text-muted"}`}>
            {product.inStock ? "In stock" : "Out of stock"}
          </p>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[8px] border border-border" aria-hidden="true">
      <div className="aspect-[4/3] animate-pulse bg-surface" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-3 w-1/2 animate-pulse rounded bg-surface" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-surface" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-surface" />
        <div className="mt-2 h-4 w-1/4 animate-pulse rounded bg-surface" />
      </div>
    </div>
  );
}
