"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  subscriptions: "Suscripciones",
  new: "Nueva suscripción",
  analytics: "Analytics",
  settings: "Configuración",
};

function getBreadcrumbs(pathname: string): { href: string; label: string }[] {
  if (pathname === "/dashboard") {
    return [{ href: "/dashboard", label: "Dashboard" }];
  }

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { href: string; label: string }[] = [
    { href: "/dashboard", label: "Dashboard" },
  ];

  let href = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    href += `/${seg}`;
    const label =
      SEGMENT_LABELS[seg] ??
      (seg.length === 36 ? "Detalle" : seg.charAt(0).toUpperCase() + seg.slice(1));
    crumbs.push({ href, label });
  }

  return crumbs;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname);

  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex shrink-0 items-center gap-1 border-b border-border bg-background/50 py-2.5"
    >
      <ol className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-1 px-4 text-sm text-muted-foreground sm:px-6 lg:px-8">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-muted-foreground/60"
                  aria-hidden
                />
              )}
              {isLast ? (
                <span
                  className="font-medium text-foreground"
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
