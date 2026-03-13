"use client";

import { useState, useEffect, useRef, useCallback, useId } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, Clock, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Suggestion {
  type: "name" | "category";
  value: string;
}

const RECENT_KEY = "subghost-recent-searches";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(query: string) {
  if (!query.trim()) return;
  const recent = getRecentSearches().filter((s) => s !== query);
  recent.unshift(query);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

interface SearchBarProps {
  className?: string;
  /** Llamado después de navegar (ej. cerrar sidebar en móvil) */
  onNavigate?: () => void;
  /** Variante compacta para sidebar (mismo comportamiento, ajuste visual si hace falta) */
  variant?: "default" | "sidebar";
}

export function SearchBar({ className, onNavigate, variant = "default" }: SearchBarProps) {
  const id = useId();
  const t = useTranslations("search");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams, pathname]);

  const allItems =
    query.length === 0
      ? recentSearches.map((v) => ({ type: "recent" as const, value: v }))
      : suggestions;
  const showDropdown =
    isOpen &&
    (query.length >= 2 ? suggestions.length > 0 : query.length === 0 ? recentSearches.length > 0 : false);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/subscriptions/suggestions?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        fetchSuggestions(query);
      } else {
        setSuggestions([]);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = query.trim();
    if (value) addRecentSearch(value);
    if (value) {
      router.push(`/subscriptions?q=${encodeURIComponent(value)}`);
    } else {
      router.push("/subscriptions");
    }
    setIsOpen(false);
    onNavigate?.();
  };

  const clearSearch = () => {
    setQuery("");
    setHighlightedIndex(-1);
    router.push("/subscriptions");
    inputRef.current?.focus();
  };

  const selectSuggestion = (value: string) => {
    setQuery(value);
    addRecentSearch(value);
    router.push(`/subscriptions?q=${encodeURIComponent(value)}`);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
    onNavigate?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) {
      if (e.key === "Escape") {
        (e.target as HTMLInputElement).blur();
        setIsOpen(false);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i < allItems.length - 1 ? i + 1 : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i > 0 ? i - 1 : allItems.length - 1));
      return;
    }
    if (e.key === "Enter" && highlightedIndex >= 0 && allItems[highlightedIndex]) {
      e.preventDefault();
      selectSuggestion(allItems[highlightedIndex].value);
      return;
    }
    if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    }
  };

  const isSidebar = variant === "sidebar";

  return (
    <div
      ref={containerRef}
      className={cn("relative flex min-w-0 flex-1", isSidebar && "w-full flex-none", className)}
    >
      <form onSubmit={handleSubmit} className="relative flex w-full items-center">
        <Search
          className={cn(
            "absolute left-3 h-[18px] w-[18px] shrink-0 text-muted-foreground pointer-events-none z-10",
            !isSidebar && "sm:left-4"
          )}
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t("placeholder")}
          autoComplete="off"
          aria-label={t("ariaLabel")}
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls={`${id}-suggestions`}
          aria-activedescendant={highlightedIndex >= 0 ? `${id}-suggestion-${highlightedIndex}` : undefined}
          id={`${id}-search-input`}
          className={cn(
            "search-input-clear-none h-10 w-full min-w-0 rounded-full border border-[var(--input-border)] bg-[var(--input-bg)] pl-10 pr-11 text-[15px] text-foreground",
            !isSidebar && "sm:pl-11",
            "placeholder:text-muted-foreground",
            "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-foreground/30"
          )}
        />
        <div className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center">
          {loading ? (
            <div
              className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
              aria-hidden
            />
          ) : query ? (
            <button
              type="button"
              onClick={clearSearch}
              className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
              aria-label={t("clear")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </form>

      {showDropdown && (
        <div
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-2 min-w-0 overflow-hidden rounded-xl border border-[var(--input-border)] bg-[var(--card)] shadow-[var(--card-shadow-hover)]"
        >
          <div className="max-h-[320px] overflow-y-auto py-2">
            {query.length === 0 && recentSearches.length > 0 && (
              <div className="px-3 py-1.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("recentSearches")}
                </p>
              </div>
            )}
            {allItems.map((item, idx) => (
              <button
                key={`${item.type}-${item.value}-${idx}`}
                id={`${id}-suggestion-${idx}`}
                role="option"
                aria-selected={highlightedIndex === idx}
                type="button"
                onClick={() => selectSuggestion(item.value)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left text-[15px] transition-colors",
                  highlightedIndex === idx
                    ? "bg-foreground/8 text-foreground"
                    : "text-foreground hover:bg-foreground/6"
                )}
              >
                {item.type === "recent" ? (
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : item.type === "name" ? (
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{item.value}</span>
                    {item.type === "category" && (
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">{t("categoryLabel")}</span>
                    )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
