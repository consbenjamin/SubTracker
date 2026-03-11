import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isRateLimitedRequest } from "@/lib/rate-limit";
import { logAuthFailure, logRateLimited } from "@/lib/security-logger";

// Evitar que Next.js cachee esta ruta GET (sino puede devolver respuesta vieja o []).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Build a 302 redirect with optional Set-Cookie.
 * Incluye HTML de respaldo por si el navegador no sigue el 302 (evita ver []).
 */
function redirectResponse(
  location: string,
  setCookieHeaders: string[] = []
): Response {
  const headers = new Headers();
  headers.set("Location", location);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("X-Auth-Callback", "1");
  setCookieHeaders.forEach((value) => headers.append("Set-Cookie", value));

  const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${encodeURI(location)}"><title>Redirigiendo</title></head><body><p>Redirigiendo...</p><script>window.location.replace(${JSON.stringify(location)});</script></body></html>`;
  return new Response(html, { status: 302, headers });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const code = requestUrl.searchParams.get("code");
  const nextParam = requestUrl.searchParams.get("next") ?? "/dashboard";
  const safeNext =
    typeof nextParam === "string" &&
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";
  const successRedirectUrl = `${origin}${safeNext}`;

  try {
    const ip = getClientIp(request);
    if (isRateLimitedRequest(ip, "auth")) {
      logRateLimited("/api/auth/callback", ip, "auth");
      return redirectResponse(`${origin}/login?error=rate_limited`);
    }

    if (!code) {
      return redirectResponse(`${origin}/login?error=no_code`);
    }

    const cookieStore = await cookies();
    const setCookieHeaders: string[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              const opts = options as { maxAge?: number; path?: string; sameSite?: string; httpOnly?: boolean; secure?: boolean };
              const parts = [`${name}=${encodeURIComponent(value)}`];
              if (opts?.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`);
              if (opts?.path) parts.push(`Path=${opts.path}`);
              if (opts?.sameSite) parts.push(`SameSite=${opts.sameSite}`);
              if (opts?.httpOnly) parts.push("HttpOnly");
              if (opts?.secure) parts.push("Secure");
              setCookieHeaders.push(parts.join("; "));
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      logAuthFailure("/api/auth/callback", ip, error.message);
      return redirectResponse(`${origin}/login?error=auth_failed`);
    }

    return redirectResponse(successRedirectUrl, setCookieHeaders);
  } catch (err) {
    console.error("[auth/callback]", err);
    return redirectResponse(`${origin}/login?error=auth_failed`);
  }
}
