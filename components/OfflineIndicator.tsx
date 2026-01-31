"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge variant="warning" className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        Modo offline
      </Badge>
    </div>
  );
}
