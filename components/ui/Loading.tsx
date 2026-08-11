import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

/* ─────────────────────────── Esqueletos ─────────────────────────── */

/**
 * Bloque gris que ocupa el lugar del contenido que está por llegar.
 *
 * Se usan esqueletos en vez de un spinner porque, al tener la forma de lo que
 * viene, la espera se percibe más corta y la pantalla no salta cuando llegan
 * los datos.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-muted", className)} />;
}

/** Cabecera de página: título y subtítulo. */
export function SkeletonHeader() {
  return (
    <div className="mb-6 space-y-2 sm:mb-10">
      <Skeleton className="h-7 w-48 sm:h-8" />
      <Skeleton className="h-4 w-64 bg-muted/70" />
    </div>
  );
}

/** Fila de tarjetas de métrica del dashboard y de analytics. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} variant="outline" className="h-full">
          <div className="flex h-full items-start justify-between gap-4 sm:min-h-[88px]">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-24 bg-muted/70" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/** Grilla de tarjetas, con la misma forma que SubscriptionCard. */
export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} variant="outline" className="h-full">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 w-16 shrink-0 rounded-md" />
            </div>
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-3/4 bg-muted/70" />
            <Skeleton className="h-5 w-20 rounded-md bg-muted/70" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/** Bloque alto para gráficos. */
export function SkeletonChart({ className }: { className?: string }) {
  return (
    <Card variant="outline" className={className}>
      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-[280px] w-full bg-muted/60" />
      </div>
    </Card>
  );
}

/** Lista de filas simples (historial de pagos, próximos vencimientos). */
export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <Card variant="outline">
      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="divide-y divide-border">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-20 bg-muted/70" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ─────────────────────── Arranque de la app ─────────────────────── */

/**
 * El fantasma de la marca.
 *
 * Se dibuja inline y no con el SVG del logo porque ese trae un recuadro oscuro
 * de fondo: acá el fantasma flota suelto, y los ojos y la boca toman el color
 * de fondo de la página para que funcionen en tema claro y oscuro.
 */
function GhostMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 192 192" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id="ghost-loading-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <path
        d="M96 32c-26.5 0-48 21.5-48 48v52c0 9.9 8.7 17.1 18.4 15.4l14.9-2.6a8 8 0 0 1 4.5.5l10.6 4.8a8 8 0 0 0 6.7 0l10.6-4.8a8 8 0 0 1 4.5-.5l14.9 2.6C135.3 149.1 144 141.9 144 132V80c0-26.5-21.5-48-48-48Z"
        fill="url(#ghost-loading-gradient)"
      />
      <circle cx="76" cy="86" r="9" fill="var(--background)" />
      <circle cx="116" cy="86" r="9" fill="var(--background)" />
      <path
        d="M80 116c4.5 6.5 10.4 10 16 10s11.5-3.5 16-10"
        fill="none"
        stroke="var(--background)"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Carga de pantalla completa, para cuando todavía no hay layout que imitar:
 * el arranque de la app y la verificación de sesión.
 */
export function AppLoading({ message }: { message?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4"
    >
      <GhostMark className="ghost-float h-14 w-14" />
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="ghost-dot h-1.5 w-1.5 rounded-full bg-muted-foreground"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </div>
      <span className="sr-only">{message ?? "Cargando"}</span>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
