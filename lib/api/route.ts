import { NextResponse } from "next/server";
import type { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUserSafe } from "@/lib/supabase/user";
import {
  isRateLimitedRequest,
  secondsUntilReset,
  type RateLimitBucket,
} from "@/lib/rate-limit";
import { getClientIp, unauthorizedResponse } from "@/lib/api-auth";
import { logRateLimited } from "@/lib/security-logger";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface RouteContext {
  supabase: Supabase;
  userId: string;
}

/** 429 con Retry-After, para que el cliente sepa cuándo reintentar. */
export function tooManyRequests(seconds: number): NextResponse {
  return NextResponse.json(
    { error: "Demasiadas peticiones. Intentá de nuevo en un momento." },
    { status: 429, headers: { "Retry-After": String(seconds) } }
  );
}

/**
 * Boilerplate común de las rutas API: rate limit, autenticación y parseo del
 * body. Devuelve `NextResponse` si hay que cortar, o el contexto autenticado.
 *
 * El límite se aplica siempre: por defecto con el cupo de lectura, y las rutas
 * que escriben pasan "write". Es opt-out y no opt-in a propósito, para que una
 * ruta nueva quede protegida aunque quien la escriba se olvide.
 */
export async function authenticate(
  request: Request,
  path: string,
  { rateLimit = "read" }: { rateLimit?: RateLimitBucket | false } = {}
): Promise<RouteContext | NextResponse> {
  if (rateLimit) {
    const ip = getClientIp(request);
    if (isRateLimitedRequest(ip, rateLimit)) {
      logRateLimited(path, ip, rateLimit);
      return tooManyRequests(secondsUntilReset(ip, rateLimit));
    }
  }

  const supabase = await createClient();
  const user = await getUserSafe(supabase);

  if (!user) return unauthorizedResponse(request, path);

  return { supabase, userId: user.id };
}

/** Lee y valida el body contra un schema Zod. */
export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<{ data: z.infer<T> } | NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  return { data: parsed.data };
}

/** Respuesta de error de Supabase → 500 con el mensaje. */
export function dbError(error: { message: string }): NextResponse {
  return NextResponse.json({ error: error.message }, { status: 500 });
}

/** Respuestas que no deben cachearse (detalle y pagos). */
export const NO_STORE = {
  headers: { "Cache-Control": "no-store, must-revalidate" },
} as const;
