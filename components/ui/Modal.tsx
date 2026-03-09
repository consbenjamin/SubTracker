"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 min-h-0"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-t-[var(--radius-lg)] sm:rounded-[var(--radius-lg)] text-card-foreground shadow-xl border border-border",
          sizes[size]
        )}
        style={{ backgroundColor: "var(--card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-[var(--radius-lg)] border-b border-border px-4 py-3 sm:px-6 sm:py-4 bg-[var(--card)]">
          {title && (
            <h2 className="text-base font-semibold tracking-tight truncate pr-2 sm:text-lg">{title}</h2>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className={cn("h-8 w-8 shrink-0 p-0", title && "ml-auto")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="rounded-b-[var(--radius-lg)] border-t-0 p-4 sm:p-6" style={{ backgroundColor: "var(--card)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
