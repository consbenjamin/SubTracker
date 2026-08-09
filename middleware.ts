import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getUserSafe, isAuthCookie } from "@/lib/supabase/user";

/** Rutas accesibles sin sesión. */
const PUBLIC_PREFIXES = ["/login"];

/**
 * Las rutas de API no se redirigen nunca: cada una valida por su cuenta y
 * responde 401 en JSON (o, en el cron, con su propio bearer). Mandarlas a /login
 * devolvía un 307 al HTML del login, con lo cual `fetch` seguía el redirect,
 * `res.ok` daba true y el cliente creía que la llamada había funcionado.
 */
function isApi(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function isPublic(pathname: string): boolean {
  return pathname === "/" || isApi(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
          );
        },
      },
    }
  );

  const user = await getUserSafe(supabase);
  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirect = NextResponse.redirect(url);

    // La sesión que traía la request no sirve (token vencido o revocado). Si no
    // borramos sus cookies, cada request vuelve a intentar refrescarla y falla igual.
    for (const cookie of request.cookies.getAll()) {
      if (isAuthCookie(cookie.name)) redirect.cookies.delete(cookie.name);
    }
    return redirect;
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|manifest\\.json|api/auth|sw\\.js|workbox-.*\\.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)",
  ],
};
