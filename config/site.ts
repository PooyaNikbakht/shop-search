/** Single place for personal links. */
export const site = {
  name: "shop-search",
  title: "shop-search: natural-language product search",
  description:
    "Type what you want in plain English and get validated, editable filters over an outdoor gear catalog. A portfolio demo with Claude, OpenAI and an offline parser.",
  author: "Pooya Nikbakht",
  githubUrl: "https://github.com/PooyaNikbakht",
  /** Where the footer line "Fictional business. Demo by ..." links to. */
  creditUrl: process.env.NEXT_PUBLIC_CREDIT_URL ?? "https://pooya.website",
  /** Empty while the repo is private: the Source and GitHub links are hidden. */
  repoUrl: "" as string,
  /** Made-up store name for the demo storefront. */
  storeName: "Switchback Supply",
  howItWorksUrl: "https://pooya.website/work/shop-search",
} as const;
