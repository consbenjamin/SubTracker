"use client";

import { useCallback, useEffect, useState } from "react";
import type { Subscription, SubscriptionFormData } from "@/types";

const EMPTY: Subscription[] = [];

/**
 * Carga y CRUD de suscripciones contra `/api/subscriptions`.
 * Devuelve `true` si la operación funcionó, para que cada página decida el mensaje.
 */
export function useSubscriptions() {
  // null = todavía no llegó la primera respuesta. `loading` sale de ahí, en vez
  // de ser un flag aparte que haya que apagar desde el efecto.
  const [data, setData] = useState<Subscription[] | null>(null);
  const subscriptions = data ?? EMPTY;
  const loading = data === null;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/subscriptions");
      setData(res.ok ? await res.json() : EMPTY);
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
      setData(EMPTY);
    }
  }, []);

  useEffect(() => {
    // Cargar al montar. `refresh` solo escribe estado después del await, pero
    // el compilador no puede verlo y lo trata como escritura síncrona.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  /** El dashboard la usa para volcar la caché offline. */
  const setSubscriptions = useCallback((next: Subscription[]) => setData(next), []);

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
