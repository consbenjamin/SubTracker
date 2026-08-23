/**
 * Números dictados en español a número.
 *
 * No hay paquete que haga esto: `words-to-numbers` solo entiende inglés y
 * `text2num` está abandonado. Son pocas reglas y el vocabulario es cerrado.
 */

const UNIDADES: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintiun: 21,
  veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25,
  veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70,
  ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200,
  trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600,
  setecientos: 700, ochocientos: 800, novecientos: 900,
  // Ordinales que aparecen en fechas dictadas: "el primero de octubre".
  primero: 1, primer: 1, segundo: 2, tercero: 3, tercer: 3,
};

/** Multiplicadores, incluida la jerga rioplatense (una luca = mil, un palo = un millón). */
const ESCALAS: Record<string, number> = {
  mil: 1_000, miles: 1_000, luca: 1_000, lucas: 1_000, gamba: 100, gambas: 100,
  millon: 1_000_000, millones: 1_000_000, palo: 1_000_000, palos: 1_000_000,
};

/** Quita tildes y pasa a minúsculas, para comparar sin sorpresas. */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** ¿Esta palabra puede formar parte de un número dictado? */
export function esPalabraNumerica(palabra: string): boolean {
  return UNIDADES[palabra] != null || ESCALAS[palabra] != null || palabra === "y";
}

/**
 * Convierte una secuencia de palabras numéricas a número.
 * Devuelve null si alguna palabra no pertenece al vocabulario.
 */
export function palabrasANumero(palabras: string[]): number | null {
  let total = 0;
  let parcial = 0;
  let hubo = false;

  for (const palabra of palabras) {
    if (palabra === "y") continue;
    const unidad = UNIDADES[palabra];
    if (unidad != null) {
      parcial += unidad;
      hubo = true;
      continue;
    }
    const escala = ESCALAS[palabra];
    if (escala != null) {
      parcial = (parcial || 1) * escala;
      total += parcial;
      parcial = 0;
      hubo = true;
      continue;
    }
    return null;
  }

  return hubo ? total + parcial : null;
}

/** Tramos contiguos de palabras numéricas dentro de una frase ya tokenizada. */
export function tramosNumericos(palabras: string[]): Array<[number, number]> {
  const tramos: Array<[number, number]> = [];
  let inicio = -1;

  palabras.forEach((palabra, i) => {
    if (esPalabraNumerica(palabra)) {
      if (inicio < 0) inicio = i;
    } else if (inicio >= 0) {
      tramos.push([inicio, i]);
      inicio = -1;
    }
  });
  if (inicio >= 0) tramos.push([inicio, palabras.length]);

  // Un tramo que es solo "y" no es un número.
  return tramos.filter(([a, b]) => palabras.slice(a, b).some((w) => w !== "y"));
}
