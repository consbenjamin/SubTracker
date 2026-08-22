/* eslint-disable no-undef */
/**
 * Service worker de SubGhost.
 *
 * Escrito a mano en vez de generado: next-pwa es un plugin de webpack y el build
 * de Next 16 usa Turbopack, con lo cual nunca llegaba a ejecutarse y la app no
 * era instalable. Además necesitamos control directo sobre `push` y
 * `notificationclick`, que es lo que hace que los avisos funcionen con la app
 * cerrada.
 */

const CACHE = "subghost-v1";

/**
 * Tope de entradas de la caché.
 *
 * El nombre de la caché es fijo, así que `activate` nunca la borra: sin un
 * límite, cada deploy dejaba dentro sus propios assets con hash y la caché
 * crecía para siempre. Se recortan las más viejas (Cache Storage conserva el
 * orden de inserción).
 */
const MAX_ENTRIES = 60;

async function trimCache(cache) {
  const keys = await cache.keys();
  const excess = keys.length - MAX_ENTRIES;
  for (let i = 0; i < excess; i += 1) {
    await cache.delete(keys[i]);
  }
}

/** Lo mínimo para que la app abra sin conexión. */
const PRECACHE = ["/", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/** Nunca cachear: la sesión y los datos tienen que venir siempre de la red. */
function isNeverCached(url) {
  return url.pathname.startsWith("/api/") || url.hostname.endsWith(".supabase.co");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isNeverCached(url)) return;

  // Network-first: siempre datos frescos, con la copia cacheada como red de
  // seguridad cuando no hay conexión.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then(async (cache) => {
            await cache.put(request, copy);
            await trimCache(cache);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = await caches.match("/");
          if (shell) return shell;
        }
        return new Response("Sin conexión", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      })
  );
});

/** Aviso enviado desde el servidor (Web Push), llegue la app abierta o cerrada. */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "SubGhost";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.tag,
    // Reemplaza el aviso previo del mismo vencimiento en vez de apilar duplicados.
    renotify: Boolean(payload.tag),
    data: { url: payload.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/** Al tocar el aviso: reutilizar la ventana abierta si existe, o abrir una nueva. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
