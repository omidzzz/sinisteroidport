// Next 16 removed `next lint` — ESLint now runs directly with the flat
// config format. eslint-config-next@16 ships native flat configs, so no
// FlatCompat shim is needed. `core-web-vitals` keeps the same rule set
// the project used under `next lint`.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    // The overrides below reference react-hooks rules; flat config requires
    // the plugin to be declared in the same object that toggles its rules
    // (eslint-config-next scopes its plugin declaration to matching files,
    // which leaves non-matching files without a resolvable plugin).
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "scripts/**",
      "content/**",
      ".shots/**",
      ".lighthouse/**",
      ".laptop-preview.js",
      "fix*.js",
      "write_*.js",
      "extract_css.js",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;