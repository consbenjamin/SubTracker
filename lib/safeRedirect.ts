/**
 * Destino interno seguro para el `?next=` del login.
 *
 * Dos cosas tiene que impedir:
 *
 * 1. Mandar a otro sitio. `//evil.com` es una URL protocol-relative: pegada
 *    después del origen seguiría siendo una redirección afuera.
 * 2. Inyectar HTML. El callback devuelve una página de respaldo que mete el
 *    destino dentro de un `<script>`, así que un valor con `</script>` cerraría
 *    el bloque y lo que siguiera correría como código en el origen de la app.
 *    Alcanzaba con que empezara en `/` para pasar el filtro anterior.
 *
 * Se reconstruye con el parser de URL en vez de validar con una expresión
 * regular: percent-encodea `<`, `>` y `"` tanto en la ruta como en la query, y
 * descarta cualquier host, así que lo que sale es siempre una ruta de este
 * mismo sitio y sin caracteres que puedan romper el HTML.
 */
export function safeInternalPath(raw: string | null | undefined): string {
  const FALLBACK = "/dashboard";
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return FALLBACK;
  try {
    const parsed = new URL(raw, "http://interno.invalid");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return FALLBACK;
  }
}
