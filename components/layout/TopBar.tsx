"use client";

import { useState, useEffect } from "react";
import { Menu, Sun, Moon, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/contexts/SettingsContext";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { createClient } from "@/lib/supabase/client";
import { SearchBar } from "@/components/layout/SearchBar";

interface TopBarProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function TopBar({ onMenuClick, showMenuButton = false }: TopBarProps) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const { resolvedTheme, setTheme } = useSettings();
  const supabase = createClient();
  const [themeMounted, setThemeMounted] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 shrink-0 border-b border-border",
        "bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70"
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-5 sm:gap-4 sm:px-6 lg:gap-4 lg:px-8">
        {showMenuButton && (
          <button
            type="button"
            onClick={onMenuClick}
            className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground lg:hidden"
            aria-label={t("openMenu")}
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        {/* Espacio flexible en móvil para distribuir menú (izq) y acciones (der) de forma equitativa */}
        <div className="min-w-0 flex-1 lg:hidden" aria-hidden />
        {/* Search en TopBar solo en desktop (lg+); en móvil va en el Sidebar */}
        <div className="relative hidden min-w-0 flex-1 sm:max-w-md md:max-w-lg lg:flex lg:max-w-xl">
          <SearchBar />
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {showMenuButton && (
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground lg:hidden"
              aria-label={t("logout")}
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
          <LocaleSwitcher />
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
            aria-label={
              themeMounted
                ? resolvedTheme === "dark"
                  ? tCommon("themeLight")
                  : tCommon("themeDark")
                : tCommon("changeTheme")
            }
          >
            {!themeMounted ? (
              <Sun className="h-5 w-5" aria-hidden />
            ) : resolvedTheme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
