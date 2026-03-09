"use client";

import { useEffect, useState } from "react";
import { Subscription } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LazySubscriptionCard } from "@/components/subscriptions/LazySubscriptionCard";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";
import { Button } from "@/components/ui/Button";
import { ExportDropdown } from "@/components/ui/ExportDropdown";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { differenceInDays } from "date-fns";
import { TrendingUp, Calendar, DollarSign, Bell, Loader2 } from "lucide-react";
import { useOfflineStorage } from "@/lib/hooks/useOfflineStorage";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useToast } from "@/lib/contexts/ToastContext";
import { useSettings } from "@/lib/contexts/SettingsContext";
import { UpcomingCalendar } from "@/components/dashboard/UpcomingCalendar";
import {
  getAnnualEquivalent,
  getMonthlyEquivalent,
  isSubscriptionActiveForCalculations,
} from "@/lib/subscriptions";

export default function DashboardPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "upcoming">("all");
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 9;
  const formatCurrency = useFormatCurrency();
  const { isOnline, saveSubscriptions, getSubscriptions } = useOfflineStorage();
  const { permission, requestPermission, checkUpcomingPayments } = useNotifications();
  const toast = useToast();
  const { monthlyBudget } = useSettings();

  useEffect(() => {
    if (permission === "default") {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  useEffect(() => {
    if (subscriptions.length > 0) {
      checkUpcomingPayments(subscriptions);
    }
  }, [subscriptions, checkUpcomingPayments]);

  const fetchSubscriptions = async () => {
    try {
      if (isOnline) {
        const response = await fetch("/api/subscriptions");
        if (response.ok) {
          const data = await response.json();
          setSubscriptions(data);
          await saveSubscriptions(data);
        }
      } else {
        const cached = await getSubscriptions();
        setSubscriptions(cached);
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      if (!isOnline) {
        const cached = await getSubscriptions();
        setSubscriptions(cached);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: any) => {
    if (isOnline) {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const newSub = await response.json();
        await fetchSubscriptions();
        setIsModalOpen(false);
        toast.success("Suscripción creada");
      } else {
        toast.error("Error al crear la suscripción");
      }
    } else {
      const newSub: Subscription = {
        ...data,
        id: crypto.randomUUID(),
        user_id: "offline",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await saveSubscriptions([...subscriptions, newSub]);
      setSubscriptions([...subscriptions, newSub]);
      setIsModalOpen(false);
      toast.success("Suscripción creada (guardada localmente)");
    }
  };

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setIsModalOpen(true);
  };

  const handleUpdate = async (data: any) => {
    if (!editingSubscription) return;

    if (isOnline) {
      const response = await fetch(`/api/subscriptions/${editingSubscription.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await fetchSubscriptions();
        setIsModalOpen(false);
        setEditingSubscription(null);
        toast.success("Suscripción actualizada");
      } else {
        toast.error("Error al actualizar");
      }
    } else {
      const updated = { ...editingSubscription, ...data, updated_at: new Date().toISOString() };
      const updatedList = subscriptions.map((s) =>
        s.id === editingSubscription.id ? updated : s
      );
      await saveSubscriptions(updatedList);
      setSubscriptions(updatedList);
      setIsModalOpen(false);
      setEditingSubscription(null);
      toast.success("Suscripción actualizada (guardada localmente)");
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTargetId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      if (isOnline) {
        const response = await fetch(`/api/subscriptions/${deleteTargetId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          await fetchSubscriptions();
          toast.success("Suscripción eliminada");
        } else {
          toast.error("Error al eliminar");
        }
      } else {
        const updatedList = subscriptions.filter((s) => s.id !== deleteTargetId);
        await saveSubscriptions(updatedList);
        setSubscriptions(updatedList);
        toast.success("Suscripción eliminada");
      }
    } finally {
      setDeleting(false);
      setDeleteTargetId(null);
    }
  };

  const activeSubscriptions = subscriptions.filter(isSubscriptionActiveForCalculations);
  const monthlyTotal = activeSubscriptions.reduce(
    (sum, sub) => sum + getMonthlyEquivalent(sub),
    0
  );

  const yearlyTotal = activeSubscriptions.reduce(
    (sum, sub) => sum + getAnnualEquivalent(sub),
    0
  );

  const upcomingPayments = subscriptions
    .filter((s) => {
      const days = differenceInDays(new Date(s.next_payment_date), new Date());
      return isSubscriptionActiveForCalculations(s) && days >= 0 && days <= 7;
    })
    .sort((a, b) =>
      differenceInDays(new Date(a.next_payment_date), new Date(b.next_payment_date))
    )
    .slice(0, 5);

  const filteredSubscriptions =
    filter === "all"
      ? subscriptions
      : filter === "active"
      ? subscriptions.filter(isSubscriptionActiveForCalculations)
      : subscriptions.filter((s) => {
          const days = differenceInDays(new Date(s.next_payment_date), new Date());
          return isSubscriptionActiveForCalculations(s) && days >= 0 && days <= 7;
        });

  const totalPages = Math.max(1, Math.ceil(filteredSubscriptions.length / PAGE_SIZE));
  const paginatedSubscriptions = filteredSubscriptions.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const filterTabs: { key: "all" | "active" | "upcoming"; label: string }[] = [
    { key: "all", label: "Todas" },
    { key: "active", label: "Activas" },
    { key: "upcoming", label: "Próximas" },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Cargando suscripciones...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen de tus suscripciones
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <ExportDropdown subscriptions={subscriptions} />
        </div>
      </header>

      {/* Presupuesto mensual (si está definido) */}
      {monthlyBudget != null && monthlyBudget > 0 && (
        <section className="mb-8">
          <Card variant="outline">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Presupuesto mensual
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {formatCurrency(monthlyTotal)} de {formatCurrency(monthlyBudget)} usado
                  </p>
                </div>
                <div className="min-w-[160px] flex-1 max-w-xs">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (monthlyTotal / monthlyBudget) * 100)}%`,
                        backgroundColor:
                          monthlyTotal > monthlyBudget
                            ? "var(--chart-6)"
                            : monthlyTotal / monthlyBudget > 0.8
                            ? "var(--chart-5)"
                            : "var(--chart-4)",
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                    {monthlyTotal > monthlyBudget
                      ? `${formatCurrency(monthlyTotal - monthlyBudget)} por encima del presupuesto`
                      : `${((monthlyTotal / monthlyBudget) * 100).toFixed(0)}% usado`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Stats */}
      <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card variant="outline" className="h-full">
          <div className="flex h-full min-h-[88px] items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total mensual
              </p>
              <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {formatCurrency(monthlyTotal)}
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card variant="outline" className="h-full">
          <div className="flex h-full min-h-[88px] items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Compromiso futuro
              </p>
              <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {formatCurrency(yearlyTotal)}
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card variant="outline" className="h-full">
          <div className="flex h-full min-h-[88px] items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Activas
              </p>
              <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {activeSubscriptions.length}
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card variant="outline" className="h-full">
          <div className="flex h-full min-h-[88px] items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Próximos pagos
              </p>
              <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {upcomingPayments.length}
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
              <Bell className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </section>

      {/* Upcoming payments */}
      {upcomingPayments.length > 0 && (
        <section className="mb-10">
          <Card variant="outline">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Próximos pagos (7 días)</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {upcomingPayments.map((sub) => (
                  <li
                    key={sub.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-foreground">{sub.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(sub.price)} ·{" "}
                        {new Date(sub.next_payment_date).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Calendario de vencimientos */}
      <section className="mb-10">
        <UpcomingCalendar
          subscriptions={subscriptions}
          onSubscriptionClick={handleEdit}
        />
      </section>

      {/* Filters + list */}
      <section className="min-w-0">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex w-full overflow-x-auto rounded-lg border border-border p-1 sm:w-auto">
            {filterTabs.map(({ key, label }) => (
              <Button
                key={key}
                variant={filter === key ? "primary" : "ghost"}
                size="sm"
                onClick={() => {
                  setFilter(key);
                  setPage(1);
                }}
                className="h-8 px-4 text-sm"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubscriptions.length === 0 ? (
            <Card variant="outline" className="col-span-full py-16 text-center">
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No hay suscripciones
                  {filter !== "all" ? " que coincidan con el filtro." : ". Añade tu primera suscripción."}
                </p>
              </CardContent>
            </Card>
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
      </section>

      <ConfirmDialog
        isOpen={deleteTargetId != null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar suscripción"
        description="¿Estás seguro de que quieres eliminar esta suscripción? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleting}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSubscription(null);
        }}
        title={editingSubscription ? "Editar suscripción" : "Nueva suscripción"}
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
