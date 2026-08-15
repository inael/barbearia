import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefatos gerados pelo harness (eslint flat nao le .gitignore):
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "reports/**",
    ".stryker-tmp/**",
  ]),
]);

export default eslintConfig;
