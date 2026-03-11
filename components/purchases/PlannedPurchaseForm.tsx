"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { plannedPurchaseBodySchema, type PlannedPurchaseBody } from "@/lib/validations/schemas";
import type { PlannedPurchase } from "@/types";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { CreditCard, Link2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const PAYMENT_METHODS = [
  { value: "", label: "¿Cómo pagaste?" },
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
  { value: "cash", label: "Efectivo" },
];

type FormValues = PlannedPurchaseBody & {
  link?: string;
  image_url?: string;
  card_name?: string;
  notes?: string;
};

interface PlannedPurchaseFormProps {
  purchase?: PlannedPurchase | null;
  defaultMonth?: number;
  defaultYear?: number;
  onSubmit: (data: PlannedPurchaseBody) => Promise<void>;
  onCancel: () => void;
}

export function PlannedPurchaseForm({
  purchase,
  defaultMonth,
  defaultYear,
  onSubmit,
  onCancel,
}: PlannedPurchaseFormProps) {
  const now = new Date();
  const currentMonth = defaultMonth ?? now.getMonth() + 1;
  const currentYear = defaultYear ?? now.getFullYear();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(plannedPurchaseBodySchema),
    defaultValues: {
      name: purchase?.name ?? "",
      link: purchase?.link ?? "",
      image_url: purchase?.image_url ?? "",
      planned_month: purchase?.planned_month ?? currentMonth,
      planned_year: purchase?.planned_year ?? currentYear,
      bought: purchase?.bought ?? false,
      payment_method: purchase?.payment_method ?? null,
      card_name: purchase?.card_name ?? "",
      bought_with_installments: purchase?.bought_with_installments ?? false,
      notes: purchase?.notes ?? "",
    },
  });

  const bought = watch("bought");
  const paymentMethod = watch("payment_method");

  const handleFormSubmit = async (data: FormValues) => {
    await onSubmit({
      ...data,
      link: data.link?.trim() || undefined,
      image_url: data.image_url?.trim() || undefined,
      card_name: data.card_name?.trim() || null,
      notes: data.notes?.trim() || null,
    });
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() + i);
  const yearOptions = years.map((y) => ({ value: String(y), label: String(y) }));

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-5">
      <Input
        label="¿Qué querés comprar?"
        placeholder="Ej: remera negra, juego Steam, auriculares"
        error={errors.name?.message}
        {...register("name")}
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Mes"
          options={MONTHS}
          error={errors.planned_month?.message}
          {...register("planned_month", { valueAsNumber: true })}
        />
        <Select
          label="Año"
          options={yearOptions}
          error={errors.planned_year?.message}
          {...register("planned_year", { valueAsNumber: true })}
        />
      </div>

      <div className="space-y-1">
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Opcional
        </label>
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="url"
              placeholder="Link del producto"
              className={cn(
                "h-10 w-full rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] pl-9 pr-3 py-2 text-[15px] text-foreground",
                "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
              )}
              {...register("link")}
            />
          </div>
          <div className="relative">
            <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="url"
              placeholder="URL de una imagen"
              className={cn(
                "h-10 w-full rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] pl-9 pr-3 py-2 text-[15px] text-foreground",
                "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
              )}
              {...register("image_url")}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border"
            {...register("bought")}
          />
          <span className="text-sm font-medium text-foreground">
            Ya lo compré
          </span>
        </label>

        {bought && (
          <div className="space-y-3 pt-2 border-t border-border">
            <Select
              label="¿Cómo lo pagaste?"
              options={PAYMENT_METHODS}
              value={watch("payment_method") ?? ""}
              error={errors.payment_method?.message}
              {...register("payment_method", {
                setValueAs: (v) => (v === "" ? null : v),
              })}
            />
            {paymentMethod === "card" && (
              <Input
                label="¿Con qué tarjeta?"
                placeholder="Ej: Visa Naranja, Mercado Pago"
                error={errors.card_name?.message}
                {...register("card_name")}
              />
            )}
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                {...register("bought_with_installments")}
              />
              <span className="text-sm text-foreground">Lo pagué en cuotas</span>
            </label>
          </div>
        )}
      </div>

      <Input
        label="Notas (opcional)"
        placeholder="Algo que quieras recordar"
        error={errors.notes?.message}
        {...register("notes")}
      />

      <div className="flex flex-wrap gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : purchase ? "Actualizar" : "Agregar"}
        </Button>
      </div>
    </form>
  );
}
