"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/lib/contexts/SettingsContext";
import type { Theme } from "@/lib/contexts/SettingsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CURRENCIES } from "@/lib/constants/currencies";
import { Sun, Moon, Monitor, DollarSign, Target, X } from "lucide-react";
import { cn } from "@/lib/utils";

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export default function SettingsPage() {
  const { theme, setTheme, currency, setCurrency, monthlyBudget, setMonthlyBudget } = useSettings();
  const [budgetInput, setBudgetInput] = useState(monthlyBudget?.toString() ?? "");

  useEffect(() => {
    setBudgetInput(monthlyBudget?.toString() ?? "");
  }, [monthlyBudget]);

  const handleBudgetSubmit = () => {
    const parsed = budgetInput.trim() ? parseFloat(budgetInput.replace(",", ".")) : null;
    if (parsed !== null && (isNaN(parsed) || parsed <= 0)) return;
    setMonthlyBudget(parsed !== null && !isNaN(parsed) && parsed > 0 ? parsed : null);
  };

  const clearBudget = () => {
    setBudgetInput("");
    setMonthlyBudget(null);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Apariencia y preferencias
        </p>
      </header>

      <div className="space-y-8">
        <Card variant="outline">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sun className="h-4 w-4 text-muted-foreground" />
              Apariencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Elige el modo claro, oscuro o sigue la preferencia del sistema.
            </p>
            <div className="flex flex-wrap gap-2 rounded-lg border border-border p-1">
              {THEMES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-1 min-w-[100px] items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
                    "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                    "dark:hover:bg-white/10",
                    theme === value &&
                      "bg-foreground/10 text-foreground dark:bg-white/15"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card variant="outline">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-muted-foreground" />
              Presupuesto mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Opcional. Si lo defines, en el Dashboard verás cuánto llevas gastado respecto a tu límite.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[140px] max-w-[200px]">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Sin límite"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  onBlur={handleBudgetSubmit}
                  onKeyDown={(e) => e.key === "Enter" && handleBudgetSubmit()}
                  label="Importe"
                />
              </div>
              <Button variant="secondary" size="sm" onClick={handleBudgetSubmit}>
                Guardar
              </Button>
              {monthlyBudget != null && (
                <Button variant="ghost" size="sm" onClick={clearBudget} className="gap-1">
                  <X className="h-4 w-4" />
                  Quitar límite
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card variant="outline">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Moneda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Moneda para mostrar importes en toda la aplicación.
            </p>
            <div className="max-w-xs">
              <Select
                label="Moneda"
                options={CURRENCIES}
                value={currency}
                onChange={(e) =>
                  setCurrency(e.target.value as (typeof CURRENCIES)[number]["value"])
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
