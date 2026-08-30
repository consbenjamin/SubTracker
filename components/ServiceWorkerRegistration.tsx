"use client";

import { useEffect } from "react";

/**
 * Registra public/sw.js. Sin service worker registrado el navegador no ofrece
 * instalar la app, y las notificaciones no pueden mostrarse con la app cerrada.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // En desarrollo no: sw.js intercepta todos los GET del mismo origen, y eso
    // incluye los bundles de /_next/, que en dev se regeneran todo el tiempo.
    // Con un tope de 60 entradas vivía expulsando y re-sirviendo chunks viejos,
    // y convertía en un 503 propio cualquier pedido que fallara —cosa normal
    // durante un hot reload—. El resultado era HMR muerto y errores que no
    // correspondían al código que uno estaba mirando.
    //
    // Para probar la instalación o las notificaciones hace falta el service
    // worker: eso se prueba contra un build de verdad (`npm run build` y
    // `npm start`), donde los bundles llevan hash y cachearlos sí sirve.
    if (process.env.NODE_ENV !== "production") return;

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
