import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Usuario actual, o null si no hay sesión válida.
 *
 * `auth.getUser()` no solo devuelve `{ error }`: cuando la cookie tiene un
 * refresh token vencido o revocado, el cliente lanza AuthApiError
 * (`refresh_token_not_found`). Sin capturarlo, el middleware rompe y la API
 * responde 500 donde correspondía un 401.
 */
export async function getUserSafe(supabase: SupabaseClient): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user;
  } catch {
    // Sesión inservible: para el caller es simplemente "no hay usuario".
    return null;
  }
}

/** Prefijo de las cookies de sesión de Supabase. */
const AUTH_COOKIE_PREFIX = "sb-";

export function isAuthCookie(name: string): boolean {
  return name.startsWith(AUTH_COOKIE_PREFIX);
}
