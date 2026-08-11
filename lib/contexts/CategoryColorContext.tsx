"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Subscription } from "@/types";
import { hueForIndex, normalizeCategory, orderedCategories } from "@/lib/categoryColor";

/**
 * Reparte los colores de categoría según la posición de cada una en la lista
 * del usuario, para que dos categorías distintas nunca compartan color.
 *
 * Vive en un contexto porque una tarjeta sola no puede saber qué color le toca:
 * hace falta ver el conjunto completo de categorías para repartirlos.
 */
const CategoryColorContext = createContext<Map<string, number> | null>(null);

export function CategoryColorProvider({
  subscriptions,
  children,
}: {
  subscriptions: Subscription[];
  children: ReactNode;
}) {
  const hues = useMemo(() => {
    const categories = orderedCategories(subscriptions);
    return new Map(categories.map((c, i) => [c, hueForIndex(i, categories.length)]));
  }, [subscriptions]);

  return <CategoryColorContext.Provider value={hues}>{children}</CategoryColorContext.Provider>;
}

/**
 * Tono asignado a una categoría.
 *
 * Fuera del provider —o con una categoría que no está en la lista— cae al
 * primer tono en lugar de romper: el color es decorativo, nunca información.
 */
export function useCategoryHue(category: string): number {
  const hues = useContext(CategoryColorContext);
  return hues?.get(normalizeCategory(category)) ?? hueForIndex(0, 1);
}
