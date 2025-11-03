import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        name: "convex",
        test: {
          globals: true,
          include: ["convex/**/*.test.ts"],
          exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
          environment: "edge-runtime",
          setupFiles: [
            "./src/tests/setup.ts",
            "./src/tests/vitest-setup.ts",
            "./src/tests/convex-setup.ts",
          ],
          server: { deps: { inline: ["convex-test"] } },
          silent: false,
          reporter: ["verbose"],
          onConsoleLog: () => false,
        },
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "./src"),
          },
        },
      },
      {
        name: "frontend",
        plugins: [react()],
        test: {
          globals: true,
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: [
            "convex/**/*.test.ts",
            "**/node_modules/**",
            "**/dist/**",
            "**/.next/**",
          ],
          environment: "jsdom",
          setupFiles: ["./src/tests/setup.ts", "./src/tests/vitest-setup.ts"],
          silent: false,
          reporter: ["verbose"],
          onConsoleLog: () => false,
          server: {
            deps: {
              inline: ["parse5", "jsdom"],
            },
          },
        },
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "./src"),
          },
        },
      },
    ],
  },
});
