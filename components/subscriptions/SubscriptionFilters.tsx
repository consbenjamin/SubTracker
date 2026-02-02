"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activas" },
  { value: "paused", label: "Pausadas" },
  { value: "cancelled", label: "Canceladas" },
] as const;

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export interface SubscriptionFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  categories: string[];
  resultCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function SubscriptionFilters({
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  resultCount,
  totalCount,
  hasActiveFilters,
  onClearFilters,
}: SubscriptionFiltersProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--card-shadow)] sm:p-4 lg:p-5">
      <div className="mb-4 sm:mb-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Estado
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onStatusFilterChange(opt.value)}
              className={cn(
                "min-h-[44px] rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all sm:min-h-0 sm:py-2",
                statusFilter === opt.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          {categories.length > 0 && (
            <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:min-w-0 sm:flex-row sm:items-center sm:gap-2">
              <label
                htmlFor="filter-category"
                className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Categoría
              </label>
              <select
                id="filter-category"
                value={categoryFilter}
                onChange={(e) => onCategoryFilterChange(e.target.value)}
                className={cn(
                  "min-h-[44px] w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-foreground sm:h-9 sm:w-auto sm:min-w-[140px] sm:py-1.5",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-foreground/30"
                )}
              >
                <option value="all">Todas</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {capitalize(cat)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{resultCount}</span>
            {resultCount !== totalCount ? ` de ${totalCount}` : ""} suscripciones
          </p>
        </div>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-10 w-full shrink-0 text-muted-foreground hover:text-foreground sm:h-9 sm:w-auto sm:min-h-[36px]"
          >
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
