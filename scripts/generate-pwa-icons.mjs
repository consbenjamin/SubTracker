#!/usr/bin/env node
/**
 * Genera iconos PWA placeholder (192x192 y 512x512) en public/icons/.
 * Requiere: npm install --save-dev sharp
 * Uso: node scripts/generate-pwa-icons.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "..", "public", "icons");

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

  // Color de fondo y tema (#0a0a0a en RGB)
  const fill = { r: 10, g: 10, b: 10 };
  const sizes = [192, 512];

  for (const size of sizes) {
    const filePath = path.join(iconsDir, `icon-${size}x${size}.png`);
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 3,
        background: fill,
      },
    })
      .png()
      .toFile(filePath);
    console.log(`Creado: ${filePath}`);
  }

  console.log("Iconos PWA generados correctamente.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
