import webpush from "web-push";

export interface PushPayload {
  title: string;
  body: string;
  /** Ruta a abrir al tocar el aviso. La lee `notificationclick` en public/sw.js. */
  url?: string;
  tag?: string;
}

export interface StoredSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

let configured = false;

function configure() {
  if (configured) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("Faltan NEXT_PUBLIC_VAPID_PUBLIC_KEY y/o VAPID_PRIVATE_KEY");
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:soporte@subghost.app",
    publicKey,
    privateKey
  );
  configured = true;
}

export type SendResult =
  | { ok: true }
  /** El navegador dio de baja el endpoint: hay que borrarlo de la base. */
  | { ok: false; gone: true }
  | { ok: false; gone: false; error: string };

export async function sendPush(
  subscription: StoredSubscription,
  payload: PushPayload
): Promise<SendResult> {
  configure();

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return { ok: true };
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    // 404/410: la suscripción ya no existe (app desinstalada, permiso revocado).
    if (status === 404 || status === 410) return { ok: false, gone: true };
    return { ok: false, gone: false, error: (err as Error).message };
  }
}
