import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next 16+ ships native flat config. We deliberately do NOT
// route this through @eslint/eslintrc's FlatCompat (the pattern used for
// Next 15 and earlier): next/core-web-vitals now includes
// eslint-plugin-react-hooks, whose config self-references its own plugin
// object, and FlatCompat crashes trying to JSON-serialize that circular
// structure ("Converting circular structure to JSON"). Importing the flat
// configs directly avoids the compat layer entirely.
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      "prisma/migrations/**",
    ],
  },
];

export default eslintConfig;
