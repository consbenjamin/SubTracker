"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Subscription, SubscriptionFormData } from "@/types";
import { LazySubscriptionCard } from "@/components/subscriptions/LazySubscriptionCard";
import { SubscriptionFilters } from "@/components/subscriptions/SubscriptionFilters";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";
import { Button } from "@/components/ui/Button";
import { ExportDropdown } from "@/components/ui/ExportDropdown";
import { useToast } from "@/lib/contexts/ToastContext";
import { isSubscriptionCompleted } from "@/lib/subscriptions";

const PAGE_SIZE = 12;

function SubscriptionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await fetch("/api/subscriptions");
      if (res.ok) setSubscriptions(await res.json());
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setSearchQuery(q);
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingSubscription(null);
  }, []);

  const handleCreate = useCallback(
    async (data: SubscriptionFormData) => {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchSubscriptions();
        closeModal();
        toast.success("Suscripción creada");
      } else {
        toast.error("Error al crear la suscripción");
      }
    },
    [fetchSubscriptions, closeModal, toast]
  );

  const handleEdit = useCallback((subscription: Subscription) => {
    setEditingSubscription(subscription);
    setIsModalOpen(true);
  }, []);

  const handleUpdate = useCallback(
    async (data: SubscriptionFormData) => {
      if (!editingSubscription) return;
      const res = await fetch(`/api/subscriptions/${editingSubscription.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchSubscriptions();
        closeModal();
        toast.success("Suscripción actualizada");
      } else {
        toast.error("Error al actualizar");
      }
    },
    [editingSubscription, fetchSubscriptions, closeModal, toast]
  );

  const handleDeleteClick = useCallback((id: string) => {
    setDeleteTargetId(id);
  }, []);

  const handleDeleteConfirm = useCallback(
    async () => {
      if (!deleteTargetId) return;
      setDeleting(true);
      try {
        const res = await fetch(`/api/subscriptions/${deleteTargetId}`, { method: "DELETE" });
        if (res.ok) {
          await fetchSubscriptions();
          toast.success("Suscripción eliminada");
        } else {
          toast.error("Error al eliminar");
        }
      } finally {
        setDeleting(false);
        setDeleteTargetId(null);
      }
    },
    [deleteTargetId, fetchSubscriptions, toast]
  );

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
    setSearchQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setPage(1);
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
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        <p className="text-sm text-muted-foreground">Cargando suscripciones...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6 sm:mb-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
            Gastos y suscripciones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suscripciones recurrentes y compras en cuotas
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <ExportDropdown subscriptions={subscriptions} />
          <Button variant="primary" onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
            Agregar gasto
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
                ? "No hay resultados con estos filtros"
                : "Aún no tenés gastos cargados. Agregá una suscripción o una compra en cuotas."}
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
        title="Eliminar gasto"
        description="¿Eliminamos este gasto? No se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleting}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingSubscription ? "Editar gasto" : "Nuevo gasto"}
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
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      }
    >
      <SubscriptionsContent />
    </Suspense>
  );
}
