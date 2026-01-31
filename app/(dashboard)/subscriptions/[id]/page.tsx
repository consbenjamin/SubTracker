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
import { Calendar, Plus } from "lucide-react";

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

  return (
    <div
      className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
      style={{ backgroundColor: "var(--background)" }}
    >
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Editar suscripción
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Modifica los datos de la suscripción
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
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

        <div className="lg:col-span-2 space-y-6">
          <Card variant="outline" style={{ backgroundColor: "var(--card)" }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Historial de pagos
              </CardTitle>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={openPaymentModal}
              >
                <Plus className="h-4 w-4 mr-1" />
                Registrar pago
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
        title="Registrar pago manual"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
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
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPaymentModalOpen(false)}
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
            >
              {paymentSubmitting ? "Guardando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
