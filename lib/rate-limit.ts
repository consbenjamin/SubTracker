/**
 * Rate limiter en memoria (simple). Para producción con múltiples instancias
 * conviene usar Redis (ej. @upstash/ratelimit).
 * Limita por IP o por identificador (ej. user id).
 */

const store = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 60; // p.ej. 60 req/min por IP para API general
const MAX_AUTH_REQUESTS = 10; // menos para login/callback

function getKey(identifier: string, prefix: string): string {
  return `${prefix}:${identifier}`;
}

function isRateLimited(
  key: string,
  maxRequests: number,
  windowMs: number = WINDOW_MS
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    return true;
  }
  return false;
}

/** Limpia entradas expiradas (evitar crecimiento infinito del Map) */
function cleanup(): void {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now > v.resetAt) store.delete(k);
  }
}
if (typeof setInterval !== "undefined") {
  setInterval(cleanup, 5 * 60 * 1000); // cada 5 min
}

/**
 * Comprueba si la petición debe ser limitada.
 * @param identifier - IP o user id
 * @param prefix - "api" | "auth"
 * @returns true si se excedió el límite
 */
export function isRateLimitedRequest(
  identifier: string,
  prefix: "api" | "auth" = "api"
): boolean {
  const max =
    prefix === "auth" ? MAX_AUTH_REQUESTS : MAX_REQUESTS;
  return isRateLimited(getKey(identifier, prefix), max);
}
