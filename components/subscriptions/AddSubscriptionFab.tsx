"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";
import { createSubscription } from "@/lib/hooks/useSubscriptions";
import { useOnlineStatus } from "@/lib/hooks/useOfflineStorage";
import { useToast } from "@/lib/contexts/ToastContext";
import type { SubscriptionFormData } from "@/types";

/** Pantallas donde el botón sobra porque ya hay un formulario a la vista. */
const HIDDEN_ON = ["/subscriptions/new", "/settings"];

/**
 * Acceso rápido para agregar un gasto desde cualquier pantalla.
 *
 * Al crear avisa al resto de instancias de `useSubscriptions`, así la lista que
 * esté visible detrás del modal se actualiza sola.
 */
export function AddSubscriptionFab() {
  const t = useTranslations("subscriptions");
  const pathname = usePathname();
  const toast = useToast();
  const isOnline = useOnlineStatus();
  const [open, setOpen] = useState(false);

  // Sin conexión no se puede guardar: mejor no ofrecer la acción.
  if (!isOnline || HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const handleCreate = async (data: SubscriptionFormData) => {
    if (!(await createSubscription(data))) return toast.error(t("errorCreate"));
    setOpen(false);
    toast.success(t("subscriptionCreated"));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("addExpense")}
        title={t("addExpense")}
        className={[
          // Por debajo del z-50 del modal, para que el overlay lo tape al abrirse.
          "fixed right-5 z-40 sm:right-6",
          "flex h-14 w-14 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground",
          "shadow-[0_4px_16px_rgba(0,0,0,0.18)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.5)]",
          "transition-[transform,box-shadow,opacity] duration-200",
          "hover:opacity-90 hover:shadow-[0_6px_20px_rgba(0,0,0,0.22)]",
          "active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
        ].join(" ")}
        // Respeta la barra de gestos del iPhone con la app instalada.
        style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <Plus className="h-6 w-6" aria-hidden />
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={t("newExpense")}>
        <SubscriptionForm onSubmit={handleCreate} onCancel={() => setOpen(false)} />
      </Modal>
    </>
  );
}
