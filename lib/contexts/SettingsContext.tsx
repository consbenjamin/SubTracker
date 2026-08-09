"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useSyncExternalStore,
  ReactNode,
} from "react";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

const STORAGE_KEY = "subghost-settings";

export type Theme = "light" | "dark" | "system";

export type CurrencyCode =
  | "EUR"
  | "USD"
  | "GBP"
  | "MXN"
  | "ARS"
  | "CLP"
  | "COP"
  | "PEN";

interface SettingsState {
  theme: Theme;
  currency: CurrencyCode;
  /** Presupuesto mensual opcional para suscripciones (null = sin límite) */
  monthlyBudget: number | null;
}

interface SettingsContextValue extends SettingsState {
  setTheme: (theme: Theme) => void;
  setCurrency: (currency: CurrencyCode) => void;
  setMonthlyBudget: (value: number | null) => void;
  resolvedTheme: "light" | "dark";
  /** false hasta que hidrata; sirve para no pintar valores del servidor. */
  mounted: boolean;
}

const defaultState: SettingsState = {
  theme: "system",
  currency: "EUR",
  monthlyBudget: null,
};

function loadSettings(): SettingsState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    return {
      theme: parsed.theme ?? defaultState.theme,
      currency: parsed.currency ?? defaultState.currency,
      monthlyBudget: parsed.monthlyBudget ?? defaultState.monthlyBudget,
    };
  } catch {
    return defaultState;
  }
}

function saveSettings(state: SettingsState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Los ajustes viven en localStorage, que es un store externo al render.
 * Leerlos con `useSyncExternalStore` evita el efecto que sincronizaba estado
 * después de montar y, de paso, mantiene en sincronía las pestañas abiertas.
 */
const settingsListeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedSettings: SettingsState = defaultState;

function subscribeToSettings(onChange: () => void) {
  settingsListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    settingsListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Devuelve siempre la misma referencia mientras el contenido no cambie. */
function getSettingsSnapshot(): SettingsState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSettings = loadSettings();
  }
  return cachedSettings;
}

function emitSettingsChanged() {
  for (const listener of settingsListeners) listener();
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(
    subscribeToSettings,
    getSettingsSnapshot,
    () => defaultState
  );

  // En el servidor no hay localStorage: hasta hidratar se usan los valores por
  // defecto, y esto marca cuándo ya se pueden aplicar los reales.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  // Derivado, no estado: el tema resuelto es función del elegido y del sistema.
  const resolvedTheme: "light" | "dark" =
    state.theme === "system" ? (prefersDark ? "dark" : "light") : state.theme;

  /** Guarda en localStorage y avisa: el store es la única fuente de verdad. */
  const update = useCallback((patch: Partial<SettingsState>) => {
    saveSettings({ ...getSettingsSnapshot(), ...patch });
    emitSettingsChanged();
  }, []);

  const setTheme = useCallback((theme: Theme) => update({ theme }), [update]);
  const setCurrency = useCallback(
    (currency: CurrencyCode) => update({ currency }),
    [update]
  );
  const setMonthlyBudget = useCallback(
    (monthlyBudget: number | null) => update({ monthlyBudget }),
    [update]
  );

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
  }, [resolvedTheme, mounted]);

  const value = useMemo<SettingsContextValue>(
    () => ({ ...state, setTheme, setCurrency, setMonthlyBudget, resolvedTheme, mounted }),
    [state, setTheme, setCurrency, setMonthlyBudget, resolvedTheme, mounted]
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
