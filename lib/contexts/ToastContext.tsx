"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  createdAt: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  remove: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const remove = useCallback((id: string) => {
    const tid = timeoutsRef.current[id];
    if (tid) clearTimeout(tid);
    delete timeoutsRef.current[id];
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const add = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const item: ToastItem = { id, message, type, createdAt: Date.now() };
    setToasts((prev) => [...prev, item]);

    const timeoutId = setTimeout(() => remove(id), AUTO_DISMISS_MS);
    timeoutsRef.current[id] = timeoutId;
  }, [remove]);

  const toast = useCallback((message: string, type?: ToastType) => {
    add(message, type ?? "info");
  }, [add]);

  const success = useCallback((message: string) => add(message, "success"), [add]);
  const error = useCallback((message: string) => add(message, "error"), [add]);

  const value: ToastContextValue = { toasts, toast, success, error, remove };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastList toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  );
}

function ToastList({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex max-w-[min(90vw,380px)] flex-col gap-2"
      role="region"
      aria-label="Notificaciones"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          role="alert"
          className={`
            toast-item flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm
            ${item.type === "success" ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300" : ""}
            ${item.type === "error" ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300" : ""}
            ${item.type === "info" ? "border-border bg-card text-foreground" : ""}
          `}
        >
          {item.type === "success" && (
            <svg className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {item.type === "error" && (
            <svg className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <p className="flex-1 text-sm font-medium">{item.message}</p>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="shrink-0 rounded p-1 text-current opacity-70 transition-opacity hover:opacity-100"
            aria-label={t("close")}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
