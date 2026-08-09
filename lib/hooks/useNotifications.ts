"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { Subscription } from "@/types";
import { daysUntilPayment } from "@/lib/subscriptions";
import { enablePushNotifications } from "@/lib/push-client";

/**
 * El navegador no avisa cuando cambia el permiso, así que el store solo se
 * releé cuando nosotros lo pedimos (tras `requestPermission`). Alcanza: es el
 * único momento en que puede cambiar sin salir de la app.
 */
const permissionListeners = new Set<() => void>();

function notifyPermissionChanged() {
  for (const listener of permissionListeners) listener();
}

function subscribeToPermission(onChange: () => void) {
  permissionListeners.add(onChange);
  return () => permissionListeners.delete(onChange);
}

/** El soporte y el permiso son estado del navegador, no del render. */
function useNotificationSupport() {
  const isSupported = useSyncExternalStore(
    () => () => {},
    () => "Notification" in window && "serviceWorker" in navigator,
    () => false
  );

  const permission = useSyncExternalStore(
    subscribeToPermission,
    () => ("Notification" in window ? Notification.permission : "default"),
    () => "default" as NotificationPermission
  );

  return { isSupported, permission };
}

/**
 * Avisos de vencimientos de hoy y de mañana.
 *
 * Se muestran a través del service worker (`registration.showNotification`) y no
 * con `new Notification()`: en una PWA instalada en Android el constructor lanza
 * una excepción, así que los avisos no llegaban nunca. Vía service worker
 * funciona en escritorio y en móvil, y el click lo maneja `notificationclick`
 * en public/sw.js.
 */
export function useNotifications() {
  const { isSupported, permission } = useNotificationSupport();
  const pendingRef = useRef<Subscription[] | null>(null);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;

    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      notifyPermissionChanged();
      return result === "granted";
    }

    return Notification.permission === "granted";
  }, []);

  const checkUpcomingPayments = useCallback(
    (subscriptions: Subscription[]) => {
      if (!isSupported) return;

      const dueSoon = subscriptions.filter((sub) => {
        if (sub.status !== "active") return false;
        if ((sub.payment_type ?? "recurring") !== "recurring") return false;
        const days = daysUntilPayment(sub);
        return days === 0 || days === 1;
      });

      if (dueSoon.length === 0) return;

      // Sin permiso todavía: guardamos para disparar cuando el usuario acepte.
      if (permission !== "granted") {
        pendingRef.current = subscriptions;
        return;
      }

      void navigator.serviceWorker.ready.then((registration) => {
        for (const sub of dueSoon) {
          const isTomorrow = daysUntilPayment(sub) === 1;
          const dueDate = sub.next_payment_date;
          const dedupeKey = `notified:${sub.id}:${dueDate}:${isTomorrow ? "tomorrow" : "today"}`;

          try {
            if (localStorage.getItem(dedupeKey)) continue;
            localStorage.setItem(dedupeKey, "1");
          } catch {
            // localStorage puede fallar (incógnito); igual notificamos una vez.
          }

          registration.showNotification(
            isTomorrow ? `Pago próximo: ${sub.name}` : `Vence hoy: ${sub.name}`,
            {
              body: `El pago de ${sub.name} vence ${isTomorrow ? "mañana" : "hoy"}. Marcá si ya lo hiciste.`,
              icon: "/icons/icon-192.png",
              badge: "/icons/icon-192.png",
              tag: dedupeKey,
              // El SW lee esto en notificationclick para abrir el detalle.
              data: {
                url: `/subscriptions/${sub.id}?confirmDue=true&due=${encodeURIComponent(dueDate)}`,
              },
            }
          );
        }
      });
    },
    [isSupported, permission]
  );

  useEffect(() => {
    if (permission !== "granted" || !pendingRef.current) return;
    const pending = pendingRef.current;
    pendingRef.current = null;
    checkUpcomingPayments(pending);
  }, [permission, checkUpcomingPayments]);

  // Con el permiso dado, registramos el dispositivo para Web Push. Es lo que
  // hace que el recordatorio llegue aunque la app esté cerrada.
  useEffect(() => {
    if (permission !== "granted") return;
    void enablePushNotifications();
  }, [permission]);

  return { isSupported, permission, requestPermission, checkUpcomingPayments };
}
