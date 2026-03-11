"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
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

function PurchasesContent() {
  const toast = useToast();
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
      toast.error("Error al cargar las compras");
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
        toast.success("Compra agregada");
      } else {
        const err = await res.json();
        toast.error(err.details ? "Revisá los datos" : err.error || "Error al guardar");
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
        toast.success("Compra actualizada");
      } else {
        const err = await res.json();
        toast.error(err.details ? "Revisá los datos" : err.error || "Error al actualizar");
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
          toast.success("Compra eliminada");
        } else {
          toast.error("Error al eliminar");
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
        <p className="text-sm text-muted-foreground">Cargando compras…</p>
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
            Compras
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Anotá lo que querés comprar y marcá cuando lo compraste
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
          Agregar compra
        </Button>
      </header>

      <div className="mb-8 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-[var(--card-shadow)]">
        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
        <span className="text-sm font-medium text-muted-foreground">Ver:</span>
        <div className="flex items-center gap-2">
          <Select
            id="filter-month"
            options={MONTHS}
            value={String(month)}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="min-w-[130px]"
            aria-label="Mes"
          />
          <Select
            id="filter-year"
            options={yearOptions}
            value={String(year)}
            onChange={(e) => setYear(Number(e.target.value))}
            className="min-w-[95px]"
            aria-label="Año"
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
              No hay compras para este mes
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Agregá lo que tengas planeado comprar y marcalo cuando lo compres
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
              Agregar compra
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
        title="Eliminar compra"
        description="¿Eliminamos esta compra de la lista? No se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleting}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingPurchase ? "Editar compra" : "Nueva compra"}
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
          <p className="text-sm text-muted-foreground">Cargando…</p>
        </div>
      }
    >
      <PurchasesContent />
    </Suspense>
  );
}
