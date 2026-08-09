"use client";

import { useEffect } from "react";

/**
 * Registra public/sw.js. Sin service worker registrado el navegador no ofrece
 * instalar la app, y las notificaciones no pueden mostrarse con la app cerrada.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.error("[sw] registro fallido:", err));
    };

    // Después de `load` para no competir con los recursos del primer render.
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
