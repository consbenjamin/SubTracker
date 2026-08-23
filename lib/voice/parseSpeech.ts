import type { BillingCycle, PaymentType, SubscriptionStatus } from "@/types";
import { SUBSCRIPTION_TEMPLATES } from "@/lib/constants/subscriptionTemplates";
import { addMonthsDateOnly, toDateOnly, todayDateOnly } from "@/lib/date";
import {
  esPalabraNumerica,
  normalizar,
  palabrasANumero,
  tramosNumericos,
} from "./numbers";

/**
 * Interpreta un gasto dictado por voz.
 *
 * Todo pasa por reglas, sin llamar a ningún servicio: el dictado ya lo hace el
 * sistema operativo gratis y el vocabulario de esta app es cerrado (17
 * servicios conocidos, cuatro ciclos, cuatro cantidades de cuotas).
 *
 * Nunca guarda solo: el resultado prellena el formulario y la persona confirma.
 * Por eso ante la duda se prefiere dejar un campo vacío antes que adivinar.
 */

export interface SpeechResult {
  /** Campos reconocidos. Los que no se dijeron quedan sin definir. */
  values: {
    name?: string;
    price?: number;
    billing_cycle?: BillingCycle;
    payment_type?: PaymentType;
    installment_count?: 3 | 6 | 9 | 12;
    total_amount?: number;
    next_payment_date?: string;
    category?: string;
    status?: SubscriptionStatus;
  };
  /** Qué campos salieron del audio, para poder marcarlos en el formulario. */
  detected: string[];
  /** Avisos para mostrar (por ejemplo, que se dictó otra moneda). */
  warnings: string[];
}

/** Alias por los que la gente nombra cada servicio al hablar. */
const ALIAS: Record<string, string[]> = {
  "Disney+": ["disney plus", "disney"],
  "HBO Max": ["hbo max", "hbo", "max"],
  "Amazon Prime": ["amazon prime", "prime video", "prime"],
  "Apple TV+": ["apple tv plus", "apple tv"],
  Gimnasio: ["gimnasio", "gym"],
  "Adobe Creative Cloud": ["adobe creative cloud", "adobe"],
  "Xbox Game Pass": ["xbox game pass", "game pass", "xbox"],
  "PlayStation Plus": ["playstation plus", "play station plus", "playstation", "play station"],
  "Microsoft 365": ["microsoft 365", "office 365", "office"],
  "Google One": ["google one", "google drive"],
  "Periódico / Revista": ["periodico", "revista", "diario"],
  "Curso online": ["curso online", "curso"],
  iCloud: ["icloud", "i cloud"],
};

/** Categorías en español tal como se dictan, hacia la clave que usa la app. */
const CATEGORIAS: Record<string, string> = {
  streaming: "streaming", peliculas: "streaming", series: "streaming",
  musica: "music", music: "music",
  nube: "cloud", cloud: "cloud", almacenamiento: "cloud",
  gimnasio: "fitness", fitness: "fitness", deporte: "fitness", salud: "health", medicina: "health",
  software: "software", programacion: "software", programas: "software",
  juegos: "gaming", gaming: "gaming", videojuegos: "gaming",
  noticias: "news", diario: "news",
  educacion: "education", cursos: "education", estudio: "education",
  hogar: "home", casa: "home", alquiler: "home", servicios: "home",
  transporte: "transport", auto: "transport", nafta: "transport",
  comida: "food", delivery: "food", supermercado: "food",
  ropa: "clothing", indumentaria: "clothing",
  tecnologia: "tech", tecno: "tech",
  seguro: "insurance", seguros: "insurance",
};

/** Muletillas y verbos con los que arranca una frase dictada. */
const ARRANQUE =
  /^(che|dale|ok|listo|bueno|a ver|agrega|agregame|agregar|anota|anotame|anotar|suma|sumame|sumar|pone|poneme|poner|carga|cargame|cargar|meteme|meter|quiero|necesito|tengo|pague|compre|contrate|contrate|suscribi|suscribime|me|mi|el|la|los|las|un|una|unos|unas)$/;

