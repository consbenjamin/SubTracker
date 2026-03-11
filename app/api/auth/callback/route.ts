import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isRateLimitedRequest } from "@/lib/rate-limit";
import { logAuthFailure, logRateLimited } from "@/lib/security-logger";

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function redirectTo(url: string) {
  return NextResponse.redirect(url, 302);
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
      return redirectTo(`${origin}/login?error=rate_limited`);
    }

    if (!code) {
      return redirectTo(`${origin}/login?error=no_code`);
    }

    const cookieStore = await cookies();

    const response = redirectTo(successRedirectUrl);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      logAuthFailure("/api/auth/callback", ip, error.message);
      return redirectTo(`${origin}/login?error=auth_failed`);
    }

    return response;
  } catch (err) {
    console.error("[auth/callback]", err);
    return redirectTo(`${origin}/login?error=auth_failed`);
  }
}
