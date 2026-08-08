"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  const t = useTranslations("pagination");

  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label={t("label")}
      className={cn("flex items-center justify-center gap-2 py-6", className)}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        {t("prev")}
      </Button>
      <span className="min-w-[8rem] text-center text-sm text-muted-foreground">
        {t("pageOf", { page, totalPages })}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="gap-1"
      >
        {t("next")}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
