"use client";

import { useEffect, useState } from "react";
import { Subscription } from "@/types";
import { differenceInDays } from "date-fns";

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported("Notification" in window && "serviceWorker" in navigator);
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
    const upcoming = subscriptions.filter((sub) => {
      if (sub.status !== "active") return false;
      const days = differenceInDays(new Date(sub.next_payment_date), new Date());
      return days >= 0 && days <= 3;
    });

    if (upcoming.length > 0 && permission === "granted") {
      upcoming.forEach((sub) => {
        const days = differenceInDays(
          new Date(sub.next_payment_date),
          new Date()
        );
        new Notification(`Pago próximo: ${sub.name}`, {
          body: `El pago de ${sub.name} vence en ${days} día${days !== 1 ? "s" : ""}`,
          icon: "/icons/icon-192x192.png",
          tag: `payment-${sub.id}`,
        });
      });
    }
  };

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
              icon: "/icons/icon-192x192.png",
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
