import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service role: saltea RLS.
 *
 * Solo para procesos sin sesión de usuario (el cron de notificaciones, que debe
 * leer los vencimientos de todas las cuentas). NUNCA importar desde un
 * componente cliente: la clave da acceso total a la base.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
