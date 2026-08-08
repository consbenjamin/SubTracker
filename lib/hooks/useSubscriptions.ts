"use client";

import { useCallback, useEffect, useState } from "react";
import type { Subscription, SubscriptionFormData } from "@/types";

/**
 * Carga y CRUD de suscripciones contra `/api/subscriptions`.
 * Devuelve `true` si la operación funcionó, para que cada página decida el mensaje.
 */
export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/subscriptions");
      if (res.ok) setSubscriptions(await res.json());
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const send = useCallback(
    async (url: string, method: string, body?: SubscriptionFormData) => {
      const res = await fetch(url, {
        method,
        ...(body && {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      });
      if (!res.ok) return false;
      await refresh();
      return true;
    },
    [refresh]
  );

  const create = useCallback(
    (data: SubscriptionFormData) => send("/api/subscriptions", "POST", data),
    [send]
  );

  const update = useCallback(
    (id: string, data: SubscriptionFormData) =>
      send(`/api/subscriptions/${id}`, "PUT", data),
    [send]
  );

  const remove = useCallback(
    (id: string) => send(`/api/subscriptions/${id}`, "DELETE"),
    [send]
  );

  return { subscriptions, setSubscriptions, loading, refresh, create, update, remove };
}
