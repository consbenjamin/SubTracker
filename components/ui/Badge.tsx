import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** `custom` no aplica colores: los define quien lo usa (ver categoría). */
  variant?: "default" | "success" | "warning" | "danger" | "info" | "custom";
}

export function Badge({
  variant = "default",
  className,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default:
      "bg-muted/60 text-muted-foreground border border-transparent",
    success:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
    warning:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
    danger:
      "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20",
    info:
      "bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20",
    custom: "border",
  };

  return (
    <span
      className={cn(
        // shrink-0 + whitespace-nowrap: un badge nunca debe partirse ni
        // comprimirse; al lado de un texto largo se recorta el texto, no el badge.
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
