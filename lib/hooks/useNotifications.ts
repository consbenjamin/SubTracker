"use client";

import { useEffect, useRef, useState } from "react";
import { Subscription } from "@/types";
import { differenceInCalendarDays, differenceInDays, parseISO, startOfDay } from "date-fns";

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const pendingSubscriptionsRef = useRef<Subscription[] | null>(null);

  const logDebug = (...args: unknown[]) => {
    if (process.env.NODE_ENV !== "development") return;
    console.debug("[notifications]", ...args);
  };

  useEffect(() => {
    // Para notificaciones del navegador (Notification API) no hace falta Service Worker.
    setIsSupported("Notification" in window);
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      return false;
    }

    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    }

    return Notification.permission === "granted";
  };

  const checkUpcomingPayments = (subscriptions: Subscription[]) => {
    if (!isSupported) {
      logDebug("Not supported in this browser");
      return;
    }

    const today = startOfDay(new Date());
    const upcoming = subscriptions.filter((sub) => {
      if (sub.status !== "active") return false;
      const paymentType = sub.payment_type ?? "recurring";
      if (paymentType !== "recurring") return false;

      // `next_payment_date` viene como YYYY-MM-DD (DATE), parseamos en local para evitar desfasajes TZ.
      const dueDate = startOfDay(parseISO(sub.next_payment_date));
      const days = differenceInCalendarDays(dueDate, today);
      return days === 0 || days === 1;
    });

    logDebug("Permission:", permission, "| candidates:", upcoming.length);

    // Si todavía no tenemos permisos, guardamos para disparar cuando el usuario acepte.
    if (upcoming.length > 0 && permission !== "granted") {
      pendingSubscriptionsRef.current = subscriptions;
      logDebug("Pending notifications stored; permission is not granted");
      return;
    }

    if (upcoming.length > 0 && permission === "granted") {
      upcoming.forEach((sub) => {
        const dueDateParsed = startOfDay(parseISO(sub.next_payment_date));
        const days = differenceInCalendarDays(dueDateParsed, today);
        const eventType = days === 1 ? "tomorrow" : "today";
        const dueDate = sub.next_payment_date;
        const dedupeKey = `notified:${sub.id}:${dueDate}:${eventType}`;

        try {
          if (typeof window !== "undefined") {
            const already = localStorage.getItem(dedupeKey);
            if (already) {
              logDebug("Skipped by dedupe:", dedupeKey);
              return;
            }
            localStorage.setItem(dedupeKey, "1");
          }
        } catch {
          // Si localStorage falla (modo incógnito, etc.), igual intentamos notificar una vez.
        }

        const title = days === 1 ? `Pago próximo: ${sub.name}` : `Vence hoy: ${sub.name}`;
        const body =
          days === 1
            ? `El pago de ${sub.name} vence mañana. Marcá si ya lo hiciste.`
            : `El pago de ${sub.name} vence hoy. Marcá si ya lo hiciste.`;

        const notification = new Notification(title, {
          body,
          icon: "/icons/subghost-logo.svg",
          tag: dedupeKey,
        });
        logDebug("Notification shown:", { subId: sub.id, dueDate, eventType });

        notification.onclick = () => {
          const url = `/subscriptions/${sub.id}?confirmDue=true&due=${encodeURIComponent(dueDate)}`;
          window.location.href = url;
        };
      });
    }
  };

  useEffect(() => {
    if (permission !== "granted") return;
    if (!pendingSubscriptionsRef.current) return;

    const pending = pendingSubscriptionsRef.current;
    pendingSubscriptionsRef.current = null;

    checkUpcomingPayments(pending);
  }, [permission]);

  const scheduleNotifications = (subscriptions: Subscription[]) => {
    if (permission !== "granted") return;

    subscriptions.forEach((sub) => {
      if (sub.status !== "active") return;

      const paymentDate = new Date(sub.next_payment_date);
      const now = new Date();
      const daysUntil = differenceInDays(paymentDate, now);

      if (daysUntil >= 0 && daysUntil <= 3) {
        setTimeout(() => {
          if (permission === "granted") {
            new Notification(`Recordatorio: ${sub.name}`, {
              body: `El pago de ${sub.name} vence pronto`,
              icon: "/icons/subghost-logo.svg",
              tag: `reminder-${sub.id}`,
            });
          }
        }, Math.max(0, daysUntil * 24 * 60 * 60 * 1000));
      }
    });
  };

  return {
    isSupported,
    permission,
    requestPermission,
    checkUpcomingPayments,
    scheduleNotifications,
  };
}
