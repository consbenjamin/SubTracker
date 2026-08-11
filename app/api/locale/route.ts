import { NextRequest, NextResponse } from "next/server";
import { isRateLimitedRequest, secondsUntilReset } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/api-auth";
import { tooManyRequests } from "@/lib/api/route";
import { logRateLimited } from "@/lib/security-logger";

const LOCALE_COOKIE = "locale";
const SUPPORTED = ["es", "en"];
const MAX_AGE = 60 * 60 * 24 * 365; // 1 año
const PATH = "/api/locale";

export async function POST(request: NextRequest) {
  // Es pública (hay que poder cambiar el idioma antes de iniciar sesión), así
  // que el límite es lo único que la protege de que la golpeen en bucle.
  const ip = getClientIp(request);
  if (isRateLimitedRequest(ip, "write")) {
    logRateLimited(PATH, ip, "write");
    return tooManyRequests(secondsUntilReset(ip, "write"));
  }

  const body = await request.json().catch(() => ({}));
  const locale = typeof body.locale === "string" ? body.locale : null;

  if (!locale || !SUPPORTED.includes(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: MAX_AGE,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