/** Palabras que cortan el nombre: a partir de acá ya no es el nombre del gasto. */
const CORTE = new Set([
  "de", "del", "por", "a", "al", "cada", "categoria", "que", "en", "con",
  "el", "la", "los", "las", "un", "una", "pesos", "peso", "mangos", "dolares",
  "dolar", "usd", "euros", "euro", "cuesta", "sale", "vale", "son", "es",
  "cuotas", "cuota", "mensual", "anual", "trimestral", "gratis", "hoy", "mañana",
]);

const MESES: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9,
  noviembre: 10, diciembre: 11,
};

const CUOTAS_VALIDAS = [3, 6, 9, 12] as const;

// --- Precio ----------------------------------------------------------------

/**
 * Importe dicho en una frase.
 *
 * Los candidatos compiten: un dígito suelto puede ser el día de cobro o la
 * cantidad de cuotas, y "una tele" empieza con un número que no es un precio.
 */
function extraerPrecio(texto: string, palabras: string[]): number | null {
  // El día de cobro no es un importe: "el 5 de cada mes" no cuesta 5.
  const sinDia = texto.replace(/\bel\s+(?:d[ií]a\s+)?\d{1,2}\b/g, " ");

  const enDigitos = sinDia.match(
    /(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/
  );
  if (enDigitos) {
    const crudo = enDigitos[1];
    // "3 cuotas" es una cantidad, no un precio.
    const esCantidadDeCuotas = new RegExp(
      `${crudo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*cuotas`
    ).test(sinDia);
    if (!esCantidadDeCuotas) {
      const normalizado = /\.\d{3}/.test(crudo)
        ? crudo.replace(/\./g, "")
        : crudo;
      const valor = parseFloat(normalizado.replace(",", "."));
      if (!Number.isNaN(valor) && valor > 0) return valor;
    }
  }

  const candidatos = tramosNumericos(palabras)
    .filter(([, fin]) => palabras[fin] !== "cuotas")
    .filter(([inicio, fin]) => {
      if (fin - inicio > 1) return true;
      // Un número corto y suelto solo es precio si lo sigue la moneda:
      // descarta el "una" de "una tele" y el día en "el 5 de cada mes".
      const valor = palabrasANumero(palabras.slice(inicio, fin));
      if (valor == null) return false;
      if (valor >= 100) return true;
      return /^(pesos|peso|mangos|dolares|dolar|usd|euros|euro|mil)$/.test(
        palabras[fin] ?? ""
      );
    })
    .sort((a, b) => b[1] - b[0] - (a[1] - a[0]));

  if (!candidatos.length) return null;

  const [inicio, fin] = candidatos[0];
  let valor = palabrasANumero(palabras.slice(inicio, fin));
  if (valor == null) return null;

  // Centavos: "sesenta y tres mil ... con sesenta y siete".
  if (palabras[fin] === "con") {
    const resto = palabras.slice(fin + 1);
    const siguiente = tramosNumericos(resto)[0];
    if (siguiente && siguiente[0] === 0) {
      const centavos = palabrasANumero(resto.slice(0, siguiente[1]));
      if (centavos != null && centavos < 100) valor += centavos / 100;
    }
  }

  return valor;
}

// --- Nombre ----------------------------------------------------------------

interface NombreDetectado {
  name?: string;
  category?: string;
  billing_cycle?: BillingCycle;
}

function extraerNombre(texto: string): NombreDetectado {
  const plano = normalizar(texto);

  // Primero el catálogo: si nombró un servicio conocido, viene con su
  // categoría y su ciclo habitual de regalo.
  for (const plantilla of SUBSCRIPTION_TEMPLATES) {
    const claves = [plantilla.name, ...(ALIAS[plantilla.name] ?? [])].map(normalizar);
    // Los alias cortos ("max", "office") solo valen como palabra entera.
    if (claves.some((clave) => new RegExp(`\\b${clave.replace(/[+]/g, "\\+")}`).test(plano))) {
      return {
        name: plantilla.name,
        category: plantilla.category,
        billing_cycle: plantilla.billing_cycle,
      };
    }
  }

  // Nombre libre: desde el arranque real de la frase hasta la primera palabra
  // que ya no puede ser parte del nombre.
  const tokens = texto.split(/\s+/);
  const planos = tokens.map((t) => normalizar(t).replace(/[.,;:!?¿¡]/g, ""));

  let i = 0;
  const anclaje = planos.findIndex((w) =>
    /^(suscripcion|suscripcion|gasto|servicio|compra|plan)$/.test(w)
  );
  if (anclaje >= 0) {
    i = anclaje + 1;
    if (planos[i] === "de" || planos[i] === "a" || planos[i] === "del") i++;
  } else {
    while (i < planos.length && ARRANQUE.test(planos[i])) i++;
  }

  const partes: string[] = [];
  for (; i < tokens.length && partes.length < 4; i++) {
    const plano2 = planos[i];
    if (!plano2 || esPalabraNumerica(plano2) || CORTE.has(plano2) || /\d/.test(plano2)) break;
    partes.push(tokens[i].replace(/[.,;:!?¿¡]+$/, ""));
  }

  if (!partes.length) return {};

  // Se dicta todo en minúscula: sin esto la tarjeta diría "adidas".
  const name = partes
    .map((p) => (p.length > 2 ? p[0].toUpperCase() + p.slice(1) : p))
    .join(" ");
  return { name };
}

// --- Fecha -----------------------------------------------------------------

/** El próximo día `dia` del mes, desde hoy. */
function proximoDia(dia: number, hoy = new Date()): string {
  const candidato = new Date(hoy.getFullYear(), hoy.getMonth(), dia);
  if (candidato < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) {
    return toDateOnly(new Date(hoy.getFullYear(), hoy.getMonth() + 1, dia));
  }
  return toDateOnly(candidato);
}

function extraerFecha(texto: string, hoy = new Date()): string | null {
  const s = normalizar(texto);

  if (/\bhoy\b/.test(s)) return todayDateOnly();
  if (/\bma[nñ]ana\b/.test(s)) {
    return toDateOnly(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1));
  }
  if (/(el mes que viene|el pr[oó]ximo mes|mes siguiente)/.test(s)) {
    return addMonthsDateOnly(toDateOnly(hoy), 1);
  }

  // "el 5 de septiembre" — con año implícito: si ya pasó, es el año que viene.
  const conMes = s.match(
    /\b(\d{1,2}|primero|primer)\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/
  );
  if (conMes) {
    const dia = /^\d+$/.test(conMes[1]) ? parseInt(conMes[1], 10) : 1;
    const mes = MESES[conMes[2]];
    const esteAno = new Date(hoy.getFullYear(), mes, dia);
    const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    return toDateOnly(esteAno < base ? new Date(hoy.getFullYear() + 1, mes, dia) : esteAno);
  }

  // "el 20", "el día 20", "todos los 20", "el 20 de cada mes".
  const soloDia = s.match(/\b(?:el|los)\s+(?:d[ií]a\s+)?(\d{1,2})\b/);
  if (soloDia) {
    const dia = parseInt(soloDia[1], 10);
    if (dia >= 1 && dia <= 31) return proximoDia(dia, hoy);
  }

  return null;
}

