const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// El service worker está escrito a mano en public/sw.js y se registra desde
// components/ServiceWorkerRegistration.tsx. No se usa next-pwa: es un plugin de
// webpack y este proyecto buildea con Turbopack, así que nunca se ejecutaba.

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
      },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          // va.vercel-scripts.com: script de @vercel/analytics (<Analytics /> en app/layout.tsx).
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          // vitals.vercel-insights.com: endpoint donde @vercel/analytics reporta.
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://va.vercel-scripts.com https://vitals.vercel-insights.com",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "object-src 'none'",
        ].join("; "),
      },
    ];
    if (isProd) {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      });
    }
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
