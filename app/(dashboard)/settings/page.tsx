"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSettings } from "@/lib/contexts/SettingsContext";
import type { Theme } from "@/lib/contexts/SettingsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CURRENCIES } from "@/lib/constants/currencies";
import { Sun, Moon, Monitor, DollarSign, Target, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const { theme, setTheme, currency, setCurrency, monthlyBudget, setMonthlyBudget } = useSettings();
  const [budgetInput, setBudgetInput] = useState(monthlyBudget?.toString() ?? "");

  const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: t("light"), icon: Sun },
    { value: "dark", label: t("dark"), icon: Moon },
    { value: "system", label: t("system"), icon: Monitor },
  ];

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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6 sm:mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <LocaleSwitcher />
      </header>

      <div className="space-y-8">
        <Card variant="outline">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sun className="h-4 w-4 text-muted-foreground" />
              {t("appearance")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {t("appearanceHint")}
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
              {t("monthlyBudget")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {t("monthlyBudgetHint")}
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[140px] max-w-[200px]">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  placeholder={tCommon("noLimit")}
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  onBlur={handleBudgetSubmit}
                  onKeyDown={(e) => e.key === "Enter" && handleBudgetSubmit()}
                  label={tCommon("amount")}
                />
              </div>
              <Button variant="secondary" size="sm" onClick={handleBudgetSubmit}>
                {tCommon("save")}
              </Button>
              {monthlyBudget != null && (
                <Button variant="ghost" size="sm" onClick={clearBudget} className="gap-1">
                  <X className="h-4 w-4" />
                  {tCommon("removeLimit")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card variant="outline">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              {t("currency")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {t("currencyHint")}
            </p>
            <div className="max-w-xs">
              <Select
                label={t("currency")}
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
