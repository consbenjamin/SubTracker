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
    <div className="fixed bottom-4 right-4 z-50">
      <Badge variant="warning" className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        {t("offline")}
      </Badge>
    </div>
  );
}
