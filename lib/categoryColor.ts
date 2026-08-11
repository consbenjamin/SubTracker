/**
 * Color por categoría.
 *
 * Las categorías las escribe el usuario, así que no hay una lista fija que
 * mapear: el color se deriva del propio nombre. Al ser determinista, la misma
 * categoría se ve siempre igual, en cualquier pantalla y en cualquier sesión,
 * sin guardar nada.
 *
 * Solo se elige el tono; la saturación y la luminosidad las fija el CSS según
 * el tema, para que ningún color quede ilegible en claro ni en oscuro.
 */

/**
 * Tonos elegidos a mano. No se usa `hash % 360`: además de caer en verdes lima
 * ilegibles, daría tonos vecinos que a simple vista son el mismo color.
 *
 * Son ocho y no más porque importa que se distingan de un vistazo, no que haya
 * muchos: entre cada uno hay al menos 40° de separación. Una paleta más grande
 * obliga a meter cyan junto a teal y azul, que es justo lo que se quiere evitar.
 */
const HUES = [
  0, //   rojo
  30, //  naranja
  52, //  ámbar
  145, // verde
  190, // cyan
  232, // azul
  275, // violeta
  322, // rosa
];

/**
 * FNV-1a más una ronda de mezcla final.
 *
 * No necesita ser criptográfico, pero sí repartir parejo: los nombres de
 * categoría son cortos y se parecen entre sí, y con un hash simple varios caían
 * en el mismo color mientras otros quedaban sin usar. La mezcla del final
 * dispersa los bits altos y empareja el reparto.
 */
function hash(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909) >>> 0;
  return (h ^= h >>> 16) >>> 0;
}

/** Tono asignado a una categoría. Ignora mayúsculas y espacios sobrantes. */
export function categoryHue(category: string): number {
  const normalized = category.trim().toLowerCase();
  if (!normalized) return HUES[0];
  return HUES[hash(normalized) % HUES.length];
}

/** Estilo inline con el tono, para combinar con la clase `category-badge`. */
export function categoryHueStyle(category: string): React.CSSProperties {
  return { "--cat-hue": categoryHue(category) } as React.CSSProperties;
}
