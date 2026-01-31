"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function TopBar({ onMenuClick, showMenuButton = false }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(qFromUrl);

  useEffect(() => {
    setQuery(qFromUrl);
  }, [qFromUrl, pathname]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = query.trim();
    if (value) {
      router.push(`/subscriptions?q=${encodeURIComponent(value)}`);
    } else {
      router.push("/subscriptions");
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-14 shrink-0 items-center gap-4 border-b border-border",
        "bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70"
      )}
    >
      <div className="flex flex-1 items-center gap-3 px-4 sm:px-6">
        {showMenuButton && (
          <button
            type="button"
            onClick={onMenuClick}
            className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        {/* Search - Apple style pill */}
        <form
          onSubmit={handleSubmit}
          className="relative flex min-w-0 flex-1 items-center max-w-xl"
        >
          <Search
            className="absolute left-4 h-[18px] w-[18px] shrink-0 text-muted-foreground pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={(e) => e.target.select?.()}
            placeholder="Buscar suscripciones..."
            autoComplete="off"
            aria-label="Buscar suscripciones"
            className={cn(
              "h-10 w-full rounded-full border border-[var(--input-border)] bg-[var(--input-bg)] pl-11 pr-4 text-[15px] text-foreground",
              "placeholder:text-muted-foreground",
              "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-foreground/30"
            )}
          />
        </form>
      </div>
    </header>
  );
}
