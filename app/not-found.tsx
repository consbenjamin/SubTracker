import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold text-foreground">Página no encontrada</h1>
      <p className="text-muted-foreground">La ruta que buscás no existe.</p>
      <Link
        href="/"
        className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
