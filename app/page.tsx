import { Suspense } from "react";
import { SearchApp } from "@/components/SearchApp";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-4 py-12 text-sm text-muted sm:px-6" role="status">
          Loading search...
        </div>
      }
    >
      <SearchApp />
    </Suspense>
  );
}
