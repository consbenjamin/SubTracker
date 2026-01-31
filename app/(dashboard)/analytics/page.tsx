"use client";

import { useEffect, useState } from "react";
import { Subscription, PaymentHistory } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export default function AnalyticsPage() {
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

  const activeSubscriptions = subscriptions.filter((s) => s.status === "active");

  // Real totals from payment_history
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

  // Monthly expenses by category (proyección)
  const categoryData = activeSubscriptions.reduce((acc, sub) => {
    const multiplier =
      sub.billing_cycle === "monthly"
        ? 1
        : sub.billing_cycle === "quarterly"
        ? 1 / 3
        : 1 / 12;
    const monthlyPrice = sub.price * multiplier;

    const cat = sub.category ?? "Sin categoría";
    if (acc[cat]) {
      acc[cat] += monthlyPrice;
    } else {
      acc[cat] = monthlyPrice;
    }
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = Object.entries(categoryData).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: Number(value.toFixed(2)),
  }));

  // Monthly expenses: real (payment_history) + proyección fallback
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
    if (monthKey in monthlyExpensesReal) {
      monthlyExpensesReal[monthKey] += p.amount;
    }
  });

  const monthlyExpenses = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const realGasto = monthlyExpensesReal[monthKey] ?? 0;
    const proyeccion = activeSubscriptions.reduce((sum, sub) => {
      const multiplier =
        sub.billing_cycle === "monthly"
          ? 1
          : sub.billing_cycle === "quarterly"
          ? 1 / 3
          : 1 / 12;
      return sum + sub.price * multiplier;
    }, 0);
    return {
      month: date.toLocaleDateString("es-ES", { month: "short", year: "numeric" }),
      gasto: Number((realGasto > 0 ? realGasto : proyeccion).toFixed(2)),
      real: Number(realGasto.toFixed(2)),
      proyeccion: Number(proyeccion.toFixed(2)),
    };
  });

  // Billing cycle distribution
  const billingCycleData = activeSubscriptions.reduce((acc, sub) => {
    acc[sub.billing_cycle] = (acc[sub.billing_cycle] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const billingCycleChartData = Object.entries(billingCycleData).map(([name, value]) => ({
    name:
      name === "monthly"
        ? "Mensual"
        : name === "quarterly"
        ? "Trimestral"
        : "Anual",
    value,
  }));

  const totalMonthly = activeSubscriptions.reduce((sum, sub) => {
    const multiplier =
      sub.billing_cycle === "monthly" ? 1 : sub.billing_cycle === "quarterly" ? 1 / 3 : 1 / 12;
    return sum + sub.price * multiplier;
  }, 0);

  const totalYearly = totalMonthly * 12;
  const avgRealMonthly =
    paymentsLast12Months.length > 0
      ? totalRealLast12Months / 12
      : 0;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        <p className="text-sm text-muted-foreground">Cargando analytics...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Análisis detallado de tus gastos en suscripciones
        </p>
      </header>

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card variant="outline">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total mensual (proyección)
          </p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {formatCurrency(totalMonthly)}
          </p>
        </Card>
        <Card variant="outline">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Proyección anual
          </p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {formatCurrency(totalYearly)}
          </p>
        </Card>
        <Card variant="outline">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Gasto real (últimos 12 meses)
          </p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {formatCurrency(totalRealLast12Months)}
          </p>
          {paymentsLast12Months.length > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              ~{formatCurrency(avgRealMonthly)}/mes · {paymentsLast12Months.length} pagos
            </p>
          )}
        </Card>
        <Card variant="outline">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total histórico
          </p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {formatCurrency(totalRealAllTime)}
          </p>
          {payments.length > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {payments.length} transacciones
            </p>
          )}
        </Card>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card variant="outline">
          <CardHeader>
            <CardTitle>Gastos por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No hay datos para mostrar
              </p>
            )}
          </CardContent>
        </Card>

        <Card variant="outline">
          <CardHeader>
            <CardTitle>Distribución por ciclo de facturación</CardTitle>
          </CardHeader>
          <CardContent>
            {billingCycleChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={billingCycleChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No hay datos para mostrar
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card variant="outline">
        <CardHeader>
          <CardTitle>Gastos mensuales (últimos 6 meses)</CardTitle>
          <p className="text-xs font-normal text-muted-foreground mt-1">
            Datos reales del historial cuando hay pagos; si no, proyección.
          </p>
        </CardHeader>
        <CardContent>
          {monthlyExpenses.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyExpenses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div
                        className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow"
                        style={{ backgroundColor: "var(--card)" }}
                      >
                        <p className="font-medium text-foreground">
                          {payload[0]?.payload?.month}
                        </p>
                        <p className="text-muted-foreground">
                          Mostrado: {formatCurrency(payload[0]?.value as number)}
                        </p>
                        {(payload[0]?.payload?.real ?? 0) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Real: {formatCurrency(payload[0]?.payload?.real)}
                          </p>
                        )}
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="gasto" fill="#8884d8" name="Gasto" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No hay datos para mostrar
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
