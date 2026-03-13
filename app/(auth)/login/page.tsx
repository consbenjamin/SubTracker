"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { emailAuthSchema } from "@/lib/validations/schemas";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

function GoogleIcon() {
  return (
    <img
      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
      alt="Google"
      className="h-5 w-5 shrink-0"
    />
  );
}

type AuthErrorKey =
  | "errorGeneric"
  | "invalidCredentials"
  | "confirmEmail"
  | "userExists"
  | "passwordMin";

function getAuthErrorKey(error: { message?: string } | null): AuthErrorKey | null {
  if (!error?.message) return "errorGeneric";
  const msg = error.message.toLowerCase();
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials"))
    return "invalidCredentials";
  if (msg.includes("email not confirmed")) return "confirmEmail";
  if (msg.includes("user already registered")) return "userExists";
  if (msg.includes("password")) return "passwordMin";
  return null;
}

function LoginContent() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
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
      setFormError(parsed.error.errors[0]?.message ?? t("checkData"));
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) {
          const key = getAuthErrorKey(err);
          setFormError(key ? t(key) : err.message);
          return;
        }
        router.push("/dashboard");
        router.refresh();
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) {
          const key = getAuthErrorKey(err);
          setFormError(key ? t(key) : err.message);
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
        setFormError(t("accountCreated"));
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
    if (err) setFormError(err.message ?? t("googleError"));
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--background)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Barra superior: selector de idioma fuera del container de login, sin superponerse */}
      <div className="relative z-10 flex shrink-0 justify-end px-4 py-3 sm:px-6 sm:py-4">
        <LocaleSwitcher className="shrink-0" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-3 py-6 sm:px-4 sm:py-8">
        <Card className="w-full max-w-[400px] border-border/80 bg-card/95 shadow-xl backdrop-blur-sm sm:px-8 sm:py-2">
          <CardHeader className="space-y-2 pb-6 pt-8 text-center sm:pt-10">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center">
            <Image
              src="/icons/subghost-logo.svg"
              alt={tCommon("appName")}
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-xl object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {tCommon("appName")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("tagline")}
          </p>
        </CardHeader>

        <CardContent className="space-y-5 pb-10 sm:pb-12">
          {error === "auth_failed" && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <p className="font-medium">{t("authFailed")}</p>
              <p className="mt-1 text-red-700/90 dark:text-red-400/90">
                {t("authFailedHint")}{" "}
                <code className="rounded bg-red-200/60 px-1 py-0.5 font-mono text-xs dark:bg-red-900/40">
                  /api/auth/callback
                </code>
              </p>
            </div>
          )}
          {error === "no_code" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
              {t("noCode")}
            </div>
          )}
          {error === "rate_limited" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
              {t("rateLimited")}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <Input
              type="email"
              label={t("email")}
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
            />
            <Input
              type="password"
              label={t("password")}
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
              {loading ? "..." : mode === "login" ? t("login") : t("signUp")}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground">
              <span className="bg-card px-2">{t("continueWith")}</span>
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
            {t("continueWithGoogle")}
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setFormError("");
            }}
            className="block w-full text-center text-sm text-muted-foreground underline hover:text-foreground"
          >
            {mode === "login" ? t("noAccount") : t("hasAccount")}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            {t("terms")}
          </p>
        </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-muted-foreground/80">
          {t("loginEmailOrGoogle")}
        </p>
      </div>
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
