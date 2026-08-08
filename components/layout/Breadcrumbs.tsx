"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";

/** Segmento de la URL → clave del namespace `nav`. */
const NAV_SEGMENT_KEYS: Record<string, string> = {
  dashboard: "dashboard",
  purchases: "purchases",
  subscriptions: "subscriptions",
  new: "newSubscription",
  analytics: "analytics",
  settings: "settings",
};

const UUID_LENGTH = 36;

export function Breadcrumbs() {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");

  const segmentLabel = (segment: string) => {
    const navKey = NAV_SEGMENT_KEYS[segment];
    if (navKey) return tNav(navKey);
    if (segment.length === UUID_LENGTH) return tCommon("detail");
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  const crumbs = [
    { href: "/dashboard", label: tNav("dashboard") },
    ...(pathname === "/dashboard"
      ? []
      : pathname
          .split("/")
          .filter(Boolean)
          .map((segment, i, all) => ({
            href: `/${all.slice(0, i + 1).join("/")}`,
            label: segmentLabel(segment),
          }))),
  ];

  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex shrink-0 items-center gap-1 border-b border-border bg-background/50 py-2.5"
    >
      <ol className="mx-auto flex w-full max-w-6xl min-w-0 flex-wrap items-center gap-1 px-4 text-sm text-muted-foreground sm:px-6 lg:px-8">
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
