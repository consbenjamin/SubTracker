"use client";

/**
 * La clave VAPID viaja en base64url; PushManager la pide como BufferSource.
 * Se construye sobre un ArrayBuffer propio porque el tipo de `applicationServerKey`
 * no admite un buffer potencialmente compartido.
 */
function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Suscribe este navegador a Web Push y guarda el endpoint en el servidor, que es
 * lo que permite que el aviso llegue con la app cerrada.
 *
 * Idempotente: si ya estaba suscrito reutiliza la suscripción y solo reenvía el
 * endpoint (barato, y cubre el caso de que la fila se haya perdido).
 */
export async function enablePushNotifications(): Promise<boolean> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!isPushSupported() || !publicKey) return false;
  if (Notification.permission !== "granted") return false;

  try {
    const registration = await navigator.serviceWorker.ready;

    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        // Requerido por los navegadores: el aviso siempre debe ser visible.
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(publicKey),
      }));

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });

    return res.ok;
  } catch (err) {
    // `AbortError: Registration failed - push service error` es el navegador
    // sin poder registrarse contra su servicio de push (FCM en Chrome). Pasa
    // seguido en desarrollo y no es un fallo de la app: se avisa sin ensuciar
    // la consola con un error.
    if ((err as DOMException)?.name === "AbortError") {
      console.warn(
        "[push] el navegador no pudo registrarse en su servicio de push. " +
          "Las notificaciones quedan desactivadas en esta sesión."
      );
      return false;
    }
    console.error("[push] no se pudo suscribir:", err);
    return false;
  }
}
