"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleLogin = async (provider: "google" | "github") => {
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (err) {
      console.error("Error logging in:", err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-3xl">SubTracker</CardTitle>
          <p className="text-center text-gray-600 dark:text-gray-400">
            Gestiona tus suscripciones olvidadas
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error === "auth_failed" && (
            <p className="rounded bg-red-100 px-3 py-2 text-center text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
              No se pudo completar el inicio de sesión. Asegúrate de que en Supabase (Authentication → URL Configuration) la Redirect URL incluya tu origen +{" "}
              <code className="break-all text-xs">/api/auth/callback</code>
              {" "}(ej. http://localhost:3000/api/auth/callback)
            </p>
          )}
          {error === "no_code" && (
            <p className="rounded bg-amber-100 px-3 py-2 text-center text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Falta el código. Vuelve a intentar con el botón de abajo.
            </p>
          )}
          <Button
            variant="primary"
            className="w-full"
            onClick={() => handleLogin("google")}
          >
            Continuar con Google
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => handleLogin("github")}
          >
            Continuar con GitHub
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
