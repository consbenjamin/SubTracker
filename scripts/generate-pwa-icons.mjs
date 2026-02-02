#!/usr/bin/env node
/**
 * Genera iconos PWA (192x192 y 512x512) desde public/icons/icon.svg.
 * Fondo transparente. Requiere: npm install --save-dev sharp
 * Uso: node scripts/generate-pwa-icons.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "..", "public", "icons");
const svgPath = path.join(iconsDir, "icon.svg");

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error(
      "Error: sharp no está instalado. Ejecuta: npm install --save-dev sharp"
    );
    process.exit(1);
  }

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  if (!fs.existsSync(svgPath)) {
    console.error("No se encuentra public/icons/icon.svg. Crea el SVG primero.");
    process.exit(1);
  }

  const svg = fs.readFileSync(svgPath);
  const sizes = [192, 512];

  for (const size of sizes) {
    const filePath = path.join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(filePath);
    console.log(`Creado: ${filePath}`);
  }

  console.log("Iconos PWA generados (fondo transparente).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
