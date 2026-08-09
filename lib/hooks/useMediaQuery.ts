"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Estado de una media query.
 *
 * Va por `useSyncExternalStore` y no por useEffect + setState: `matchMedia` es
 * un store externo al render, y esta API es la que React provee para leerlos sin
 * provocar renders en cascada ni desajustes de hidratación.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    // En el servidor no hay viewport: asumimos escritorio y el cliente corrige.
    () => false
  );
}

/** Por debajo del breakpoint `lg` de Tailwind (1024px). */
export function useIsMobile(): boolean {
  return !useMediaQuery("(min-width: 1024px)");
}
