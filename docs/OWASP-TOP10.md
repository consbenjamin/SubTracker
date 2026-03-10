# OWASP Top 10 – Controles aplicados en SubTracker

Resumen de cómo el proyecto aborda cada categoría del [OWASP Top 10 2021](https://owasp.org/Top10/).

---

## A01:2021 – Broken Access Control

- **Middleware** (`middleware.ts`): redirige a `/login` si no hay usuario en rutas protegidas; redirige a `/dashboard` si hay usuario en `/login`.
- **APIs**: todas las rutas que requieren autenticación llaman a `supabase.auth.getUser()` y devuelven `401` si no hay usuario (con logging en `lib/api-auth.ts`).
- **RLS en PostgreSQL**: políticas en `subscriptions` y `payment_history` filtran por `auth.uid()`; no se puede acceder a datos de otros usuarios.
- **Params de ruta**: los `[id]` se validan con `isValidSubscriptionId` (UUID) y las queries usan `.eq("user_id", user.id)`.

---

## A02:2021 – Cryptographic Failures

- Contraseñas y tokens gestionados por **Supabase Auth** (hashing, almacenamiento seguro).
- **HSTS** en producción (`next.config.js`): `Strict-Transport-Security` para forzar HTTPS.
- Cookies de sesión manejadas por `@supabase/ssr` (en producción usar HTTPS para `Secure`).

---

## A03:2021 – Injection

- **Sin SQL crudo**: todas las consultas usan la API de Supabase (`.from()`, `.eq()`, etc.).
- **Validación con Zod** en todas las APIs que reciben body o params (`lib/validations/schemas.ts`).
- **Sugerencias**: el parámetro `q` se limita en longitud y el filtrado se hace en memoria (no en la query).

---

## A04:2021 – Insecure Design

- Validación en **servidor** en todas las rutas (no solo en cliente).
- **Rate limiting** por IP en auth (`lib/rate-limit.ts`) y en APIs de escritura (POST/PUT/DELETE).
- **Open redirect** mitigado en `/api/auth/callback`: el param `next` solo acepta rutas que empiezan por `/` y no por `//`.

---

## A05:2021 – Security Misconfiguration

- **Headers** en `next.config.js`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Permitted-Cross-Domain-Policies: none`
  - `Permissions-Policy` (camera, microphone, geolocation, payment)
  - **CSP** con `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, etc.
- No se expone la **service role key**; solo anon key en cliente (seguridad vía RLS).

---

## A06:2021 – Vulnerable and Outdated Components

- Ejecutar periódicamente: `npm run audit` (script en `package.json`).
- Mantener dependencias actualizadas y revisar advisories.

---

## A07:2021 – Identification and Authentication Failures

- **Validación** de email y contraseña con Zod antes de llamar a Supabase.
- **Rate limit** en login y callback OAuth (límite por IP).
- **Mensajes genéricos** en login: "Email o contraseña incorrectos" para no revelar si el usuario existe.
- Sesiones con Supabase Auth y cookies manejadas por `@supabase/ssr`.

---

## A08:2021 – Software and Data Integrity Failures

- **Schemas Zod** consistentes entre formularios y APIs; tipos acotados y longitudes máximas.
- No se deserializa input no confiable sin validación.

---

## A09:2021 – Security Logging and Monitoring Failures

- **`lib/security-logger.ts`**: eventos `unauthorized`, `forbidden`, `auth_failure`, `rate_limited` sin datos sensibles.
- Las respuestas `401` pasan por `unauthorizedResponse()` que registra path e IP.
- El callback de auth registra fallos con `logAuthFailure` (sin loguear el cuerpo del error al usuario).

---

## A10:2021 – Server-Side Request Forgery (SSRF)

- No se hacen peticiones a URLs controladas por el usuario desde el servidor en este proyecto.

---

## Resumen de archivos relevantes

| Archivo | Función |
|--------|---------|
| `middleware.ts` | Protección de rutas y refresco de sesión |
| `next.config.js` | Headers de seguridad y CSP |
| `lib/rate-limit.ts` | Rate limiting por IP |
| `lib/api-auth.ts` | Helper 401 y obtención de IP con logging |
| `lib/security-logger.ts` | Logging seguro de eventos |
| `lib/validations/schemas.ts` | Schemas Zod para APIs y formularios |
| `app/api/auth/callback/route.ts` | Rate limit, open redirect, logging |
