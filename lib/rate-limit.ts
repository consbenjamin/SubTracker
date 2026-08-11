/**
 * Rate limiter en memoria, por IP.
 *
 * LIMITACIÓN CONOCIDA: el contador vive en el proceso. En Vercel cada instancia
 * serverless tiene el suyo y se recicla, así que esto frena ráfagas accidentales
 * y scripts ingenuos, pero no es una garantía dura contra un atacante
 * distribuido. Para eso hace falta un store compartido (@upstash/ratelimit).
 */

const store = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 1000;

/** Cupos por minuto y por IP, según el costo de la operación. */
const LIMITS = {
  /** Lecturas: navegar la app dispara varias por pantalla. */
  read: 120,
  /** Escrituras: crear, editar y borrar son acciones deliberadas. */
  write: 40,
  /** Login y callback de OAuth: lo más sensible. */
  auth: 10,
} as const;

export type RateLimitBucket = keyof typeof LIMITS;

function isRateLimited(key: string, maxRequests: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > maxRequests;
}

/** Limpia entradas vencidas para que el Map no crezca sin límite. */
function cleanup(): void {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now > v.resetAt) store.delete(k);
  }
}
if (typeof setInterval !== "undefined") {
  setInterval(cleanup, 5 * 60 * 1000);
}

/**
 * @param identifier IP o id de usuario
 * @returns true si hay que rechazar la petición
 */
export function isRateLimitedRequest(
  identifier: string,
  bucket: RateLimitBucket = "read"
): boolean {
  return isRateLimited(`${bucket}:${identifier}`, LIMITS[bucket]);
}

/** Segundos hasta que se libera el cupo, para la cabecera Retry-After. */
export function secondsUntilReset(identifier: string, bucket: RateLimitBucket): number {
  const entry = store.get(`${bucket}:${identifier}`);
  if (!entry) return 0;
  return Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000));
}
