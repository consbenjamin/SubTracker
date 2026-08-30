"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Subscription, PaymentHistory, SubscriptionFormData } from "@/types";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton, SkeletonHeader, SkeletonRows } from "@/components/ui/Loading";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { formatDate } from "@/lib/utils";
import { Calendar, Plus, Check, Circle } from "lucide-react";
import { getInstallmentProgress, isInstallmentSubscription } from "@/lib/subscriptions";
import { addMonthsAnchored, toDateOnly, todayDateOnly } from "@/lib/date";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/contexts/ToastContext";
import { useConfirmPayment } from "@/lib/hooks/useConfirmPayment";
import { refreshSubscriptions } from "@/lib/hooks/useSubscriptions";
import { nextBillingDate } from "@/lib/date";

export default function EditSubscriptionPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const t = useTranslations("subscriptionForm");
  const tCommon = useTranslations("common");
  const tDetail = useTranslations("subscriptionDetail");
  const formatCurrency = useFormatCurrency();
  const toast = useToast();
  const { confirmPayment, submitting: confirmingDue } = useConfirmPayment();
  const subId =
    typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  /** Evita reabrir el modal cuando la URL aún tiene ?confirmDue y se refresca la suscripción. */
  const confirmDueDismissedRef = useRef(false);
  const lastSubIdRef = useRef<string>("");
  // undefined = todavía cargando · null = no existe. `loading` sale de acá.
  const [subscription, setSubscription] = useState<Subscription | null | undefined>(undefined);
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const loading = subscription === undefined;
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayDateOnly);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [confirmDueOpen, setConfirmDueOpen] = useState(false);
  const [confirmDueDate, setConfirmDueDate] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("confirmDue") === "true") {
      confirmDueDismissedRef.current = false;
    }
  }, [searchParams]);

  useEffect(() => {
    // Deep-link UX for notifications: /subscriptions/[id]?confirmDue=true&due=YYYY-MM-DD
    if (!subscription || !subId) return;
    if (confirmDueDismissedRef.current) return;
    const shouldConfirm = searchParams.get("confirmDue") === "true";
    const dueDate = searchParams.get("due");
    if (!shouldConfirm || !dueDate) return;
    if ((subscription.payment_type ?? "recurring") !== "recurring") return;

    // Reacción a una navegación, no estado derivable: el modal tiene que seguir
    // abierto después de que el router.replace de abajo limpie la query.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfirmDueDate(dueDate.slice(0, 10));
    setConfirmDueOpen(true);

    // Quitar query para que un refetch de la suscripción no vuelva a abrir el modal.
    router.replace(`/subscriptions/${subId}`);
  }, [subscription, searchParams, subId, router]);

  const fetchSubscription = useCallback(async () => {
    if (!subId) return;
    try {
      const res = await fetch(`/api/subscriptions/${subId}`, { cache: "no-store" });
      setSubscription(res.ok ? await res.json() : null);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      setSubscription(null);
    }
  }, [subId]);

  const fetchPayments = useCallback(async () => {
    if (!subId) return;
    try {
      const res = await fetch(`/api/subscriptions/${subId}/payments`, { cache: "no-store" });
      if (res.ok) setPayments(await res.json());
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  }, [subId]);

  useEffect(() => {
    if (!subId) return;
    if (lastSubIdRef.current !== subId) {
      lastSubIdRef.current = subId;
      confirmDueDismissedRef.current = false;
    }
    // Las dos escriben estado recién después del await; el compilador no lo ve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSubscription();
    fetchPayments();
  }, [subId, fetchSubscription, fetchPayments]);

  const saveSubscription = async (
    data: SubscriptionFormData,
    recordPayment?: boolean
  ) => {
    const response = await fetch(`/api/subscriptions/${subId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        recordPayment === undefined ? data : { ...data, record_payment: recordPayment }
      ),
    });

    if (response.ok) router.push("/subscriptions");
    else toast.error(t("errorUpdate"));
  };

  const handleCancel = () => {
    router.push("/subscriptions");
  };

  const openPaymentModal = () => {
    setPaymentAmount(subscription?.price?.toString() ?? "");
    setPaymentDate(todayDateOnly());
    setPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount < 0) return;
    setPaymentSubmitting(true);
    try {
      const response = await fetch(
        `/api/subscriptions/${subId}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, payment_date: paymentDate }),
        }
      );
      // Antes solo miraba `response.ok` y no hacía nada en el else: un 409, un
      // 429 del rate limiter o un 500 dejaban el diálogo abierto sin decir una
      // palabra, indistinguible de que el botón no respondiera.
      if (!response.ok) {
        // Igual que al confirmar: solo los 4xx traen un texto pensado para
        // leerse. Los 5xx vienen con el mensaje crudo de Postgres.
        let mensaje = tDetail("paymentFailed");
        if (response.status < 500) {
          try {
            const cuerpo = await response.json();
            if (typeof cuerpo?.error === "string") mensaje = cuerpo.error;
          } catch {
            // Respuesta sin JSON: queda el mensaje genérico.
          }
        }
        toast.error(mensaje);
        return;
      }

      setPaymentModalOpen(false);
      toast.success(tDetail("paymentRecorded"));
      // Registrar un pago mueve la próxima fecha: las listas de otras pantallas
      // tienen que enterarse igual que cuando se confirma desde la tarjeta.
      refreshSubscriptions();
      await Promise.all([fetchSubscription(), fetchPayments()]);
    } catch {
      toast.error(tDetail("paymentFailed"));
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const dismissConfirmDuePrompt = () => {
    confirmDueDismissedRef.current = true;
    setConfirmDueOpen(false);
    if (subId) {
      router.replace(`/subscriptions/${subId}`);
    }
  };

  const handleConfirmDue = async (paid: boolean) => {
    if (!subscription || !subId) return;
    if (!paid) {
      dismissConfirmDuePrompt();
      return;
    }

    // Mismo camino que el botón de la tarjeta: los mensajes de éxito, de error
    // y el aviso de "todavía queda otro vencido" tienen que ser los mismos
    // vengas de la lista o del link de una notificación.
    const due = (confirmDueDate ?? subscription.next_payment_date)
      .toString()
      .slice(0, 10);
    const resultado = await confirmPayment(subscription, due);
    if (resultado === "failed") return;

    // Esta pantalla no se suscribe a la lista, así que recarga lo suyo aparte.
    await Promise.all([fetchSubscription(), fetchPayments()]);

    // Si todavía queda un vencimiento atrasado, el diálogo sigue abierto sobre
    // el siguiente. La fecha la toma de `subscription`, que la recarga de
    // arriba ya dejó al día; hay que soltar la del deep link para no repetir la
    // vieja y chocar contra el 409 del servidor.
    if (resultado === "still-due") {
      setConfirmDueDate(null);
      router.replace(`/subscriptions/${subId}`);
      return;
    }

    confirmDueDismissedRef.current = true;
    setConfirmDueOpen(false);
    router.replace(`/subscriptions/${subId}`);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <SkeletonHeader />
        <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
          <div className="space-y-4 lg:col-span-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-28 bg-muted/70" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          <div className="lg:col-span-2">
            <SkeletonRows count={3} />
          </div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
        style={{ backgroundColor: "var(--background)" }}
      >
        <p className="text-muted-foreground">{tDetail("notFound")}</p>
      </div>
    );
  }

  const installment = getInstallmentProgress(subscription);
  const isInstallment = isInstallmentSubscription(subscription);

  /** Cuotas pagadas → fecha real del pago; el resto → un mes por cuota desde el próximo vencimiento. */
  const installmentRows = isInstallment
    ? (() => {
        const paidInOrder = [...payments].sort((a, b) =>
          a.payment_date.localeCompare(b.payment_date)
        );
        const nextDue = toDateOnly(subscription.next_payment_date);

        return Array.from({ length: installment.count }, (_, i) => {
          const num = i + 1;
          const isPaid = num <= installment.paid;
          const isNext = num === installment.nextInstallment;
          const payment = isPaid ? paidInOrder[num - 1] : null;

          return {
            num,
            status: isPaid ? ("paid" as const) : isNext ? ("due" as const) : ("upcoming" as const),
            date: payment
              ? toDateOnly(payment.payment_date)
              // Anclado igual que el avance del servidor: si no, un plan que
              // cobra el 31 mostraba el calendario corrido respecto de las
              // fechas que después se guardan.
              : addMonthsAnchored(
                  nextDue,
                  num - installment.nextInstallment,
                  subscription.billing_day ?? null
                ),
            amount: subscription.price,
          };
        });
      })()
    : [];

  return (
    <div
      className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      style={{ backgroundColor: "var(--background)" }}
    >
      <header className="mb-6 sm:mb-10">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
          {tDetail(isInstallment ? "titleInstallment" : "titleSubscription")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tDetail(isInstallment ? "subtitleInstallment" : "subtitleSubscription")}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
        <div className="min-w-0 lg:col-span-3">
          <Card variant="outline" style={{ backgroundColor: "var(--card)" }}>
            <CardContent className="pt-6">
              <SubscriptionForm
                subscription={subscription}
                onSubmit={(data) => saveSubscription(data)}
                onSubmitWithRecordPayment={saveSubscription}
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
                  <CardTitle className="text-base">{tDetail("summary")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{tDetail("purchaseTotal")}</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(installment.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{tDetail("perInstallment")}</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(subscription.price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      {tDetail("paidOf", { paid: installment.paid, count: installment.count })}
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
                  <CardTitle className="text-base">{tDetail("installments")}</CardTitle>
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
                          {tDetail("installmentOf", { num: row.num, count: installment.count })}
                        </span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(row.amount)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        {row.status === "paid" ? (
                          <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                            <span className="truncate">{tDetail("statusPaid")} · {formatDate(row.date)}</span>
                          </span>
                        ) : row.status === "due" ? (
                          <>
                            <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                              <Circle className="h-4 w-4 shrink-0 text-amber-500" />
                              <span className="truncate">{tDetail("statusDue")} · {formatDate(row.date)}</span>
                            </span>
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={openPaymentModal}
                              className="w-full shrink-0 sm:w-auto"
                            >
                              {tDetail("pay")}
                            </Button>
                          </>
                        ) : (
                          <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                            <span className="truncate">{tDetail("statusDue")} · {formatDate(row.date)}</span>
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
                {tDetail(isInstallment ? "historyInstallments" : "historyPayments")}
              </CardTitle>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={openPaymentModal}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-1 shrink-0" />
                {tDetail(isInstallment ? "recordInstallment" : "recordPayment")}
              </Button>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  {tDetail("noPayments")}
                </p>
              ) : (
                <ul className="space-y-0">
                  {payments.map((p) => (
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
            ? tDetail("recordInstallmentTitle", {
                current: installment.nextInstallment,
                count: installment.count,
              })
            : tDetail("recordPaymentTitle")
        }
      >
        <form onSubmit={handleRecordPayment} noValidate className="space-y-4">
          {isInstallment && (
            <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              {tDetail("thisInstallmentAmount")}{" "}
              <strong className="text-foreground">{formatCurrency(subscription.price)}</strong>
            </p>
          )}
          <Input
            label={tDetail("amount")}
            type="number"
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="0.00"
          />
          <Input
            label={tDetail("paymentDate")}
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
              {tCommon("cancel")}
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
              {paymentSubmitting ? t("saving") : tDetail("record")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={confirmDueOpen}
        onClose={dismissConfirmDuePrompt}
        title={t("confirmPaymentTitle")}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            {t("confirmPaymentSubject", {
              name: subscription.name,
              amount: formatCurrency(subscription.price),
            })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("confirmPaymentBody", {
              due: formatDate(confirmDueDate ?? subscription.next_payment_date),
              next: formatDate(
                nextBillingDate(
                  (confirmDueDate ?? subscription.next_payment_date).toString().slice(0, 10),
                  subscription.billing_cycle ?? "monthly",
                  subscription.billing_day ?? null
                )
              ),
            })}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleConfirmDue(false)}
              className="w-full sm:w-auto"
              disabled={confirmingDue}
            >
              {t("confirmPaymentNo")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => handleConfirmDue(true)}
              className="w-full sm:w-auto"
              disabled={confirmingDue}
            >
              {confirmingDue ? t("saving") : t("confirmPaymentYes")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
