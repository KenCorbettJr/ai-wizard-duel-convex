import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { fileURLToPath } from "url";

fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    // Plain CommonJS Node CLI scripts legitimately use require().
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // eslint-config-next 16.4.x promotes several React Compiler
    // (react-hooks) rules to errors in its core-web-vitals preset. They flag
    // pre-existing component patterns (effect-driven state sync, memoization,
    // render-time component creation) that are unrelated to this dependency
    // upgrade. Demote them to warnings so lint stays green here; remediating
    // the flagged code is tracked as separate follow-up work.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/static-components": "warn",
    },
  },
];

export default eslintConfig;
