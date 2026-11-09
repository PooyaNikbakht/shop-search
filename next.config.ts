import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Do not write an AGENTS.md file into the repo during `next dev`.
  agentRules: false,
  poweredByHeader: false,
  images: {
    // Photos are pre-sized at build time; see lib/image-loader.ts.
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
    deviceSizes: [640, 1280, 1920],
    imageSizes: [240, 320, 480],
  },
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
