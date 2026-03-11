"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CreditCard,
  PlusCircle,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  X,
  ShoppingBag,
} from "lucide-react";

const navGroups = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/purchases", label: "Compras planeadas", icon: ShoppingBag },
    ],
  },
  {
    label: "Suscripciones",
    items: [
      { href: "/subscriptions", label: "Todas", icon: CreditCard },
      { href: "/subscriptions/new", label: "Nueva suscripción", icon: PlusCircle },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/settings", label: "Configuración", icon: Settings },
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

export function Sidebar({ isOpen = true, onClose, isMobile = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    onClose?.();
    await fetch("/api/auth/logout", { method: "POST" });
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handleNavClick = () => {
    if (isMobile) onClose?.();
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 flex h-screen w-[240px] flex-col border-r border-border bg-[var(--sidebar)]",
        "transition-transform duration-300 ease-out",
        isMobile && "lg:translate-x-0",
        isMobile && !isOpen && "-translate-x-full"
      )}
    >
      {/* Logo + close (mobile) */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <Link
          href="/dashboard"
          onClick={handleNavClick}
          className="flex items-center gap-2 no-underline outline-none"
        >
          <Image
            src="/icons/subghost-logo.svg"
            alt="SubGhost"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-xl object-contain"
          />
          <span className="text-[17px] font-semibold tracking-tight text-foreground">
            SubGhost
          </span>
        </Link>
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href === "/subscriptions" &&
                    pathname !== "/subscriptions/new" &&
                    pathname.startsWith("/subscriptions")) ||
                  (item.href === "/settings" && pathname.startsWith("/settings"));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={handleNavClick}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors",
                        "text-foreground/90 hover:bg-foreground/5 hover:text-foreground",
                        "dark:hover:bg-white/10",
                        active && "bg-foreground/10 text-foreground dark:bg-white/15"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-[22px] w-[22px] shrink-0",
                          active ? "text-foreground" : "text-muted-foreground"
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity",
                          active && "opacity-70"
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-border p-2">
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium",
            "text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground",
            "dark:hover:bg-white/10"
          )}
        >
          <LogOut className="h-[22px] w-[22px] shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
