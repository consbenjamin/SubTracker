"use client";

import { useInView } from "@/lib/hooks/useInView";
import { SubscriptionCard, SUBSCRIPTION_CARD_MIN_HEIGHT } from "./SubscriptionCard";
import type { Subscription } from "@/types";
import { Card } from "@/components/ui/Card";

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
    <div ref={ref} className="flex h-full" style={{ minHeight: SUBSCRIPTION_CARD_MIN_HEIGHT }}>
      {inView ? (
        <SubscriptionCard
          subscription={subscription}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : (
        // `w-full min-w-0` igual que SubscriptionCard: el wrapper es flex, así
        // que sin ancho explícito el placeholder se encogía a su contenido y
        // cada tarjeta todavía fuera del viewport se dibujaba como una tira
        // vertical de 42 px en vez de ocupar la columna.
        <Card
          variant="outline"
          className="h-full w-full min-w-0 animate-pulse border-border"
          style={{ minHeight: SUBSCRIPTION_CARD_MIN_HEIGHT }}
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
