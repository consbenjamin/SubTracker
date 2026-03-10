"use client";

import Link from "next/link";
import Image from "next/image";
import { CreditCard, BarChart3, Bell, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Landing() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--background)]">
      {/* Fondo sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, var(--primary) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, var(--chart-1) 0%, transparent 40%)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <header className="relative z-10 border-b border-border/60 bg-background/70 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/icons/icon-192x192.png"
              alt="SubGhost"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-xl object-contain"
            />
            <span className="text-lg font-semibold tracking-tight text-foreground">
              SubGhost
            </span>
          </div>
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Iniciar sesión
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Controla tus{" "}
            <span className="bg-gradient-to-r from-[var(--chart-1)] to-[var(--chart-2)] bg-clip-text text-transparent">
              suscripciones
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Un solo lugar para ver gastos, próximos pagos y ahorrar. Sin olvidos.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/login">
              <Button variant="primary" size="lg" className="min-w-[180px] gap-2">
                Empezar gratis
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground">
              Inicio de sesión con Google · Sin tarjeta
            </p>
          </div>
        </div>

        <section className="mt-20 grid w-full max-w-4xl grid-cols-1 gap-6 px-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: CreditCard,
              title: "Todo en un lugar",
              desc: "Todas tus suscripciones con precio, ciclo y próxima fecha.",
            },
            {
              icon: BarChart3,
              title: "Analytics",
              desc: "Gráficos por categoría, ciclo y gasto mensual.",
            },
            {
              icon: Bell,
              title: "Avisos",
              desc: "Notificaciones antes de cada pago para no olvidar.",
            },
            {
              icon: Shield,
              title: "Privado y seguro",
              desc: "Tus datos en Supabase, tú decides qué guardas.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card/80 p-5 shadow-[var(--card-shadow)] backdrop-blur-sm transition-shadow hover:shadow-[var(--card-shadow-hover)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold text-foreground">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        SubGhost · Gestiona y detecta tus suscripciones
      </footer>
    </div>
  );
}
