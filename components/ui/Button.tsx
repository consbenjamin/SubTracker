import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-[var(--radius-sm)] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-foreground/20 disabled:pointer-events-none disabled:opacity-50";

  const variants = {
    primary:
      "bg-primary text-primary-foreground hover:opacity-90 focus-visible:ring-primary/30",
    secondary:
      "bg-muted/80 text-foreground hover:bg-muted focus-visible:ring-muted",
    danger:
      "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/30",
    ghost:
      "text-foreground hover:bg-muted/60 focus-visible:ring-muted",
    outline:
      "border border-border bg-transparent text-foreground hover:bg-muted/40 focus-visible:ring-muted",
  };

  const sizes = {
    sm: "h-8 gap-1.5 px-3 text-sm",
    md: "h-10 gap-2 px-4 text-sm",
    lg: "h-11 gap-2 px-5 text-sm",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
