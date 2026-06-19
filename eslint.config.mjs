import path from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";
import importPlugin from "eslint-plugin-import";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/sw.js",
      "public/swe-worker-*.js",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    plugins: { import: importPlugin },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "import/order": [
        "warn",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports" }],
      // Termos descontinuados (drift de copy). Use o canônico: "Quanto falta pagar"
      // (saldo por dívida), "Sobra do mês" / "Falta do mês" (sobra mensal). Ver
      // app/(app)/app/_lib/copy/terms.ts. "saldo livre" segue válido como termo
      // interno/engine, por isso não entra aqui.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/Dívida atual|Saldo devedor|Sobra esse mês|Falta esse mês|Você deve hoje/]",
          message:
            "Termo de copy descontinuado. Use o canônico (Quanto falta pagar / Sobra do mês). Ver app/(app)/app/_lib/copy/terms.ts.",
        },
        {
          selector:
            "JSXText[value=/Dívida atual|Sobra esse mês|Falta esse mês|Você deve hoje/]",
          message:
            "Termo de copy descontinuado. Use o canônico (Quanto falta pagar / Sobra do mês). Ver app/(app)/app/_lib/copy/terms.ts.",
        },
      ],
    },
  },
];

export default eslintConfig;
