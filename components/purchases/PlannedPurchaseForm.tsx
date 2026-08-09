"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { plannedPurchaseBodySchema, type PlannedPurchaseBody } from "@/lib/validations/schemas";
import type { PlannedPurchase } from "@/types";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { CreditCard, Link2, Check, Calendar, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const MONTH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const INSTALLMENT_COUNTS = [3, 6, 9, 12] as const;

type FormValues = PlannedPurchaseBody & {
  link?: string;
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
  const t = useTranslations("plannedPurchaseForm");
  const tPurchases = useTranslations("purchases");
  const tCommon = useTranslations("common");

  const now = new Date();
  const currentMonth = defaultMonth ?? now.getMonth() + 1;
  const currentYear = defaultYear ?? now.getFullYear();
  const formatCurrency = useFormatCurrency();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(plannedPurchaseBodySchema),
    defaultValues: {
      name: purchase?.name ?? "",
      price: purchase?.price ?? null,
      link: purchase?.link ?? "",
      planned_month: purchase?.planned_month ?? currentMonth,
      planned_year: purchase?.planned_year ?? currentYear,
      bought: purchase?.bought ?? false,
      bought_date: purchase?.bought_date ?? null,
      payment_method: purchase?.payment_method ?? null,
      card_name: purchase?.card_name ?? "",
      bought_with_installments: purchase?.bought_with_installments ?? false,
      installment_count: purchase?.installment_count ?? null,
      installments_paid: purchase?.installments_paid ?? 0,
      installments_start_next_month: purchase?.installments_start_next_month ?? false,
      notes: purchase?.notes ?? "",
    },
  });

  const bought = watch("bought");
  const paymentMethod = watch("payment_method");
  const boughtWithInstallments = watch("bought_with_installments");

  useEffect(() => {
    if (paymentMethod !== "card" && boughtWithInstallments) {
      setValue("bought_with_installments", false, { shouldDirty: true, shouldValidate: true });
      setValue("installment_count", null, { shouldDirty: true, shouldValidate: true });
      setValue("installments_paid", 0, { shouldDirty: true, shouldValidate: true });
      setValue("installments_start_next_month", false, { shouldDirty: true, shouldValidate: true });
    }
  }, [paymentMethod, boughtWithInstallments, setValue]);

  const handleFormSubmit = async (data: FormValues) => {
    await onSubmit({
      ...data,
      price: data.price ?? null,
      link: data.link?.trim() || undefined,
      card_name: data.card_name?.trim() || null,
      notes: data.notes?.trim() || null,
    });
  };

  const price = watch("price");
  const installmentCount = watch("installment_count");
  /** En cuotas, `price` es el total: mostramos cuánto cae por mes. */
  const perInstallment =
    boughtWithInstallments && installmentCount && price ? price / installmentCount : null;

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() + i);
  const yearOptions = years.map((y) => ({ value: String(y), label: String(y) }));

  const monthOptions = MONTH_NUMBERS.map((m) => ({
    value: String(m),
    label: tPurchases(`months.${m}` as "months.1"),
  }));
  const paymentMethodOptions = [
    { value: "", label: tCommon("select") },
    { value: "card", label: t("card") },
    { value: "transfer", label: t("transfer") },
    { value: "cash", label: t("cash") },
  ];
  const installmentOptions = [
    { value: "", label: tCommon("select") },
    ...INSTALLMENT_COUNTS.map((n) => ({
      value: String(n),
      label: t("installmentsOption", { count: n }),
    })),
  ];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-6">
      {/* Qué comprar */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("whatToBuy")}
        </p>
        <Input
          placeholder={t("namePlaceholder")}
          error={errors.name?.message}
          {...register("name")}
        />
      </div>

      {/* Precio estimado */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("priceLabel")}
        </p>
        <Input
          type="number"
          step="0.01"
          min={0}
          inputMode="decimal"
          placeholder="0.00"
          error={errors.price?.message}
          {...register("price", {
            setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
          })}
        />
        <p className="text-xs text-muted-foreground">
          {perInstallment != null
            ? t("priceInstallmentHint", {
                count: installmentCount ?? 0,
                amount: formatCurrency(perInstallment),
              })
            : t("priceHint")}
        </p>
      </div>

      {/* Cuándo */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {t("when")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="planned_month"
            control={control}
            render={({ field }) => (
              <Select
                label={tCommon("month")}
                options={monthOptions}
                error={errors.planned_month?.message}
                value={String(field.value)}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            )}
          />
          <Controller
            name="planned_year"
            control={control}
            render={({ field }) => (
              <Select
                label={tCommon("year")}
                options={yearOptions}
                error={errors.planned_year?.message}
                value={String(field.value)}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            )}
          />
        </div>
      </div>

      {/* Link opcional */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("optional")}
        </p>
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
          <input
            type="url"
            placeholder={t("linkPlaceholder")}
            className={cn(
              "h-10 w-full rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] pl-10 pr-3 py-2 text-[15px] text-foreground",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-foreground/30 transition-colors"
            )}
            {...register("link")}
          />
        </div>
      </div>

      {/* Estado: ¿Ya lo compré? */}
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("status")}
        </p>
        <label
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all",
            bought
              ? "border-[var(--primary)] bg-[var(--primary)]/5"
              : "border-border bg-muted/20 hover:border-muted-foreground/20"
          )}
        >
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
            {...register("bought")}
          />
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            {t("alreadyBought")}
          </span>
        </label>

        {bought && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t("boughtDate")}
              </p>
              <input
                type="date"
                className={cn(
                  "h-10 w-full rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[15px] text-foreground",
                  "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-foreground/30 transition-colors"
                )}
                {...register("bought_date", {
                  setValueAs: (v) => (v === "" ? null : v),
                })}
              />
              {errors.bought_date?.message && (
                <p className="text-xs text-red-500">{errors.bought_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                {t("paymentMethod")}
              </p>
              <Select
                aria-label={t("paymentMethod")}
                options={paymentMethodOptions}
                value={watch("payment_method") ?? ""}
                error={errors.payment_method?.message}
                {...register("payment_method", {
                  setValueAs: (v) => (v === "" ? null : v),
                })}
              />
            </div>
            {paymentMethod === "card" && (
              <Input
                label={t("cardNameLabel")}
                placeholder={t("cardNamePlaceholder")}
                error={errors.card_name?.message}
                {...register("card_name")}
              />
            )}
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                {...register("bought_with_installments")}
                disabled={paymentMethod !== "card"}
              />
              <span className="text-sm text-foreground">
                {t("paidInInstallments")}
                {paymentMethod !== "card" && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {t("onlyWithCard")}
                  </span>
                )}
              </span>
            </label>
            {watch("bought_with_installments") && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    {t("howManyInstallments")}
                  </p>
                  <Controller
                    name="installment_count"
                    control={control}
                    render={({ field }) => (
                      <Select
                        options={installmentOptions}
                        value={field.value != null ? String(field.value) : ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          field.onChange(v === "" ? null : (Number(v) as 3 | 6 | 9 | 12));
                        }}
                        error={errors.installment_count?.message}
                      />
                    )}
                  />
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                      {...register("installments_start_next_month")}
                    />
                    {t("startsNextMonth")}
                  </label>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("howManyPaid")}
                  </p>
                  <Controller
                    name="installments_paid"
                    control={control}
                    render={({ field }) => {
                      // react-hook-form no es compatible con el React Compiler:
                      // este componente queda sin optimizar. Nada que corregir.
                      // eslint-disable-next-line react-hooks/incompatible-library
                      const total = watch("installment_count") ?? 12;
                      const options = Array.from({ length: total + 1 }, (_, paid) => {
                        if (paid === 0) return { value: "0", label: t("nonePaid") };
                        if (paid === total) return { value: String(paid), label: t("allPaid") };
                        return { value: String(paid), label: t("somePaid", { count: paid }) };
                      });
                      return (
                        <Select
                          options={options}
                          value={String(field.value)}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          error={errors.installments_paid?.message}
                        />
                      );
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notas */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("notes")}
        </p>
        <Input
          placeholder={t("notesPlaceholder")}
          error={errors.notes?.message}
          {...register("notes")}
        />
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-border">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? t("saving") : purchase ? t("update") : t("add")}
        </Button>
      </div>
    </form>
  );
}
