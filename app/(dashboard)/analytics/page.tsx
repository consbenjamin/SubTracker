"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Subscription, PaymentHistory } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  getAnnualEquivalent,
  getBillingCycleLabel,
  getMonthlyEquivalent,
  isSubscriptionActiveForCalculations,
} from "@/lib/subscriptions";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

function CustomTooltipPie({
  active,
  payload,
  formatter,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { name: string; value: number } }[];
  formatter: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-lg backdrop-blur-sm">
      <p className="font-semibold text-foreground">{payload[0].name}</p>
      <p className="mt-0.5 text-sm font-medium text-muted-foreground">
        {formatter(payload[0].value)}
      </p>
    </div>
  );
}

function CustomTooltipBar({
  active,
  payload,
  formatter,
  labelKey = "month",
  shownLabel,
  realLabel,
}: {
  active?: boolean;
  payload?: { payload: Record<string, unknown> }[];
  formatter: (v: number) => string;
  labelKey?: string;
  shownLabel: string;
  realLabel: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-lg backdrop-blur-sm">
      <p className="font-semibold text-foreground">{String(p[labelKey])}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {shownLabel}: {formatter(p.gasto as number)}
      </p>
      {((p.real as number) ?? 0) > 0 && (
        <p className="mt-0.5 text-xs text-muted-foreground/80">
          {realLabel}: {formatter(p.real as number)}
        </p>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const t = useTranslations("analytics");
  const tCommon = useTranslations("common");
  const formatCurrency = useFormatCurrency();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchSubscriptions(), fetchPayments()]).finally(() =>
      setLoading(false)
    );
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch("/api/subscriptions");
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data);
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await fetch("/api/payments");
      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  };

  const activeSubscriptions = subscriptions.filter(isSubscriptionActiveForCalculations);

  const totalRealAllTime = payments.reduce((sum, p) => sum + p.amount, 0);
  const now = new Date();
  const last12MonthsStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const paymentsLast12Months = payments.filter(
    (p) => new Date(p.payment_date) >= last12MonthsStart
  );
  const totalRealLast12Months = paymentsLast12Months.reduce(
    (sum, p) => sum + p.amount,
    0
  );

  const categoryData = activeSubscriptions.reduce((acc, sub) => {
    const monthlyPrice = getMonthlyEquivalent(sub);
    const cat = sub.category ?? tCommon("uncategorized");
    if (acc[cat]) acc[cat] += monthlyPrice;
    else acc[cat] = monthlyPrice;
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = Object.entries(categoryData).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: Number(value.toFixed(2)),
  }));

  const monthlyExpensesReal: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyExpensesReal[monthKey] = 0;
  }
  payments.forEach((p) => {
    const d = new Date(p.payment_date);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthKey in monthlyExpensesReal) monthlyExpensesReal[monthKey] += p.amount;
  });

  const monthlyExpenses = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const realGasto = monthlyExpensesReal[monthKey] ?? 0;
    const proyeccion = activeSubscriptions.reduce((sum, sub) => sum + getMonthlyEquivalent(sub), 0);
    return {
      month: date.toLocaleDateString("es-ES", { month: "short", year: "numeric" }),
      gasto: Number((realGasto > 0 ? realGasto : proyeccion).toFixed(2)),
      real: Number(realGasto.toFixed(2)),
      proyeccion: Number(proyeccion.toFixed(2)),
    };
  });

  const billingCycleData = activeSubscriptions.reduce((acc, sub) => {
    const key = getBillingCycleLabel(sub.billing_cycle, sub.payment_type, sub.installment_count);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const billingCycleChartData = Object.entries(billingCycleData).map(([name, value]) => ({
    name,
    value,
  }));

  const totalMonthly = activeSubscriptions.reduce((sum, sub) => sum + getMonthlyEquivalent(sub), 0);

  const totalYearly = activeSubscriptions.reduce(
    (sum, sub) => sum + getAnnualEquivalent(sub),
    0
  );
  const avgRealMonthly =
    paymentsLast12Months.length > 0 ? totalRealLast12Months / 12 : 0;

  const chartGridStyle = {
    stroke: "var(--chart-grid)",
    strokeDasharray: "4 4",
    strokeWidth: 1,
  };

  const axisStyle = {
    stroke: "var(--muted-foreground)",
    fontSize: 11,
    fontFamily: "inherit",
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6 sm:mb-10">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card variant="outline" className="transition-shadow duration-200 hover:shadow-[var(--card-shadow-hover)]">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("monthlyTotalProjection")}
          </p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {formatCurrency(totalMonthly)}
          </p>
        </Card>
        <Card variant="outline" className="transition-shadow duration-200 hover:shadow-[var(--card-shadow-hover)]">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("futureCommitment")}
          </p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {formatCurrency(totalYearly)}
          </p>
        </Card>
        <Card variant="outline" className="transition-shadow duration-200 hover:shadow-[var(--card-shadow-hover)]">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("realSpendLast12Months")}
          </p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {formatCurrency(totalRealLast12Months)}
          </p>
          {paymentsLast12Months.length > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("perMonthPayments", { amount: formatCurrency(avgRealMonthly), count: paymentsLast12Months.length })}
            </p>
          )}
        </Card>
        <Card variant="outline" className="transition-shadow duration-200 hover:shadow-[var(--card-shadow-hover)]">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("totalHistorical")}
          </p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {formatCurrency(totalRealAllTime)}
          </p>
          {payments.length > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("transactions", { count: payments.length })}
            </p>
          )}
        </Card>
      </div>

      {activeSubscriptions.length > 0 && (
        <Card variant="outline" className="mb-10">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {t("ifYouCancelAll")}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("youWouldSave", { amount: formatCurrency(totalMonthly), yearly: formatCurrency(totalYearly) })}
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-3">
              {t("mostExpensiveActive")}
            </p>
            <ul className="divide-y divide-border">
              {activeSubscriptions
                .map((s) => ({
                  ...s,
                  monthlyEquivalent: getMonthlyEquivalent(s),
                }))
                .sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent)
                .slice(0, 5)
                .map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
                  >
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(s.monthlyEquivalent)}{t("perMonth")}
                    </span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Gastos por categoría - Donut profesional */}
        <Card variant="outline" className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t("expensesByCategory")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                  <defs>
                    {categoryChartData.map((_, i) => (
                      <linearGradient
                        key={i}
                        id={`pieGrad-${i}`}
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="1"
                      >
                        <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={1} />
                        <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.75} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={72}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="var(--card)"
                    strokeWidth={2}
                    animationBegin={0}
                    animationDuration={600}
                    label={({ name, percent }) =>
                      percent >= 0.08 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                    }
                    labelLine={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
                  >
                    {categoryChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#pieGrad-${index})`}
                        style={{ outline: "none" }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<CustomTooltipPie formatter={formatCurrency} />}
                    cursor={{ fill: "transparent" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {t("noDataToShow")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Distribución por ciclo - Barras modernas */}
        <Card variant="outline" className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t("byBillingCycle")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {billingCycleChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={billingCycleChartData}
                  margin={{ top: 16, right: 16, left: 8, bottom: 8 }}
                  barCategoryGap="20%"
                  barGap={8}
                >
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={1} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--chart-grid)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={axisStyle}
                    tickMargin={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={axisStyle}
                    tickMargin={8}
                    allowDecimals={false}
                    width={28}
                  />
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-lg backdrop-blur-sm">
                          <p className="font-semibold text-foreground">{payload[0].payload.name}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {t("subscriptionCount", { count: payload[0].value as number })}
                          </p>
                        </div>
                      ) : null
                    }
                    cursor={{ fill: "var(--muted-foreground)", fillOpacity: 0.06 }}
                  />
                  <Bar
                    dataKey="value"
                    fill="url(#barGrad)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={56}
                    animationBegin={0}
                    animationDuration={500}
                    name={t("subscriptionsLabel")}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {t("noDataToShow")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gastos mensuales - Area chart con gradiente */}
      <Card variant="outline" className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-semibold">{t("monthlyExpenses")}</CardTitle>
          <p className="text-xs font-normal text-muted-foreground mt-1">
            {t("monthlyExpensesHint")}
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {monthlyExpenses.length > 0 ? (
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart
                data={monthlyExpenses}
                margin={{ top: 20, right: 20, left: 24, bottom: 8 }}
              >
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--chart-grid)" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={axisStyle}
                  tickMargin={12}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={axisStyle}
                  tickFormatter={(v) => formatCurrency(v)}
                  tickMargin={8}
                  width={90}
                />
                <Tooltip
                  content={(props) => (
                    <CustomTooltipBar
                      {...props}
                      formatter={formatCurrency}
                      labelKey="month"
                      shownLabel={t("shown")}
                      realLabel={t("real")}
                    />
                  )}
                  cursor={{ stroke: "var(--chart-3)", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                <Area
                  type="monotone"
                  dataKey="gasto"
                  stroke="var(--chart-3)"
                  strokeWidth={2.5}
                  fill="url(#areaGrad)"
                  animationBegin={0}
                  animationDuration={700}
                  name={t("chartSpend")}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {t("noDataToShow")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
