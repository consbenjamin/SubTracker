import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", "node_modules/**", "public/sw.js", "public/workbox-*.js"] },
  ...coreWebVitals,
  ...typescript,
  {
    // Los archivos de configuración de Next son CommonJS por diseño.
    files: ["*.config.js", "*.config.mjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
];

export default config;
