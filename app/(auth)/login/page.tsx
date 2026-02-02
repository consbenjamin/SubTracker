"use client";

import { createClient } from "@/lib/supabase/client";
import { emailAuthSchema } from "@/lib/validations/schemas";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function getAuthErrorMessage(error: { message?: string } | null): string {
  if (!error?.message) return "Ha ocurrido un error";
  const msg = error.message.toLowerCase();
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials"))
    return "Email o contraseña incorrectos.";
  if (msg.includes("email not confirmed")) return "Confirma tu email antes de iniciar sesión.";
  if (msg.includes("user already registered")) return "Ya existe una cuenta con ese email.";
  if (msg.includes("password")) return "La contraseña debe tener al menos 6 caracteres.";
  return error.message;
}

function LoginContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const parsed = emailAuthSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFormError(parsed.error.errors[0]?.message ?? "Revisa los datos.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) {
          setFormError(getAuthErrorMessage(err));
          return;
        }
        router.push("/dashboard");
        router.refresh();
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) {
          setFormError(getAuthErrorMessage(err));
          return;
        }
        if (data.session) {
          router.push("/dashboard");
          router.refresh();
          return;
        }
        setFormError("");
        setMode("login");
        setPassword("");
        setFormError("Cuenta creada. Revisa tu email para confirmar tu cuenta.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (err) setFormError(err.message ?? "Error al iniciar sesión con Google.");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--background)] px-4 py-12">
      {/* Subtle background pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <Card className="relative z-10 w-full max-w-[400px] border-border/80 bg-card/95 shadow-xl backdrop-blur-sm sm:px-8 sm:py-2">
        <CardHeader className="space-y-2 pb-6 pt-8 text-center sm:pt-10">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            SubGhost
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Controla tus suscripciones en un solo lugar
          </p>
        </CardHeader>

        <CardContent className="space-y-5 pb-10 sm:pb-12">
          {error === "auth_failed" && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <p className="font-medium">Error al iniciar sesión</p>
              <p className="mt-1 text-red-700/90 dark:text-red-400/90">
                Comprueba en Supabase (Authentication → URL Configuration) que la Redirect URL incluya{" "}
                <code className="rounded bg-red-200/60 px-1 py-0.5 font-mono text-xs dark:bg-red-900/40">
                  /api/auth/callback
                </code>
              </p>
            </div>
          )}
          {error === "no_code" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
              No se recibió el código. Intenta iniciar sesión de nuevo.
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <Input
              type="email"
              label="Email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
            />
            <Input
              type="password"
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              disabled={loading}
            />
            {formError && (
              <p className="text-sm text-amber-600 dark:text-amber-400">{formError}</p>
            )}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? "..." : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground">
              <span className="bg-card px-2">o continúa con</span>
            </div>
          </div>

          <Button
            variant="secondary"
            size="lg"
            className="w-full gap-3 rounded-lg py-6 text-base font-medium"
            onClick={handleGoogleLogin}
            disabled={loading}
            type="button"
          >
            <GoogleIcon />
            Continuar con Google
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setFormError("");
            }}
            className="block w-full text-center text-sm text-muted-foreground underline hover:text-foreground"
          >
            {mode === "login"
              ? "¿No tienes cuenta? Regístrate"
              : "¿Ya tienes cuenta? Inicia sesión"}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Al continuar, aceptas nuestros términos de uso y política de privacidad.
          </p>
        </CardContent>
      </Card>

      <p className="mt-8 text-center text-xs text-muted-foreground/80">
        Inicio de sesión con email o Google
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
