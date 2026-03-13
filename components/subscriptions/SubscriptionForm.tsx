"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import {
  Subscription,
  SubscriptionFormData,
  BillingCycle,
  SubscriptionStatus,
  PaymentType,
} from "@/types";
import { SUBSCRIPTION_TEMPLATES } from "@/lib/constants/subscriptionTemplates";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { INSTALLMENT_OPTIONS } from "@/lib/subscriptions";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { Repeat, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const installmentCountSchema = z.union([
  z.literal(3),
  z.literal(6),
  z.literal(9),
  z.literal(12),
]);
const optionalNumber = z.preprocess(
  (value) => (typeof value === "number" && Number.isNaN(value) ? undefined : value),
  z.number().optional()
);

function buildSubscriptionSchema(t: (key: string, values?: Record<string, number>) => string) {
  return z
    .object({
      name: z.string().min(1, t("nameRequired")),
      price: optionalNumber,
      billing_cycle: z.enum(["monthly", "yearly", "quarterly"]),
      payment_type: z.enum(["recurring", "installment"]),
      installment_count: z.preprocess(
        (value) => {
          if (value === undefined || value === null || value === "") return undefined;
          const num = Number(value);
          return Number.isNaN(num) ? undefined : num;
        },
        installmentCountSchema.optional()
      ),
      total_amount: optionalNumber,
      next_payment_date: z.string().min(1, t("dateRequired")),
      category: z.string().trim().min(1, t("categoryRequired")),
      status: z.enum(["active", "cancelled", "paused"]),
      installments_paid: z.preprocess(
        (v) => {
          if (v === "" || v == null) return undefined;
          const n = Number(v);
          return Number.isNaN(n) ? undefined : n;
        },
        z.number().int().min(0).max(12).optional()
      ),
      notes: z.preprocess((val) => (val == null ? "" : val), z.string().max(2000).optional()),
    })
    .superRefine((data, ctx) => {
      if (data.payment_type === "installment") {
        if (!data.installment_count) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["installment_count"],
            message: t("selectInstallments"),
          });
        }

        if (!data.total_amount || data.total_amount <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["total_amount"],
            message: t("totalAmountMin"),
          });
        }
      }

      if (data.payment_type === "recurring" && (!data.price || data.price <= 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["price"],
          message: t("priceMin"),
        });
      }

      if (
        data.payment_type === "installment" &&
        data.installment_count != null &&
        (data.installments_paid ?? 0) > data.installment_count
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["installments_paid"],
          message: t("installmentsPaidMax", { count: data.installment_count }),
        });
      }
    });
}

type SubscriptionFormValues = {
  name: string;
  price?: number;
  billing_cycle: BillingCycle;
  payment_type: PaymentType;
  installment_count?: 3 | 6 | 9 | 12;
  installments_paid?: number;
  total_amount?: number;
  next_payment_date: string;
  category: string;
  status: SubscriptionStatus;
  notes?: string;
};

interface SubscriptionFormProps {
  subscription?: Subscription;
  onSubmit: (data: SubscriptionFormData) => Promise<void>;
  onSubmitWithRecordPayment?: (
    data: SubscriptionFormData,
    recordPayment: boolean
  ) => Promise<void>;
  onCancel: () => void;
}

