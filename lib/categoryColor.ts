import type { Subscription } from "@/types";

/**
 * Color por categoría.
 *
 * El color sale de la POSICIÓN de la categoría dentro de la lista del usuario,
 * no de un hash de su nombre: así dos categorías distintas nunca comparten
 * color mientras entren en la paleta. Ver CategoryColorProvider.
 *
 * Del nombre solo se decide el tono; la saturación y la luminosidad las fija el
 * CSS según el tema, para que ningún tono quede ilegible en claro ni en oscuro.
 */

/**
 * Ocho tonos elegidos a mano, con 40° o más entre sí. Se prioriza que se
 * distingan de un vistazo por sobre tener muchos: una paleta más grande obliga
 * a meter cyan pegado a teal y azul, que a simple vista son el mismo color.
 */
const HUES = [
  232, // azul
  30, //  naranja
  145, // verde
  322, // rosa
  52, //  ámbar
  275, // violeta
  190, // cyan
  0, //   rojo
];

/** Normaliza para que "Streaming" y "streaming" sean la misma categoría. */
export function normalizeCategory(category: string): string {
  return category.trim().toLowerCase();
}

/**
 * Tono para la categoría en la posición `index` de una lista de `total`.
 *
 * Hasta ocho usa la paleta curada. Si hay más, reparte tonos equiespaciados
 * alrededor del círculo: pierde el ajuste fino de la paleta, pero garantiza que
 * sigan siendo todos distintos, que es lo que importa.
 */
export function hueForIndex(index: number, total: number): number {
  if (index < 0) return HUES[0];
  if (total <= HUES.length) return HUES[index % HUES.length];
  return Math.round((index * 360) / total);
}

/**
 * Categorías del usuario ordenadas por antigüedad de uso.
 *
 * Se ordena por la suscripción más vieja que usa cada una, y no alfabéticamente,
 * para que agregar una categoría nueva no le cambie el color a las que ya
 * existían: la nueva se agrega al final y toma el siguiente color libre.
 */
export function orderedCategories(subscriptions: Subscription[]): string[] {
  const firstSeen = new Map<string, string>();

  for (const sub of subscriptions) {
    const key = normalizeCategory(sub.category ?? "");
    if (!key) continue;
    const previous = firstSeen.get(key);
    if (previous === undefined || sub.created_at < previous) {
      firstSeen.set(key, sub.created_at);
    }
  }

  return [...firstSeen.entries()]
    .sort(([aKey, aDate], [bKey, bDate]) =>
      aDate === bDate ? aKey.localeCompare(bKey) : aDate < bDate ? -1 : 1
    )
    .map(([key]) => key);
}

/** Estilo inline con el tono, para combinar con la clase `category-badge`. */
export function categoryHueStyle(hue: number): React.CSSProperties {
  return { "--cat-hue": hue } as React.CSSProperties;
}
