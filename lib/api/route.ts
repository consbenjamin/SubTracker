import { NextResponse } from "next/server";
import type { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUserSafe } from "@/lib/supabase/user";
import { isRateLimitedRequest } from "@/lib/rate-limit";
import { getClientIp, unauthorizedResponse } from "@/lib/api-auth";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface RouteContext {
  supabase: Supabase;
  userId: string;
}

/**
 * Boilerplate común de las rutas API: rate limit (solo escrituras), autenticación
 * y parseo/validación del body. Devuelve `NextResponse` si hay que cortar,
 * o el contexto ya autenticado si todo está bien.
 */
export async function authenticate(
  request: Request,
  path: string,
  { rateLimit = false }: { rateLimit?: boolean } = {}
): Promise<RouteContext | NextResponse> {
  if (rateLimit && isRateLimitedRequest(getClientIp(request), "api")) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Intenta más tarde." },
      { status: 429 }
    );
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
