import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // The contracts repo root has its own package-lock.json; keep Next scoped to this app.
    root: __dirname,
    resolveAlias: {
      "@base-org/account": "./empty.js",
      "@coinbase/cdp-sdk": "./empty.js",
      "@x402/evm": "./empty.js",
      "@x402/core": "./empty.js",
      "@x402/svm": "./empty.js",
      "@x402/core/client": "./empty.js",
      "@x402/evm/exact/client": "./empty.js",
      "@x402/evm/upto/client": "./empty.js",
      "@x402/svm/exact/client": "./empty.js",
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
