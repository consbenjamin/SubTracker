"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Subscription, SubscriptionFormData, BillingCycle, SubscriptionStatus } from "@/types";
import { SUBSCRIPTION_TEMPLATES } from "@/lib/constants/subscriptionTemplates";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

const subscriptionSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  price: z.number().min(0, "El precio debe ser mayor o igual a 0"),
  billing_cycle: z.enum(["monthly", "yearly", "quarterly"]),
  next_payment_date: z.string().min(1, "La fecha es requerida"),
  category: z.string().min(1, "La categoría es requerida"),
  status: z.enum(["active", "cancelled", "paused"]),
  notes: z.string().optional(),
});

interface SubscriptionFormProps {
  subscription?: Subscription;
  onSubmit: (data: SubscriptionFormData) => Promise<void>;
  onSubmitWithRecordPayment?: (
    data: SubscriptionFormData,
    recordPayment: boolean
  ) => Promise<void>;
  onCancel: () => void;
}

const categories = [
  { value: "streaming", label: "Streaming" },
  { value: "software", label: "Software" },
  { value: "fitness", label: "Fitness" },
  { value: "music", label: "Música" },
  { value: "news", label: "Noticias" },
  { value: "cloud", label: "Cloud Storage" },
  { value: "gaming", label: "Gaming" },
  { value: "education", label: "Educación" },
  { value: "other", label: "Otro" },
];

export function SubscriptionForm({
  subscription,
  onSubmit,
  onSubmitWithRecordPayment,
  onCancel,
}: SubscriptionFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: subscription
      ? {
          name: subscription.name,
          price: subscription.price,
          billing_cycle: subscription.billing_cycle,
          next_payment_date: subscription.next_payment_date.split("T")[0],
          category: subscription.category,
          status: subscription.status,
          notes: subscription.notes,
        }
      : {
          billing_cycle: "monthly",
          status: "active",
          category: "other",
        },
  });

  const [recordPayment, setRecordPayment] = useState(false);
  const nextPaymentDate = watch("next_payment_date");
  const initialNextPayment =
    subscription?.next_payment_date?.split("T")[0] ?? "";
  const showRecordPayment =
    !!subscription &&
    !!onSubmitWithRecordPayment &&
    nextPaymentDate !== "" &&
    nextPaymentDate !== initialNextPayment;

  const onSubmitForm = async (data: SubscriptionFormData) => {
    if (onSubmitWithRecordPayment && showRecordPayment && recordPayment) {
      await onSubmitWithRecordPayment(data, true);
    } else if (onSubmitWithRecordPayment && showRecordPayment) {
      await onSubmitWithRecordPayment(data, false);
    } else {
      await onSubmit(data);
    }
  };

  const applyTemplate = (name: string, category: string, billing_cycle: BillingCycle) => {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    next.setDate(1);
    const nextPaymentDate = next.toISOString().slice(0, 10);
    reset({
      name,
      price: 0,
      billing_cycle,
      next_payment_date: nextPaymentDate,
      category,
      status: "active",
      notes: "",
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      {!subscription && SUBSCRIPTION_TEMPLATES.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Empezar con una plantilla</p>
          <div className="flex flex-wrap gap-2">
            {SUBSCRIPTION_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t.name, t.category, t.billing_cycle)}
                className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted hover:border-foreground/20"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <Input
        label="Nombre del servicio"
        {...register("name")}
        error={errors.name?.message}
        placeholder="Ej: Netflix, Spotify..."
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Precio"
          type="number"
          step="0.01"
          {...register("price", { valueAsNumber: true })}
          error={errors.price?.message}
          placeholder="0.00"
        />

        <Select
          label="Ciclo de facturación"
          options={[
            { value: "monthly", label: "Mensual" },
            { value: "quarterly", label: "Trimestral" },
            { value: "yearly", label: "Anual" },
          ]}
          {...register("billing_cycle")}
          error={errors.billing_cycle?.message}
        />
      </div>

      <Input
        label="Próxima fecha de pago"
        type="date"
        {...register("next_payment_date")}
        error={errors.next_payment_date?.message}
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Categoría"
          options={categories}
          {...register("category")}
          error={errors.category?.message}
        />

        <Select
          label="Estado"
          options={[
            { value: "active", label: "Activa" },
            { value: "paused", label: "Pausada" },
            { value: "cancelled", label: "Cancelada" },
          ]}
          {...register("status")}
          error={errors.status?.message}
        />
      </div>

      <Input
        label="Notas (opcional)"
        {...register("notes")}
        error={errors.notes?.message}
        placeholder="Información adicional..."
      />

      {showRecordPayment && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={recordPayment}
            onChange={(e) => setRecordPayment(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-[var(--primary)]"
          />
          <span className="text-sm text-foreground">
            Registrar pago realizado (añadir al historial)
          </span>
        </label>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : subscription ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}
