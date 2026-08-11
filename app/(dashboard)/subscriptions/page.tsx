"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Subscription, SubscriptionFormData } from "@/types";
import { LazySubscriptionCard } from "@/components/subscriptions/LazySubscriptionCard";
import { SubscriptionFilters } from "@/components/subscriptions/SubscriptionFilters";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { SkeletonCards, SkeletonHeader } from "@/components/ui/Loading";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";
import { Button } from "@/components/ui/Button";
import { ExportDropdown } from "@/components/ui/ExportDropdown";
import { useToast } from "@/lib/contexts/ToastContext";
import { useSubscriptions } from "@/lib/hooks/useSubscriptions";
import { isSubscriptionCompleted } from "@/lib/subscriptions";

const PAGE_SIZE = 12;

function SubscriptionsContent() {
  const t = useTranslations("subscriptions");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { subscriptions, loading, create, update, remove } = useSubscriptions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // La búsqueda vive en la URL: se lee, no se copia a estado.
  const searchQuery = searchParams.get("q") ?? "";

  /**
   * Cambiar de búsqueda o de filtro tiene que volver a la página 1. En vez de
   * un efecto que resetee después de renderizar, la página se guarda junto al
   * criterio que la originó y se descarta sola cuando ese criterio cambia.
   */
  const filterKey = `${searchQuery}|${statusFilter}|${categoryFilter}`;
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = useCallback(
    (next: number) => setPageState({ key: filterKey, page: next }),
    [filterKey]
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingSubscription(null);
  }, []);

  const handleCreate = useCallback(
    async (data: SubscriptionFormData) => {
      if (!(await create(data))) return toast.error(t("errorCreate"));
      closeModal();
      toast.success(t("subscriptionCreated"));
    },
    [create, closeModal, toast, t]
  );

  const handleEdit = useCallback((subscription: Subscription) => {
    setEditingSubscription(subscription);
    setIsModalOpen(true);
  }, []);

  const handleUpdate = useCallback(
    async (data: SubscriptionFormData) => {
      if (!editingSubscription) return;
      if (!(await update(editingSubscription.id, data))) return toast.error(t("errorUpdate"));
      closeModal();
      toast.success(t("subscriptionUpdated"));
    },
    [editingSubscription, update, closeModal, toast, t]
  );

  const handleDeleteClick = useCallback((id: string) => {
    setDeleteTargetId(id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const ok = await remove(deleteTargetId);
      toast[ok ? "success" : "error"](t(ok ? "subscriptionDeleted" : "errorDelete"));
    } finally {
      setDeleting(false);
      setDeleteTargetId(null);
    }
  }, [deleteTargetId, remove, toast, t]);

  const categories = useMemo(
    () =>
      [...new Set(subscriptions.map((s) => s.category).filter(Boolean))].sort((a, b) =>
        (a ?? "").localeCompare(b ?? "")
      ) as string[],
    [subscriptions]
  );

  const filteredSubscriptions = useMemo(
    () =>
      subscriptions.filter((sub) => {
        const q = searchQuery.toLowerCase();
        const isCompleted = isSubscriptionCompleted(sub);
        const matchesSearch =
          sub.name.toLowerCase().includes(q) ||
          (sub.category ?? "").toLowerCase().includes(q);
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && sub.status === "active" && !isCompleted) ||
          (statusFilter === "paused" && sub.status === "paused") ||
          (statusFilter === "cancelled" && (sub.status === "cancelled" || isCompleted));
        const matchesCategory = categoryFilter === "all" || (sub.category ?? "") === categoryFilter;
        return matchesSearch && matchesStatus && matchesCategory;
      }),
    [subscriptions, searchQuery, statusFilter, categoryFilter]
  );

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "all" || categoryFilter !== "all";

  const clearFilters = useCallback(() => {
    setStatusFilter("all");
    setCategoryFilter("all");
    // Saca ?q= de la URL; la página vuelve sola a 1 al cambiar el criterio.
    router.push("/subscriptions");
  }, [router]);

  const { totalPages, paginatedSubscriptions } = useMemo(() => {
    const total = Math.max(1, Math.ceil(filteredSubscriptions.length / PAGE_SIZE));
    const start = (page - 1) * PAGE_SIZE;
    return {
      totalPages: total,
      paginatedSubscriptions: filteredSubscriptions.slice(start, start + PAGE_SIZE),
    };
  }, [filteredSubscriptions, page]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <SkeletonHeader />
        <SkeletonCards />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6 sm:mb-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
            {t("titleExpenses")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("subtitleExpenses")}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <ExportDropdown subscriptions={subscriptions} />
          <Button variant="primary" onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
            {t("addExpense")}
          </Button>
        </div>
      </header>

      <div className="mb-6">
        <SubscriptionFilters
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          categories={categories}
          resultCount={filteredSubscriptions.length}
          totalCount={subscriptions.length}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSubscriptions.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? t("noResultsFilters")
                : t("noExpensesYet")}
            </p>
          </div>
        ) : (
          paginatedSubscriptions.map((subscription) => (
            <LazySubscriptionCard
              key={subscription.id}
              subscription={subscription}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          ))
        )}
      </div>

      {filteredSubscriptions.length > 0 && totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      <ConfirmDialog
        isOpen={deleteTargetId != null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title={t("deleteExpense")}
        description={t("deleteExpenseConfirm")}
        confirmLabel={tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        variant="danger"
        loading={deleting}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingSubscription ? t("editExpense") : t("newExpense")}
      >
        <SubscriptionForm
          subscription={editingSubscription ?? undefined}
          onSubmit={editingSubscription ? handleUpdate : handleCreate}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}

export default function SubscriptionsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <SkeletonHeader />
          <SkeletonCards />
        </div>
      }
    >
      <SubscriptionsContent />
    </Suspense>
  );
}
