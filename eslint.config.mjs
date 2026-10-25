import { defineConfig } from "eslint/config";
import nextConfig from "eslint-config-next";

export default defineConfig([
  ...nextConfig,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
]);
