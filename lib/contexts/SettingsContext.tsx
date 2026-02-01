"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

const STORAGE_KEY = "subtracker-settings";

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

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SettingsState>(defaultState);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setState(loadSettings());
    setMounted(true);
  }, []);

  const setTheme = useCallback((theme: Theme) => {
    setState((prev) => {
      const next = { ...prev, theme };
      saveSettings(next);
      return next;
    });
  }, []);

  const setCurrency = useCallback((currency: CurrencyCode) => {
    setState((prev) => {
      const next = { ...prev, currency };
      saveSettings(next);
      return next;
    });
  }, []);

  const setMonthlyBudget = useCallback((monthlyBudget: number | null) => {
    setState((prev) => {
      const next = { ...prev, monthlyBudget };
      saveSettings(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (state.theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const update = () => setResolvedTheme(mq.matches ? "dark" : "light");
      update();
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    } else {
      setResolvedTheme(state.theme);
    }
  }, [state.theme]);

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

  const value: SettingsContextValue = {
    ...state,
    setTheme,
    setCurrency,
    setMonthlyBudget,
    resolvedTheme,
  };

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
