"use client";

import { useCallback, useEffect, useState } from "react";
import type { Subscription, SubscriptionFormData } from "@/types";

const EMPTY: Subscription[] = [];

/**
 * Toda instancia del hook se registra acá. Cuando una crea, edita o borra,
 * las demás recargan: así el botón flotante puede agregar un gasto desde
 * cualquier pantalla y la lista que esté visible se entera.
 */
const refreshers = new Set<() => void>();

/**
 * Crea una suscripción sin suscribirse a la lista.
 *
 * El botón flotante solo necesita crear: usar el hook completo lo obligaría a
 * pedir `/api/subscriptions` en cada pantalla nada más que para tener `create`.
 */
export async function createSubscription(data: SubscriptionFormData): Promise<boolean> {
  const res = await fetch("/api/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) return false;

  for (const refresh of refreshers) refresh();
  return true;
}

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

  useEffect(() => {
    refreshers.add(refresh);
    return () => {
      refreshers.delete(refresh);
    };
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
      // Primero lo propio, para que quien llamó vea los datos ya frescos.
      await refresh();
      for (const other of refreshers) {
        if (other !== refresh) other();
      }
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
