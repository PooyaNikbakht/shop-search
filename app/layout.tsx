import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { site } from "@/config/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f2e2a" },
    { media: "(prefers-color-scheme: dark)", color: "#0c2522" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        {children}
        <footer className="mt-auto border-t border-border">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted sm:px-6">
            <p>
              <a className="text-ink underline-offset-4 hover:text-accent hover:underline" href={site.creditUrl}>
                Fictional business. Demo by {site.author}
              </a>
            </p>
            <p>
              Synthetic catalog. No real products.{" "}
              {site.repoUrl ? (
                <>
                  <a className="underline underline-offset-4 hover:text-accent" href={site.repoUrl}>
                    Source
                  </a>
                  {" · "}
                </>
              ) : null}
              <Link className="underline underline-offset-4 hover:text-accent" href="/credits">
                Photo credits
              </Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
