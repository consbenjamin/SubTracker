const manifest = {
  id: "/",
  name: "SubTracker - Detector de Suscripciones",
  short_name: "SubTracker",
  description: "Gestiona y detecta tus suscripciones olvidadas",
  start_url: "/dashboard",
  scope: "/",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#0a0a0a",
  orientation: "portrait-primary",
  icons: [
    { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
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
