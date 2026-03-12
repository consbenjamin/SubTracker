"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_SEGMENT_KEYS: Record<string, string> = {
  dashboard: "dashboard",
  purchases: "purchases",
  subscriptions: "subscriptions",
  new: "newSubscription",
  analytics: "analytics",
  settings: "settings",
};

function getBreadcrumbs(
  pathname: string,
  getLabel: (seg: string) => string
): { href: string; label: string }[] {
  if (pathname === "/dashboard") {
    return [{ href: "/dashboard", label: getLabel("dashboard") }];
  }

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { href: string; label: string }[] = [
    { href: "/dashboard", label: getLabel("dashboard") },
  ];

  let href = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    href += `/${seg}`;
    const label =
      NAV_SEGMENT_KEYS[seg] !== undefined
        ? getLabel(NAV_SEGMENT_KEYS[seg])
        : seg.length === 36
          ? getLabel("detail")
          : seg.charAt(0).toUpperCase() + seg.slice(1);
    crumbs.push({ href, label });
  }

  return crumbs;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const getLabel = (seg: string) =>
    seg === "detail" ? tCommon("detail") : tNav(NAV_SEGMENT_KEYS[seg] ?? seg);
  const crumbs = getBreadcrumbs(pathname, getLabel);

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
