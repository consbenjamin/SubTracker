"use client";

import { useTranslations } from "next-intl";
import { WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useOfflineStorage } from "@/lib/hooks/useOfflineStorage";

export function OfflineIndicator() {
  const t = useTranslations("common");
  const { isOnline } = useOfflineStorage();

  if (isOnline) return null;

  return (
    // A la izquierda: abajo a la derecha vive el botón de agregar gasto.
    <div
      className="fixed left-4 z-50"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <Badge variant="warning" className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        {t("offline")}
      </Badge>
    </div>
  );
}
