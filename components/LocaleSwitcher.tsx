"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const LOCALES = [
  { value: "es", label: "ES" },
  { value: "en", label: "EN" },
] as const;

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleChange = async (newLocale: string) => {
    if (newLocale === locale) return;
    setPending(true);
    try {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: newLocale }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full bg-muted/60 px-1 py-0.5 text-[11px] sm:gap-1 sm:px-1.5 sm:py-1 sm:text-xs",
        "border border-border/60 shadow-sm",
        "min-h-[2.25rem] sm:min-h-0",
        className
      )}
    >
      <Globe className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:inline-block" aria-hidden />
      {LOCALES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => handleChange(value)}
          disabled={pending}
          className={cn(
            "min-h-[2rem] min-w-[2rem] rounded-full px-2 py-1 font-semibold tracking-tight transition-colors sm:min-w-[2.1rem]",
            locale === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          )}
          aria-pressed={locale === value}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
