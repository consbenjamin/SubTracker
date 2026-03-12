import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next"
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: false,
});
import { SettingsProvider } from "@/lib/contexts/SettingsContext";
import { ToastProvider } from "@/lib/contexts/ToastContext";
import { OfflineIndicator } from "@/components/OfflineIndicator";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  title: "SubGhost - Detector de Suscripciones",
  description: "Gestiona y detecta tus suscripciones olvidadas",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SubGhost",
  },
  icons: {
    icon: "/icons/subghost-logo.svg",
    apple: "/icons/subghost-logo.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.variable}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Analytics />
        <NextIntlClientProvider messages={messages}>
          <SettingsProvider>
            <ToastProvider>
              {children}
              <OfflineIndicator />
            </ToastProvider>
          </SettingsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