export function SubscriptionForm({
  subscription,
  onSubmit,
  onSubmitWithRecordPayment,
  onCancel,
}: SubscriptionFormProps) {
  const t = useTranslations("subscriptionForm");
  const subscriptionSchema = useMemo(
    () => buildSubscriptionSchema((key, values) => (values ? t(key, values) : t(key))),
    [t]
  );
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: subscription
      ? {
          name: subscription.name,
          price: subscription.price,
          billing_cycle: subscription.billing_cycle,
          payment_type: subscription.payment_type ?? "recurring",
          installment_count: subscription.installment_count ?? undefined,
          installments_paid: subscription.installments_paid ?? 0,
          total_amount:
            subscription.total_amount ??
            (subscription.installment_count
              ? subscription.price * subscription.installment_count
              : undefined),
          next_payment_date: subscription.next_payment_date.split("T")[0],
          category: subscription.category,
          status: subscription.status,
          notes: subscription.notes ?? "",
        }
      : {
          price: 0,
          billing_cycle: "monthly",
          payment_type: "recurring",
          status: "active",
          category: "",
          installments_paid: 0,
        },
  });

  const [recordPayment, setRecordPayment] = useState(false);
  const formatCurrency = useFormatCurrency();
  const paymentType = watch("payment_type");
  const totalAmount = watch("total_amount");
  const installmentCount = watch("installment_count");
  const nextPaymentDate = watch("next_payment_date");
  const initialNextPayment =
    subscription?.next_payment_date?.split("T")[0] ?? "";
  const showRecordPayment =
    !!subscription &&
    !!onSubmitWithRecordPayment &&
    nextPaymentDate !== "" &&
    nextPaymentDate !== initialNextPayment;

  const installmentAmountPreview =
    paymentType === "installment" &&
    installmentCount &&
    totalAmount != null &&
    totalAmount > 0
      ? totalAmount / installmentCount
      : null;

  const onSubmitForm = async (values: SubscriptionFormValues) => {
    const data: SubscriptionFormData =
      values.payment_type === "installment"
        ? {
            name: values.name.trim(),
            price: Number(((values.total_amount ?? 0) / (values.installment_count ?? 1)).toFixed(2)),
            billing_cycle: "monthly",
            payment_type: "installment",
            installment_count: values.installment_count ?? null,
            installments_paid: values.installments_paid ?? 0,
            total_amount: Number((values.total_amount ?? 0).toFixed(2)),
            next_payment_date: values.next_payment_date,
            category: values.category.trim(),
            status: values.status,
            notes: values.notes?.trim() || undefined,
          }
        : {
            name: values.name.trim(),
            price: Number((values.price ?? 0).toFixed(2)),
            billing_cycle: values.billing_cycle,
            payment_type: "recurring",
            installment_count: null,
            installments_paid: 0,
            total_amount: null,
            next_payment_date: values.next_payment_date,
            category: values.category.trim(),
            status: values.status,
            notes: values.notes?.trim() || undefined,
          };

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
      payment_type: "recurring",
      installment_count: undefined,
      total_amount: undefined,
      next_payment_date: nextPaymentDate,
      category,
      status: "active",
      notes: "",
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      {!subscription && SUBSCRIPTION_TEMPLATES.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("shortcuts")}
          </p>
          <div className="flex flex-wrap gap-2">
            {SUBSCRIPTION_TEMPLATES.map((template) => {
              const label = template.id === "gym" ? t("templateGym") : template.id === "newspaper" ? t("templateNewspaper") : template.id === "course" ? t("templateCourse") : template.name;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template.name, template.category, template.billing_cycle)}
                  className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted hover:border-foreground/20"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("whatIsThisExpense")}
        </p>
        <Input
          {...register("name")}
          error={errors.name?.message}
          placeholder={t("namePlaceholder")}
        />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("expenseType")}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label
            className={cn(
              "flex cursor-pointer flex-col gap-1 rounded-xl border-2 p-4 transition-all",
              paymentType === "recurring"
                ? "border-[var(--primary)] bg-[var(--primary)]/5"
                : "border-border bg-muted/30 hover:border-muted-foreground/30"
            )}
          >
            <input
              type="radio"
              value="recurring"
              {...register("payment_type")}
              className="sr-only"
            />
            <span className="flex items-center gap-2 font-medium text-foreground">
              <Repeat className="h-4 w-4" />
              {t("recurring")}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("recurringHint")}
            </span>
          </label>
          <label
            className={cn(
              "flex cursor-pointer flex-col gap-1 rounded-xl border-2 p-4 transition-all",
              paymentType === "installment"
                ? "border-[var(--primary)] bg-[var(--primary)]/5"
                : "border-border bg-muted/30 hover:border-muted-foreground/30"
            )}
          >
            <input
              type="radio"
              value="installment"
              {...register("payment_type")}
              className="sr-only"
            />
            <span className="flex items-center gap-2 font-medium text-foreground">
              <CreditCard className="h-4 w-4" />
              {t("installmentLabel")}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("installmentHint")}
            </span>
          </label>
        </div>
      </div>

      {paymentType === "recurring" ? (
        <>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("howMuchPay")}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label={t("amountLabel")}
                type="number"
                step="0.01"
                {...register("price", { valueAsNumber: true })}
                error={errors.price?.message}
                placeholder="0.00"
              />
              <Select
                label={t("howOften")}
                options={[
                  { value: "monthly", label: t("monthly") },
                  { value: "quarterly", label: t("quarterly") },
                  { value: "yearly", label: t("yearly") },
                ]}
                {...register("billing_cycle")}
                error={errors.billing_cycle?.message}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
          <p className="text-sm font-medium text-foreground">{t("installmentPlanTitle")}</p>
          <p className="text-xs text-muted-foreground">
            {t("installmentPlanHint")}
          </p>
          <div className="space-y-2">
            <Input
              label={t("totalAmountLabel")}
              type="number"
              step="0.01"
              {...register("total_amount", { valueAsNumber: true })}
              error={errors.total_amount?.message}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{t("howManyInstallments")}</p>
            <div className="flex flex-wrap gap-2">
              {INSTALLMENT_OPTIONS.map((option) => (
                <label
                  key={option}
                  className={cn(
                    "flex min-w-[4rem] cursor-pointer items-center justify-center rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all",
                    installmentCount === option
                      ? "border-[var(--primary)] bg-[var(--primary)]/10 text-foreground"
                      : "border-border bg-muted/40 text-muted-foreground hover:border-muted-foreground/40"
                  )}
                >
                  <input
                    type="radio"
                    value={option}
                    {...register("installment_count", { valueAsNumber: true })}
                    className="sr-only"
                  />
                  {option}
                </label>
              ))}
            </div>
            {errors.installment_count?.message && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.installment_count.message}
              </p>
            )}
          </div>
            {installmentAmountPreview != null && (
            <div className="rounded-lg bg-[var(--card)] p-3 text-center">
              <p className="text-xs text-muted-foreground">{t("youPay")}</p>
              <p className="text-lg font-semibold text-foreground">
                {t("installmentsOf", { count: installmentCount ?? 0, amount: formatCurrency(installmentAmountPreview) })}
              </p>
              <p className="text-xs text-muted-foreground">{t("each")}</p>
            </div>
          )}
          <div className="space-y-2">
            <Input
              label={t("installmentsPaid")}
              type="number"
              min={0}
              max={installmentCount ?? 12}
              step={1}
              {...register("installments_paid", { valueAsNumber: true })}
              error={errors.installments_paid?.message}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              {t("installmentsPaidHint")}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {paymentType === "installment" ? t("nextInstallmentDateLabel") : t("nextPaymentDateLabel")}
        </p>
        <Input
          type="date"
          {...register("next_payment_date")}
          error={errors.next_payment_date?.message}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("categoryAndStatus")}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Input
              label={t("category")}
              list="category-suggestions"
              {...register("category")}
              error={errors.category?.message}
              placeholder={t("categoryPlaceholder")}
            />
            <datalist id="category-suggestions">
              {t("categorySuggestions").split(",").map((category) => (
                <option key={category} value={category.trim()} />
              ))}
            </datalist>
          </div>
          <Select
            label={t("status")}
            options={[
              { value: "active", label: t("active") },
              { value: "paused", label: t("paused") },
              { value: "cancelled", label: t("cancelled") },
            ]}
            {...register("status")}
            error={errors.status?.message}
          />
        </div>
      </div>

      <Input
        label={t("notesOptional")}
        {...register("notes")}
        error={errors.notes?.message}
        placeholder={t("notesPlaceholder")}
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
            {t("recordPaymentLabel")}
          </span>
        </label>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} className="w-full sm:w-auto">
          {t("cancel")}
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting
            ? t("saving")
            : subscription
              ? paymentType === "installment" && installmentCount
                ? t("updateWithInstallments", { count: installmentCount })
                : t("update")
              : paymentType === "installment" && installmentCount
                ? t("createWithInstallments", { count: installmentCount })
                : t("create")}
        </Button>
      </div>
    </form>
  );
}
