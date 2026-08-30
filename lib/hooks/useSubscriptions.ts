"use client";

import { useCallback, useEffect, useState } from "react";
import type { Subscription, SubscriptionFormData } from "@/types";

const EMPTY: Subscription[] = [];

/**
 * Toda instancia del hook se registra acá. Cuando una crea, edita o borra,
 * las demás recargan: así el botón flotante puede agregar un gasto desde
 * cualquier pantalla y la lista que esté visible se entera.
 */
const refreshers = new Set<() => Promise<void> | void>();

/**
 * Recarga todas las listas montadas.
 *
 * La usa quien cambia una suscripción sin pasar por el CRUD del hook —
 * registrar un pago mueve la próxima fecha de cobro— para que la tarjeta que
 * está en pantalla no siga mostrando el vencimiento viejo.
 */
export async function refreshSubscriptions(): Promise<void> {
  // Se espera a que terminen: quien confirma un pago decide qué mostrar según
  // el vencimiento nuevo, y con las recargas en el aire leería el viejo.
  await Promise.all([...refreshers].map((refresh) => refresh()));
}

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
  const [error, setError] = useState(false);
  const subscriptions = data ?? EMPTY;
  const loading = data === null;

  const refresh = useCallback(async () => {
    // Ante un fallo no se vacía la lista: antes cualquier corte de red, un 500
    // o un 429 del rate limiter dejaba la pantalla en "no tenés suscripciones",
    // que es indistinguible de haberlas borrado todas. Se conserva lo último
    // bueno y se marca el error para que la página lo diga.
    try {
      const res = await fetch("/api/subscriptions");
      if (!res.ok) {
        console.error("Error fetching subscriptions:", res.status);
        setError(true);
        setData((prev) => prev ?? EMPTY);
        return;
      }
      setData(await res.json());
      setError(false);
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
      setError(true);
      setData((prev) => prev ?? EMPTY);
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

  return { subscriptions, setSubscriptions, loading, error, refresh, create, update, remove };
}
