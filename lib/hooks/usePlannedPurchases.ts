"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlannedPurchase } from "@/types";
import type { PlannedPurchaseBody } from "@/lib/validations/schemas";

/** Error ya interpretado, para que la página elija el texto a mostrar. */
export type SaveResult = { ok: true } | { ok: false; invalidData: boolean; message?: string };

const BASE_URL = "/api/planned-purchases";

/**
 * Compras planeadas. Con `month`/`year` en null trae todas (el dashboard las
 * necesita para ver cuotas abiertas de meses anteriores).
 *
 * Solo depende de `month` y `year`: nada de traducciones ni toasts en las
 * dependencias, para que la lista no se recargue por causas ajenas a los filtros.
 */
export function usePlannedPurchases(month: number | null, year: number | null) {
  const [purchases, setPurchases] = useState<PlannedPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (month != null) params.set("month", String(month));
      if (year != null) params.set("year", String(year));
      const res = await fetch(`${BASE_URL}?${params}`);
      if (res.ok) {
        setPurchases(await res.json());
        setLoadFailed(false);
      } else {
        setLoadFailed(true);
      }
    } catch (err) {
      console.error("Error fetching planned purchases:", err);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (data: PlannedPurchaseBody, id?: string): Promise<SaveResult> => {
      const res = await fetch(id ? `${BASE_URL}/${id}` : BASE_URL, {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, invalidData: Boolean(err.details), message: err.error };
      }

      await refresh();
      return { ok: true };
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
      if (res.ok) await refresh();
      return res.ok;
    },
    [refresh]
  );

  return { purchases, loading, loadFailed, save, remove };
}
