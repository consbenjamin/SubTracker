"use client";

import { useInView } from "@/lib/hooks/useInView";
import { SubscriptionCard } from "./SubscriptionCard";
import type { Subscription } from "@/types";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface LazySubscriptionCardProps {
  subscription: Subscription;
  onEdit: (subscription: Subscription) => void;
  onDelete: (id: string) => void;
}

/**
 * Renders a placeholder until the card enters the viewport, then renders SubscriptionCard.
 */
export function LazySubscriptionCard({
  subscription,
  onEdit,
  onDelete,
}: LazySubscriptionCardProps) {
  const { ref, inView } = useInView({ rootMargin: "120px", threshold: 0 });

  return (
    <div ref={ref} className="min-h-[140px]">
      {inView ? (
        <SubscriptionCard
          subscription={subscription}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : (
        <Card
          variant="outline"
          className={cn(
            "animate-pulse border-border",
            "h-full min-h-[140px]"
          )}
        >
          <div className="flex flex-col gap-3">
            <div className="h-5 w-2/3 rounded bg-muted/50" />
            <div className="h-7 w-1/2 rounded bg-muted/50" />
            <div className="mt-2 h-4 w-3/4 rounded bg-muted/40" />
          </div>
        </Card>
      )}
    </div>
  );
}
