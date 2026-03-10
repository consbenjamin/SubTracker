/**
 * Logging seguro para OWASP A09 (Security Logging and Monitoring).
 * No registrar datos sensibles (contraseñas, tokens, PII completo).
 * En producción conectar a SIEM o servicio de logging.
 */

type LogLevel = "warn" | "error" | "info";

type SecurityEvent = {
  event: string;
  level: LogLevel;
  path?: string;
  status?: number;
  ip?: string;
  userId?: string;
  message?: string;
};

function sanitize(msg: string): string {
  return msg.slice(0, 500);
}

export function logSecurityEvent(event: SecurityEvent): void {
  const payload = {
    timestamp: new Date().toISOString(),
    ...event,
    message: event.message ? sanitize(event.message) : undefined,
  };
  if (event.level === "error") {
    console.error("[security]", JSON.stringify(payload));
  } else if (event.level === "warn") {
    console.warn("[security]", JSON.stringify(payload));
  } else {
    console.info("[security]", JSON.stringify(payload));
  }
}

export function logUnauthorized(path: string, ip?: string): void {
  logSecurityEvent({
    event: "unauthorized",
    level: "warn",
    path,
    status: 401,
    ip,
  });
}

export function logForbidden(path: string, ip?: string, userId?: string): void {
  logSecurityEvent({
    event: "forbidden",
    level: "warn",
    path,
    status: 403,
    ip,
    userId,
  });
}

export function logAuthFailure(path: string, ip?: string, message?: string): void {
  logSecurityEvent({
    event: "auth_failure",
    level: "warn",
    path,
    ip,
    message: message ? sanitize(message) : undefined,
  });
}

export function logRateLimited(path: string, ip: string, prefix: string): void {
  logSecurityEvent({
    event: "rate_limited",
    level: "warn",
    path,
    ip,
    message: `prefix=${prefix}`,
  });
}
