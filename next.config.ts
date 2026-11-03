import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Old platform URLs now live under /dashboard; old referral links (/?ref=0x...) open the register page
  async redirects() {
    return [
      { source: "/", has: [{ type: "query", key: "ref" }], destination: "/register", permanent: false },
      { source: "/invest", destination: "/dashboard/invest", permanent: false },
      { source: "/withdraw", destination: "/dashboard/withdraw", permanent: false },
      { source: "/team", destination: "/dashboard/team", permanent: false },
      { source: "/structure", destination: "/dashboard/team", permanent: false },
      { source: "/dashboard/structure", destination: "/dashboard/team", permanent: false },
      { source: "/incomes", destination: "/dashboard/incomes", permanent: false },
    ];
  },
  // The landing page files were patched in place and keep their old hashed names, so make browsers revalidate them
  async headers() {
    return [
      { source: "/", headers: [{ key: "Cache-Control", value: "no-cache" }] },
      { source: "/assets/:path*", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
  // The landing page is a prebuilt static site served from public/index.html at "/"
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/index.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
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
