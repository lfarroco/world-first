import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
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
});
