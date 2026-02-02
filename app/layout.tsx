import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
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
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <SettingsProvider>
          <ToastProvider>
            {children}
            <OfflineIndicator />
          </ToastProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
