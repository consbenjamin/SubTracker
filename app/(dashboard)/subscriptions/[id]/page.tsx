"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Subscription, PaymentHistory } from "@/types";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { formatDate } from "@/lib/utils";
import { Calendar, Plus, Check, Circle } from "lucide-react";
import {
  getInstallmentProgress,
  isInstallmentSubscription,
  isSubscriptionCompleted,
} from "@/lib/subscriptions";
import { addMonths } from "date-fns";
import { cn } from "@/lib/utils";

export default function EditSubscriptionPage() {
  const router = useRouter();
  const params = useParams();
  const formatCurrency = useFormatCurrency();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchSubscription();
      fetchPayments();
    }
  }, [params.id]);

  const fetchSubscription = async () => {
    try {
      const response = await fetch(`/api/subscriptions/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await fetch(`/api/subscriptions/${params.id}/payments`);
      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  };

  const handleSubmit = async (data: any) => {
    const response = await fetch(`/api/subscriptions/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      router.push("/subscriptions");
    }
  };

  const handleSubmitWithRecordPayment = async (
    data: any,
    recordPayment: boolean
  ) => {
    const response = await fetch(`/api/subscriptions/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, record_payment: recordPayment }),
    });

    if (response.ok) {
      router.push("/subscriptions");
    }
  };

  const handleCancel = () => {
    router.push("/subscriptions");
  };

  const openPaymentModal = () => {
    setPaymentAmount(subscription?.price?.toString() ?? "");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount < 0) return;
    setPaymentSubmitting(true);
    try {
      const response = await fetch(
        `/api/subscriptions/${params.id}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, payment_date: paymentDate }),
        }
      );
      if (response.ok) {
        setPaymentModalOpen(false);
        fetchSubscription();
        fetchPayments();
      }
    } finally {
      setPaymentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="flex min-h-[40vh] flex-col items-center justify-center gap-4"
        style={{ backgroundColor: "var(--background)" }}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
        style={{ backgroundColor: "var(--background)" }}
      >
        <p className="text-muted-foreground">Suscripción no encontrada</p>
      </div>
    );
  }

  const installment = getInstallmentProgress(subscription);
  const isInstallment = isInstallmentSubscription(subscription);
  const isCompleted = isSubscriptionCompleted(subscription);

  const paymentsByOrder = isInstallment
    ? [...payments].sort(
        (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
      )
    : [];

  const installmentRows = isInstallment
    ? Array.from({ length: installment.count }, (_, i) => {
        const num = i + 1;
        const isPaid = num <= installment.paid;
        const isNext = num === installment.nextInstallment;
        const payment = isPaid && paymentsByOrder[num - 1] ? paymentsByOrder[num - 1] : null;
        const dueDate = isPaid && payment
          ? payment.payment_date
          : isNext
          ? subscription.next_payment_date
          : addMonths(new Date(subscription.next_payment_date), num - installment.nextInstallment)
              .toISOString()
              .slice(0, 10);
        return {
          num,
          status: isPaid ? ("paid" as const) : isNext ? ("due" as const) : ("upcoming" as const),
          date: dueDate,
          amount: subscription.price,
        };
      })
    : [];

  return (
    <div
      className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      style={{ backgroundColor: "var(--background)" }}
    >
      <header className="mb-6 sm:mb-10">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
          {isInstallment ? "Detalle de compra" : "Editar suscripción"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isInstallment
            ? "Resumen del plan en cuotas y historial de pagos"
            : "Modifica los datos de la suscripción"}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
        <div className="min-w-0 lg:col-span-3">
          <Card variant="outline" style={{ backgroundColor: "var(--card)" }}>
            <CardContent className="pt-6">
              <SubscriptionForm
                subscription={subscription}
                onSubmit={handleSubmit}
                onSubmitWithRecordPayment={handleSubmitWithRecordPayment}
                onCancel={handleCancel}
              />
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6 lg:col-span-2">
          {isInstallment && (
            <>
              <Card variant="outline" style={{ backgroundColor: "var(--card)" }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Resumen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total de la compra</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(installment.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cada cuota</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(subscription.price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      Pagadas {installment.paid} de {installment.count}
                    </span>
                    <div className="h-2 flex-1 max-w-[120px] overflow-hidden rounded-full bg-muted/60 ml-2">
                      <div
                        className="h-full rounded-full bg-[var(--primary)] transition-all"
                        style={{
                          width: `${installment.count > 0 ? (installment.paid / installment.count) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card variant="outline" style={{ backgroundColor: "var(--card)" }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Cuotas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {installmentRows.map((row) => (
                    <div
                      key={row.num}
                      className={cn(
                        "rounded-lg border p-3 transition-colors",
                        row.status === "paid"
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : row.status === "due"
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "border-border bg-muted/20"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-xs font-medium uppercase tracking-wider",
                            row.status === "paid"
                              ? "text-emerald-700 dark:text-emerald-400"
                              : row.status === "due"
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-muted-foreground"
                          )}
                        >
                          {row.num} DE {installment.count}
                        </span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(row.amount)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        {row.status === "paid" ? (
                          <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                            <span className="truncate">Pagada · {formatDate(row.date)}</span>
                          </span>
                        ) : row.status === "due" ? (
                          <>
                            <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                              <Circle className="h-4 w-4 shrink-0 text-amber-500" />
                              <span className="truncate">Vence · {formatDate(row.date)}</span>
                            </span>
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={openPaymentModal}
                              className="w-full shrink-0 sm:w-auto"
                            >
                              Pagar
                            </Button>
                          </>
                        ) : (
                          <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                            <span className="truncate">Vence · {formatDate(row.date)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          <Card variant="outline" style={{ backgroundColor: "var(--card)" }}>
            <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0" />
                {isInstallment ? "Historial de cuotas" : "Historial de pagos"}
              </CardTitle>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={openPaymentModal}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-1 shrink-0" />
                {isInstallment ? "Registrar cuota" : "Registrar pago"}
              </Button>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No hay pagos registrados. Registra el primer pago o actualiza
                  la próxima fecha de pago guardando con &quot;Registrar pago realizado&quot;.
                </p>
              ) : (
                <ul className="space-y-0">
                  {payments.map((p, i) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 py-3 border-b border-border last:border-0"
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: "var(--primary)" }}
                      />
                      <span className="text-sm text-muted-foreground flex-1">
                        {formatDate(p.payment_date)}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {formatCurrency(p.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={
          isInstallment
            ? `Registrar cuota ${installment.nextInstallment} de ${installment.count}`
            : "Registrar pago manual"
        }
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          {isInstallment && (
            <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              Monto de esta cuota: <strong className="text-foreground">{formatCurrency(subscription.price)}</strong>
            </p>
          )}
          <Input
            label="Importe"
            type="number"
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="0.00"
          />
          <Input
            label="Fecha del pago"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPaymentModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={
                paymentSubmitting ||
                !paymentAmount ||
                isNaN(parseFloat(paymentAmount))
              }
              className="w-full sm:w-auto"
            >
              {paymentSubmitting ? "Guardando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
