import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "elevated" | "outline";
}

export function Card({
  children,
  className,
  variant = "default",
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] bg-card text-card-foreground transition-[box-shadow,color] duration-200",
        "p-5",
        variant === "default" &&
          "border border-border shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)]",
        variant === "elevated" &&
          "border border-border shadow-[var(--card-shadow-hover)]",
        variant === "outline" &&
          "border border-border shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 pb-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-[15px] font-semibold leading-tight tracking-tight text-foreground sm:text-base",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardContent({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-[15px] text-card-foreground", className)} {...props}>
      {children}
    </div>
  );
}
