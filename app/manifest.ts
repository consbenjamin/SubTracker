import type { MetadataRoute } from "next";

/**
 * Servido en /manifest.webmanifest.
 *
 * Chrome exige, para ofrecer la instalación: name, short_name, start_url,
 * display standalone, un icono de 192px y otro de 512px en PNG, y un service
 * worker con handler de fetch (public/sw.js).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SubGhost - Detector de Suscripciones",
    short_name: "SubGhost",
    description: "Gestiona y detecta tus suscripciones olvidadas",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    orientation: "portrait-primary",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android recorta hasta un 20% de cada borde: estos llevan el margen incorporado.
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Suscripciones", url: "/subscriptions" },
      { name: "Compras", url: "/purchases" },
    ],
  };
}