// --- Parser ----------------------------------------------------------------

export function parseSpeech(texto: string, hoy = new Date()): SpeechResult {
  const values: SpeechResult["values"] = {};
  const detected: string[] = [];
  const warnings: string[] = [];

  const limpio = texto.trim();
  if (!limpio) return { values, detected, warnings };

  const plano = normalizar(limpio);
  const palabras = plano.replace(/[.,;:!?¿¡]/g, " ").split(/\s+/).filter(Boolean);

  const marcar = <K extends keyof SpeechResult["values"]>(
    campo: K,
    valor: SpeechResult["values"][K]
  ) => {
    if (valor === undefined || valor === null) return;
    values[campo] = valor;
    if (!detected.includes(campo)) detected.push(campo);
  };

  // Nombre (y lo que arrastra del catálogo)
  const nombre = extraerNombre(limpio);
  marcar("name", nombre.name);
  if (nombre.category) marcar("category", nombre.category);
  if (nombre.billing_cycle) marcar("billing_cycle", nombre.billing_cycle);

  // Precio. El nombre puede llevar números ("Microsoft 365") y confundirlo.
  let textoPrecio = plano;
  let palabrasPrecio = palabras;
  if (values.name && /\d/.test(values.name)) {
    const nombrePlano = normalizar(values.name);
    textoPrecio = plano.replace(nombrePlano, " ");
    const tokensNombre = nombrePlano.split(/\s+/);
    palabrasPrecio = palabras.filter((w) => !(tokensNombre.includes(w) && /\d/.test(w)));
  }

  if (/\b(gratis|sin costo|no pago nada|cero pesos)\b/.test(plano)) {
    marcar("price", 0);
  } else {
    const precio = extraerPrecio(textoPrecio, palabrasPrecio);
    if (precio != null) marcar("price", precio);
  }

  if (/\b(dolares|dolar|usd|euros|euro)\b/.test(plano)) {
    warnings.push("currencyMismatch");
  }

  // Cuotas
  const cuotas = plano.match(/\b(\d{1,2}|tres|seis|nueve|doce)\s*cuotas\b/);
  if (cuotas || /\ben cuotas\b/.test(plano)) {
    marcar("payment_type", "installment");
    marcar("billing_cycle", "monthly");

    const cantidad = cuotas
      ? (palabrasANumero([cuotas[1]]) ?? parseInt(cuotas[1], 10))
      : null;
    if (cantidad && (CUOTAS_VALIDAS as readonly number[]).includes(cantidad)) {
      marcar("installment_count", cantidad as 3 | 6 | 9 | 12);
    } else if (cantidad) {
      // 10 cuotas no es un plan válido en esta app: mejor avisar que redondear.
      warnings.push("installmentCountUnsupported");
    }

    // "N cuotas DE X": lo que sigue es el valor de la cuota, no el total.
    const iCuotas = palabras.indexOf("cuotas");
    const n = values.installment_count;
    if (iCuotas >= 0 && palabras[iCuotas + 1] === "de" && n) {
      const resto = palabras.slice(iCuotas + 2);
      const porCuota = extraerPrecio(resto.join(" "), resto);
      if (porCuota != null) {
        marcar("price", porCuota);
        marcar("total_amount", Math.round(porCuota * n * 100) / 100);
      }
    } else if (values.price != null && n) {
      // Se dijo el total: el formulario espera total + cantidad y calcula la cuota.
      marcar("total_amount", values.price);
      marcar("price", Math.round((values.price / n) * 100) / 100);
    }
  } else {
    marcar("payment_type", "recurring");
    if (/\b(anual|anuales|por a[nñ]o|al a[nñ]o|cada a[nñ]o)\b/.test(plano)) {
      marcar("billing_cycle", "yearly");
    } else if (/\b(trimestral|trimestrales|cada tres meses|cada 3 meses)\b/.test(plano)) {
      marcar("billing_cycle", "quarterly");
    } else if (/\b(mensual|mensuales|por mes|al mes|cada mes|mes a mes)\b/.test(plano)) {
      marcar("billing_cycle", "monthly");
    }
  }

  // Categoría dictada explícitamente: pisa la del catálogo.
  const categoria = plano.match(/categor[ií]a\s+(?:de\s+)?([a-z]+)/);
  if (categoria) {
    marcar("category", CATEGORIAS[categoria[1]] ?? categoria[1]);
  } else if (!values.category) {
    // Sin la palabra "categoría", igual se acepta un nombre de categoría suelto.
    const suelta = palabras.find((w) => CATEGORIAS[w] != null);
    if (suelta) marcar("category", CATEGORIAS[suelta]);
  }

  // Estado
  if (/\b(pausad[ao]|en pausa|frenad[ao])\b/.test(plano)) marcar("status", "paused");
  else if (/\b(cancelad[ao]|dad[ao] de baja|di de baja|ya no la tengo)\b/.test(plano)) {
    marcar("status", "cancelled");
  }

  // Fecha
  const fecha = extraerFecha(limpio, hoy);
  if (fecha) marcar("next_payment_date", fecha);

  return { values, detected, warnings };
}
