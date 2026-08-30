"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/lib/contexts/ToastContext";
import { refreshSubscriptions } from "@/lib/hooks/useSubscriptions";
import { formatDate } from "@/lib/utils";
import { todayDateOnly, toDateOnly } from "@/lib/date";
import type { Subscription } from "@/types";

/**
 * `still-due` es un éxito: el pago quedó registrado, pero la suscripción venía
 * atrasada más de un período y todavía hay otro vencimiento sin pagar.
 */
export type ConfirmResult = "done" | "still-due" | "failed";

/**
 * Confirma "ya pagué este vencimiento" desde donde esté la tarjeta.
 *
 * Vive en un hook y no en props porque las dos pantallas que muestran tarjetas
 * las pintan a través de `LazySubscriptionCard`: pasar la acción por props
 * obligaba a atravesar tres componentes para algo que la tarjeta resuelve sola.
 *
 * Registrar un pago mueve la próxima fecha de cobro, así que al terminar se
 * recargan todas las listas montadas: si no, la tarjeta seguía mostrando el
 * vencimiento viejo y parecía que el botón no había hecho nada.
 */
export function useConfirmPayment() {
  const t = useTranslations("subscriptionForm");
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  /**
   * `expectedDue` viene de un deep link de notificación, que puede ser viejo.
   * Se manda tal cual para que el servidor responda 409 si ese vencimiento ya
   * no es el actual: confirmar el período equivocado en silencio sería peor que
   * pedir que recargue.
   */
  const confirmPayment = useCallback(
    async (subscription: Subscription, expectedDue?: string): Promise<ConfirmResult> => {
      const due = toDateOnly(expectedDue ?? subscription.next_payment_date);
      if (!due) return "failed";

      setSubmitting(true);
      try {
        const res = await fetch(`/api/subscriptions/${subscription.id}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: subscription.price,
            payment_date: due,
            confirm_due: true,
            expected_due: due,
          }),
        });

        if (!res.ok) {
          // Solo los 4xx traen un texto escrito para leer —el 409 explica que
          // el vencimiento cambió y hay que recargar—. Los 5xx salen de
          // `dbError`, que devuelve el mensaje crudo de Postgres: mostrarlo era
          // ininteligible y encima ventilaba nombres de columnas.
          let mensaje = t("paymentFailed");
          if (res.status < 500) {
            try {
              const cuerpo = await res.json();
              if (typeof cuerpo?.error === "string") mensaje = cuerpo.error;
            } catch {
              // Respuesta sin JSON: queda el mensaje genérico.
            }
          }
          toast.error(mensaje);
          return "failed";
        }

        const { subscription: actualizada } = (await res.json()) as {
          subscription: Subscription | null;
        };

        // Se espera la recarga antes de decidir: quien llama usa el resultado
        // para dejar el diálogo abierto sobre el vencimiento siguiente, y sin
        // esperar seguiría mostrando el que se acaba de pagar.
        await refreshSubscriptions();

        // Un vencimiento atrasado varios períodos avanza de a uno: pagar el de
        // mayo deja pendiente el de junio. El botón vuelve a aparecer y eso es
        // correcto, pero sin decirlo se lee como que la confirmación falló.
        const siguiente = toDateOnly(actualizada?.next_payment_date);
        if (siguiente && siguiente <= todayDateOnly()) {
          toast.toast(t("paymentRecordedStillDue", { due: formatDate(siguiente) }), "info");
          return "still-due";
        }

        toast.success(
          siguiente
            ? t("paymentRecordedNext", { due: formatDate(siguiente) })
            : t("paymentRecorded")
        );
        return "done";
      } catch {
        toast.error(t("paymentFailed"));
        return "failed";
      } finally {
        setSubmitting(false);
      }
    },
    [t, toast]
  );

  return { confirmPayment, submitting };
}
