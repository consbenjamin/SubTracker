"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Subscription } from "@/types";
import { LazySubscriptionCard } from "@/components/subscriptions/LazySubscriptionCard";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

export default function SubscriptionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 12;

  useEffect(() => {
    setSearchQuery(searchParams.get("q") ?? "");
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch("/api/subscriptions");
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data);
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: any) => {
    const response = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      await fetchSubscriptions();
      setIsModalOpen(false);
    }
  };

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setIsModalOpen(true);
  };

  const handleUpdate = async (data: any) => {
    if (!editingSubscription) return;

    const response = await fetch(`/api/subscriptions/${editingSubscription.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      await fetchSubscriptions();
      setIsModalOpen(false);
      setEditingSubscription(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta suscripción?")) {
      return;
    }

    const response = await fetch(`/api/subscriptions/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      await fetchSubscriptions();
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch =
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.category ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredSubscriptions.length / PAGE_SIZE));
  const paginatedSubscriptions = filteredSubscriptions.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

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
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          Nueva suscripción
        </Button>
      </header>

      <div className="mb-6 flex justify-end">
        <Select
          options={[
            { value: "all", label: "Todos los estados" },
            { value: "active", label: "Activas" },
            { value: "paused", label: "Pausadas" },
            { value: "cancelled", label: "Canceladas" },
          ]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSubscriptions.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all"
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
        onClose={() => {
          setIsModalOpen(false);
          setEditingSubscription(null);
        }}
        title={editingSubscription ? "Editar Suscripción" : "Nueva Suscripción"}
      >
        <SubscriptionForm
          subscription={editingSubscription || undefined}
          onSubmit={editingSubscription ? handleUpdate : handleCreate}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingSubscription(null);
          }}
        />
      </Modal>
    </div>
  );
}
