const manifest = {
  id: "/",
  name: "SubGhost - Detector de Suscripciones",
  short_name: "SubGhost",
  description: "Gestiona y detecta tus suscripciones olvidadas",
  start_url: "/dashboard",
  scope: "/",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#0a0a0a",
  orientation: "portrait-primary",
  icons: [
    { src: "/icons/subghost-logo.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
    { src: "/icons/subghost-logo.svg", sizes: "192x192", type: "image/svg+xml", purpose: "maskable" },
    { src: "/icons/subghost-logo.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
    { src: "/icons/subghost-logo.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
  ],
};

export async function GET() {
  const body = JSON.stringify(manifest);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
