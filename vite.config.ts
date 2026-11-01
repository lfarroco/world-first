import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * GitHub Pages serves this repo as a project site, so the built app lives under
 * /world-first/. Development stays at "/" so localhost:5173 keeps working, and
 * preview uses the build's base so the production bundle can be checked locally.
 * If the site moves to a user site or a custom domain, change this constant.
 */
const BASE = "/world-first/";

export default defineConfig(({ command, isPreview }) => ({
  base: command === "build" || isPreview ? BASE : "/",
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  build: { outDir: "dist" },
  test: {
    // A world run plans three rival guilds over 84 days: ~1.3 s on an idle
    // machine, and 5 s+ when the machine is loaded. The default 5 s timeout
    // turned a green suite into a random failure, and the pre-commit hook runs
    // the suite (L110). This is a timeout, not an assertion: a real hang still
    // fails, just later.
    testTimeout: 20000,
  },
}));
