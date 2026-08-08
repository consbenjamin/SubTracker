import { cn } from "@/lib/utils";

/** Spinner circular. Hereda el color del texto. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-hidden
      className={cn(
        "inline-block h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
    />
  );
}

/** Estado de carga a pantalla (parcial) con mensaje opcional. */
export function LoadingState({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[40vh] flex-col items-center justify-center gap-4",
        className
      )}
    >
      <Spinner className="text-muted-foreground" />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
