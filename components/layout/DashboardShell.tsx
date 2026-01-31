"use client";

import { useState, Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isOpen={isMobile ? sidebarOpen : true}
        onClose={closeSidebar}
        isMobile={isMobile}
      />
      {/* Backdrop: solo en móvil cuando el sidebar está abierto */}
      {isMobile && sidebarOpen && (
        <button
          type="button"
          onClick={closeSidebar}
          className="fixed inset-0 z-20 bg-foreground/40 backdrop-blur-sm lg:hidden"
          aria-label="Cerrar menú"
        />
      )}
      <div className="flex min-h-screen flex-col bg-background pl-0 lg:pl-[240px]">
        <Suspense
          fallback={
            <div className="h-14 shrink-0 border-b border-border bg-background/80" />
          }
        >
          <TopBar
            onMenuClick={openSidebar}
            showMenuButton={isMobile}
          />
        </Suspense>
        <Breadcrumbs />
        <main className="min-h-full flex-1 bg-background">{children}</main>
      </div>
    </div>
  );
}
