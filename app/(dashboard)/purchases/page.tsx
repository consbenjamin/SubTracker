"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PlannedPurchase } from "@/types";
import { PlannedPurchaseCard } from "@/components/purchases/PlannedPurchaseCard";
import { PlannedPurchaseForm } from "@/components/purchases/PlannedPurchaseForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/lib/contexts/ToastContext";
import type { PlannedPurchaseBody } from "@/lib/validations/schemas";
import { ShoppingBag, Plus, Calendar } from "lucide-react";

function useMonthsOptions() {
  const t = useTranslations("purchases.months");
  return [
    { value: "1", label: t("1") }, { value: "2", label: t("2") }, { value: "3", label: t("3") },
    { value: "4", label: t("4") }, { value: "5", label: t("5") }, { value: "6", label: t("6") },
    { value: "7", label: t("7") }, { value: "8", label: t("8") }, { value: "9", label: t("9") },
    { value: "10", label: t("10") }, { value: "11", label: t("11") }, { value: "12", label: t("12") },
  ];
}

function PurchasesContent() {
  const t = useTranslations("purchases");
  const tCommon = useTranslations("common");
  const toast = useToast();
  const MONTHS = useMonthsOptions();
  const now = new Date();
  const [purchases, setPurchases] = useState<PlannedPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PlannedPurchase | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPurchases = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        month: String(month),
        year: String(year),
      });
      const res = await fetch(`/api/planned-purchases?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPurchases(data);
      }
    } catch (err) {
      console.error("Error fetching planned purchases:", err);
      toast.error(t("errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [month, year, toast]);

  useEffect(() => {
    setLoading(true);
    fetchPurchases();
  }, [fetchPurchases]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingPurchase(null);
  }, []);

  const handleCreate = useCallback(
    async (data: PlannedPurchaseBody) => {
      const res = await fetch("/api/planned-purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchPurchases();
        closeModal();
        toast.success(t("purchaseAdded"));
      } else {
        const err = await res.json();
        toast.error(err.details ? t("checkData") : err.error || t("errorSave"));
      }
    },
    [fetchPurchases, closeModal, toast]
  );

  const handleEdit = useCallback((purchase: PlannedPurchase) => {
    setEditingPurchase(purchase);
    setIsModalOpen(true);
  }, []);

  const handleUpdate = useCallback(
    async (data: PlannedPurchaseBody) => {
      if (!editingPurchase) return;
      const res = await fetch(`/api/planned-purchases/${editingPurchase.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchPurchases();
        closeModal();
        toast.success(t("purchaseUpdated"));
      } else {
        const err = await res.json();
        toast.error(err.details ? t("checkData") : err.error || t("errorUpdate"));
      }
    },
    [editingPurchase, fetchPurchases, closeModal, toast]
  );

  const handleDeleteClick = useCallback((id: string) => {
    setDeleteTargetId(id);
  }, []);

  const handleDeleteConfirm = useCallback(
    async () => {
      if (!deleteTargetId) return;
      setDeleting(true);
      try {
        const res = await fetch(`/api/planned-purchases/${deleteTargetId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          await fetchPurchases();
          toast.success(t("purchaseDeleted"));
        } else {
          toast.error(t("errorDelete"));
        }
      } finally {
        setDeleting(false);
        setDeleteTargetId(null);
      }
    },
    [deleteTargetId, fetchPurchases, toast]
  );

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() + i);
  const yearOptions = years.map((y) => ({ value: String(y), label: String(y) }));

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

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
            options={MONTHS}
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
              onDelete={handleDeleteClick}
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
          onSubmit={editingPurchase ? handleUpdate : handleCreate}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}

export default function PurchasesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="text-sm text-muted-foreground">...</p>
        </div>
      }
    >
      <PurchasesContent />
    </Suspense>
  );
}
