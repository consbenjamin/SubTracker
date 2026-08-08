"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Subscription } from "@/types";
import { daysUntilPayment } from "@/lib/subscriptions";

/** Notificaciones del navegador para vencimientos de hoy y de mañana. */
export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const pendingRef = useRef<Subscription[] | null>(null);

  useEffect(() => {
    // La Notification API no necesita Service Worker.
    const supported = "Notification" in window;
    setIsSupported(supported);
    if (supported) setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;

    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      setPermission(result);
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

      // Todavía sin permiso: guardamos para disparar en cuanto el usuario acepte.
      if (permission !== "granted") {
        pendingRef.current = subscriptions;
        return;
      }

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

        const notification = new Notification(
          isTomorrow ? `Pago próximo: ${sub.name}` : `Vence hoy: ${sub.name}`,
          {
            body: `El pago de ${sub.name} vence ${isTomorrow ? "mañana" : "hoy"}. Marcá si ya lo hiciste.`,
            icon: "/icons/subghost-logo.svg",
            tag: dedupeKey,
          }
        );

        notification.onclick = () => {
          window.location.href = `/subscriptions/${sub.id}?confirmDue=true&due=${encodeURIComponent(dueDate)}`;
        };
      }
    },
    [isSupported, permission]
  );

  useEffect(() => {
    if (permission !== "granted" || !pendingRef.current) return;
    const pending = pendingRef.current;
    pendingRef.current = null;
    checkUpcomingPayments(pending);
  }, [permission, checkUpcomingPayments]);

  return { isSupported, permission, requestPermission, checkUpcomingPayments };
}
