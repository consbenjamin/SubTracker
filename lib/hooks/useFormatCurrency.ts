"use client";

import { useCallback } from "react";
import { formatCurrency as format } from "@/lib/utils";
import { useSettings } from "@/lib/contexts/SettingsContext";

export function useFormatCurrency() {
  const { currency } = useSettings();
  return useCallback((amount: number) => format(amount, currency), [currency]);
}
