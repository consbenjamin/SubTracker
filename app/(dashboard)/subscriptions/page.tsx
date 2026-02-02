"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Subscription, SubscriptionFormData } from "@/types";
import { LazySubscriptionCard } from "@/components/subscriptions/LazySubscriptionCard";
import { SubscriptionFilters } from "@/components/subscriptions/SubscriptionFilters";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";
import { Button } from "@/components/ui/Button";
import { ExportDropdown } from "@/components/ui/ExportDropdown";
import { useToast } from "@/lib/contexts/ToastContext";

const PAGE_SIZE = 12;

function SubscriptionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
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
    setSearchQuery(searchParams.get("q") ?? "");
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

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("¿Estás seguro de que quieres eliminar esta suscripción?")) return;
      const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchSubscriptions();
        toast.success("Suscripción eliminada");
      } else {
        toast.error("Error al eliminar");
      }
    },
    [fetchSubscriptions, toast]
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
        const matchesSearch =
          sub.name.toLowerCase().includes(q) ||
          (sub.category ?? "").toLowerCase().includes(q);
        const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Suscripciones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona todas tus suscripciones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportDropdown subscriptions={subscriptions} />
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            Nueva suscripción
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
                ? "No se encontraron suscripciones con estos filtros"
                : "No hay suscripciones. Añade tu primera suscripción."}
            </p>
          </div>
        ) : (
          paginatedSubscriptions.map((subscription) => (
            <LazySubscriptionCard
              key={subscription.id}
              subscription={subscription}
              onEdit={handleEdit}
              onDelete={handleDelete}
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

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingSubscription ? "Editar Suscripción" : "Nueva Suscripción"}
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
