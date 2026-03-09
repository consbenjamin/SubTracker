"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Landing } from "@/components/Landing";

const AUTH_CHECK_TIMEOUT_MS = 8000;

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const supabase = createClient();
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setChecking(false);
    }, AUTH_CHECK_TIMEOUT_MS);

    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (cancelled) return;
        setChecking(false);
        clearTimeout(timeoutId);
        if (user) router.replace("/dashboard");
      })
      .catch(() => {
        if (cancelled) return;
        setChecking(false);
        clearTimeout(timeoutId);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <Landing />;
}
