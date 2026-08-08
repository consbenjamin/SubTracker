"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Subscription, SubscriptionFormData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LazySubscriptionCard } from "@/components/subscriptions/LazySubscriptionCard";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/ui/Loading";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";
import { Button } from "@/components/ui/Button";
import { ExportDropdown } from "@/components/ui/ExportDropdown";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { TrendingUp, Calendar, DollarSign, Bell } from "lucide-react";
import { useOfflineStorage } from "@/lib/hooks/useOfflineStorage";
import { useSubscriptions } from "@/lib/hooks/useSubscriptions";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useToast } from "@/lib/contexts/ToastContext";
import { useSettings } from "@/lib/contexts/SettingsContext";
import { UpcomingCalendar } from "@/components/dashboard/UpcomingCalendar";
import { parseDateOnly } from "@/lib/date";
import {
  daysUntilPayment,
  getAnnualEquivalent,
  getMonthlyEquivalent,
  isSubscriptionActiveForCalculations,
  isUpcoming,
} from "@/lib/subscriptions";

const PAGE_SIZE = 9;
const UPCOMING_PREVIEW = 5;

type Filter = "all" | "active" | "upcoming";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof DollarSign;
}) {
  return (
    <Card variant="outline" className="h-full">
      <div className="flex h-full min-h-[88px] items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {value}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const { subscriptions, setSubscriptions, loading, create, update, remove } =
    useSubscriptions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  const formatCurrency = useFormatCurrency();
  const { isOnline, saveSubscriptions, getSubscriptions } = useOfflineStorage();
  const { permission, requestPermission, checkUpcomingPayments } = useNotifications();
  const toast = useToast();
  const { monthlyBudget } = useSettings();

  useEffect(() => {
    if (permission === "default") requestPermission();
  }, [permission, requestPermission]);

  // Con red: refrescamos la caché offline con lo último del servidor.
  useEffect(() => {
    if (!loading && isOnline && subscriptions.length) saveSubscriptions(subscriptions);
  }, [loading, isOnline, subscriptions, saveSubscriptions]);

  // Sin red y sin datos: mostramos la última copia local.
  useEffect(() => {
    if (loading || isOnline || subscriptions.length) return;
    getSubscriptions().then((cached) => {
      if (cached.length) setSubscriptions(cached);
    });
  }, [loading, isOnline, subscriptions.length, getSubscriptions, setSubscriptions]);

  useEffect(() => {
    if (subscriptions.length > 0) checkUpcomingPayments(subscriptions);
  }, [subscriptions, checkUpcomingPayments]);

  /** Las escrituras necesitan servidor: sin red avisamos en vez de guardar algo que se perdería. */
  const guardOnline = () => {
    if (isOnline) return true;
    toast.error(t("offlineWriteBlocked"));
    return false;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSubscription(null);
  };

  const handleCreate = async (data: SubscriptionFormData) => {
    if (!guardOnline()) return;
    if (!(await create(data))) return toast.error(t("errorCreate"));
    closeModal();
    toast.success(t("subscriptionCreated"));
  };

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setIsModalOpen(true);
  };

  const handleUpdate = async (data: SubscriptionFormData) => {
    if (!editingSubscription || !guardOnline()) return;
    if (!(await update(editingSubscription.id, data))) return toast.error(t("errorUpdate"));
    closeModal();
    toast.success(t("subscriptionUpdated"));
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    if (!guardOnline()) return setDeleteTargetId(null);
    setDeleting(true);
    try {
      const ok = await remove(deleteTargetId);
      toast[ok ? "success" : "error"](t(ok ? "subscriptionDeleted" : "errorDelete"));
    } finally {
      setDeleting(false);
      setDeleteTargetId(null);
    }
  };

  const activeSubscriptions = useMemo(
    () => subscriptions.filter(isSubscriptionActiveForCalculations),
    [subscriptions]
  );

  const monthlyTotal = activeSubscriptions.reduce((sum, s) => sum + getMonthlyEquivalent(s), 0);
  const yearlyTotal = activeSubscriptions.reduce((sum, s) => sum + getAnnualEquivalent(s), 0);

  const upcomingPayments = useMemo(
    () =>
      subscriptions
        .filter((s) => isUpcoming(s))
        .sort((a, b) => daysUntilPayment(a) - daysUntilPayment(b))
        .slice(0, UPCOMING_PREVIEW),
    [subscriptions]
  );

  const filteredSubscriptions = useMemo(() => {
    if (filter === "active") return activeSubscriptions;
    if (filter === "upcoming") return subscriptions.filter((s) => isUpcoming(s));
    return subscriptions;
  }, [filter, subscriptions, activeSubscriptions]);

  const totalPages = Math.max(1, Math.ceil(filteredSubscriptions.length / PAGE_SIZE));
  const paginatedSubscriptions = filteredSubscriptions.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const filterTabs: { key: Filter; label: string }[] = [
    { key: "all", label: t("filterAll") },
    { key: "active", label: t("filterActive") },
    { key: "upcoming", label: t("filterUpcoming") },
  ];

  const budgetRatio = monthlyBudget ? monthlyTotal / monthlyBudget : 0;
  const budgetColor =
    budgetRatio > 1 ? "var(--chart-6)" : budgetRatio > 0.8 ? "var(--chart-5)" : "var(--chart-4)";

  if (loading) return <LoadingState message={t("loadingSubscriptions")} className="min-h-[60vh]" />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("summary")}</p>
        </div>
        <div className="w-full sm:w-auto">
          <ExportDropdown subscriptions={subscriptions} />
        </div>
      </header>

      {monthlyBudget != null && monthlyBudget > 0 && (
        <section className="mb-8">
          <Card variant="outline">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{t("monthlyBudget")}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {formatCurrency(monthlyTotal)} {t("usedOf")}{" "}
                    {formatCurrency(monthlyBudget)} {t("used")}
                  </p>
                </div>
                <div className="min-w-[160px] flex-1 max-w-xs">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, budgetRatio * 100)}%`,
                        backgroundColor: budgetColor,
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                    {budgetRatio > 1
                      ? `${formatCurrency(monthlyTotal - monthlyBudget)} ${t("overBudget")}`
                      : `${(budgetRatio * 100).toFixed(0)}% ${t("usedPercent")}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("monthlyTotal")} value={formatCurrency(monthlyTotal)} icon={DollarSign} />
        <StatCard
          label={t("futureCommitment")}
          value={formatCurrency(yearlyTotal)}
          icon={TrendingUp}
        />
        <StatCard label={t("active")} value={activeSubscriptions.length} icon={Calendar} />
        <StatCard label={t("upcomingPayments")} value={upcomingPayments.length} icon={Bell} />
      </section>

      {upcomingPayments.length > 0 && (
        <section className="mb-10">
          <Card variant="outline">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("upcomingPayments7")}</CardTitle>
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
                        {parseDateOnly(sub.next_payment_date).toLocaleDateString("es-ES", {
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

      <section className="mb-10">
        <UpcomingCalendar subscriptions={subscriptions} onSubscriptionClick={handleEdit} />
      </section>

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
                  {t("noSubscriptions")}
                  {filter !== "all" ? ` ${t("noSubscriptionsFilter")}` : `. ${t("addFirst")}`}
                </p>
              </CardContent>
            </Card>
          ) : (
            paginatedSubscriptions.map((subscription) => (
              <LazySubscriptionCard
                key={subscription.id}
                subscription={subscription}
                onEdit={handleEdit}
                onDelete={setDeleteTargetId}
              />
            ))
          )}
        </div>

        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </section>

      <ConfirmDialog
        isOpen={deleteTargetId != null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title={t("deleteSubscription")}
        description={t("deleteConfirm")}
        confirmLabel={tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        variant="danger"
        loading={deleting}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingSubscription ? t("editSubscription") : t("newSubscription")}
      >
        <SubscriptionForm
          subscription={editingSubscription || undefined}
          onSubmit={editingSubscription ? handleUpdate : handleCreate}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}
