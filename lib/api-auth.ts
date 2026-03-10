import { NextResponse } from "next/server";
import { logUnauthorized } from "@/lib/security-logger";

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Respuesta 401 estándar con logging seguro (OWASP A09).
 * Usar cuando la ruta requiera usuario autenticado y no lo haya.
 */
export function unauthorizedResponse(request: Request, path?: string): NextResponse {
  const ip = getClientIp(request);
  logUnauthorized(path ?? new URL(request.url).pathname, ip);
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
