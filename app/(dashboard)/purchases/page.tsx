"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PlannedPurchase } from "@/types";
import { PlannedPurchaseCard } from "@/components/purchases/PlannedPurchaseCard";
import { PlannedPurchaseForm } from "@/components/purchases/PlannedPurchaseForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { LoadingState } from "@/components/ui/Loading";
import { useToast } from "@/lib/contexts/ToastContext";
import { usePlannedPurchases } from "@/lib/hooks/usePlannedPurchases";
import type { PlannedPurchaseBody } from "@/lib/validations/schemas";
import { ShoppingBag, Plus, Calendar } from "lucide-react";

const MONTH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const YEARS_AHEAD = 5;

function PurchasesContent() {
  const t = useTranslations("purchases");
  const tCommon = useTranslations("common");
  const tMonths = useTranslations("purchases.months");
  const toast = useToast();

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PlannedPurchase | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { purchases, loading, loadFailed, save, remove } = usePlannedPurchases(month, year);

  useEffect(() => {
    if (loadFailed) toast.error(t("errorLoad"));
  }, [loadFailed, toast, t]);

  const monthOptions = MONTH_NUMBERS.map((m) => ({
    value: String(m),
    label: tMonths(String(m) as "1"),
  }));
  const yearOptions = Array.from({ length: YEARS_AHEAD }, (_, i) => {
    const y = currentYear + i;
    return { value: String(y), label: String(y) };
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPurchase(null);
  };

  /** Alta y edición comparten todo salvo el id, el verbo y el mensaje de éxito. */
  const savePurchase = async (data: PlannedPurchaseBody) => {
    const editing = editingPurchase;
    const result = await save(data, editing?.id);

    if (!result.ok) {
      toast.error(
        result.invalidData
          ? t("checkData")
          : result.message || t(editing ? "errorUpdate" : "errorSave")
      );
      return;
    }

    closeModal();
    toast.success(t(editing ? "purchaseUpdated" : "purchaseAdded"));
  };

  const handleEdit = (purchase: PlannedPurchase) => {
    setEditingPurchase(purchase);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const ok = await remove(deleteTargetId);
      toast[ok ? "success" : "error"](t(ok ? "purchaseDeleted" : "errorDelete"));
    } finally {
      setDeleting(false);
      setDeleteTargetId(null);
    }
  };

  if (loading) return <LoadingState message={t("loading")} />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-10 sm:w-10">
              <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            {t("title")}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t("subtitleHint")}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingPurchase(null);
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          {t("addFirst")}
        </Button>
      </header>

      <div className="mb-8 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-[var(--card-shadow)]">
        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
        <span className="text-sm font-medium text-muted-foreground">{t("view")}</span>
        <div className="flex items-center gap-2">
          <Select
            id="filter-month"
            options={monthOptions}
            value={String(month)}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="min-w-[130px]"
            aria-label={tCommon("month")}
          />
          <Select
            id="filter-year"
            options={yearOptions}
            value={String(year)}
            onChange={(e) => setYear(Number(e.target.value))}
            className="min-w-[95px]"
            aria-label={tCommon("year")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {purchases.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/10 py-20 px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
              <ShoppingBag className="h-8 w-8" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-foreground">
              {t("noPurchasesThisMonth")}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {t("noPurchasesHint")}
            </p>
            <Button
              variant="primary"
              className="mt-6 gap-2"
              onClick={() => {
                setEditingPurchase(null);
                setIsModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t("addFirst")}
            </Button>
          </div>
        ) : (
          purchases.map((purchase) => (
            <PlannedPurchaseCard
              key={purchase.id}
              purchase={purchase}
              onEdit={handleEdit}
              onDelete={setDeleteTargetId}
            />
          ))
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteTargetId != null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title={t("deletePurchase")}
        description={t("deletePurchaseConfirm")}
        confirmLabel={tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        variant="danger"
        loading={deleting}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingPurchase ? t("editPurchase") : t("newPurchase")}
        size="md"
      >
        <PlannedPurchaseForm
          purchase={editingPurchase ?? undefined}
          defaultMonth={month}
          defaultYear={year}
          onSubmit={savePurchase}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}

export default function PurchasesPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PurchasesContent />
    </Suspense>
  );
}
