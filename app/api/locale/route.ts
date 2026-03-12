import { NextRequest, NextResponse } from "next/server";

const LOCALE_COOKIE = "locale";
const SUPPORTED = ["es", "en"];
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function POST(request: NextRequest) {
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
