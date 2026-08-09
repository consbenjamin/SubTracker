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
const EMPTY: PlannedPurchase[] = [];

export function usePlannedPurchases(month: number | null, year: number | null) {
  /**
   * El resultado se guarda junto al filtro que lo produjo. Así `loading` es
   * derivado —no hay datos para el filtro actual— en vez de un flag que haya
   * que encender desde el efecto, y nunca se muestran los datos del mes anterior.
   */
  const filterKey = `${month ?? "all"}-${year ?? "all"}`;
  const [result, setResult] = useState<{
    key: string;
    purchases: PlannedPurchase[];
    failed: boolean;
  } | null>(null);

  const isCurrent = result?.key === filterKey;
  const purchases = isCurrent ? result.purchases : EMPTY;
  const loading = !isCurrent;
  const loadFailed = isCurrent && result.failed;

  const refresh = useCallback(async () => {
    const key = `${month ?? "all"}-${year ?? "all"}`;
    try {
      const params = new URLSearchParams();
      if (month != null) params.set("month", String(month));
      if (year != null) params.set("year", String(year));
      const res = await fetch(`${BASE_URL}?${params}`);
      if (res.ok) setResult({ key, purchases: await res.json(), failed: false });
      else setResult({ key, purchases: EMPTY, failed: true });
    } catch (err) {
      console.error("Error fetching planned purchases:", err);
      setResult({ key, purchases: EMPTY, failed: true });
    }
  }, [month, year]);

  useEffect(() => {
    // Cargar al montar y ante cada cambio de filtro. `refresh` solo escribe
    // estado después del await; el compilador no puede verlo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
