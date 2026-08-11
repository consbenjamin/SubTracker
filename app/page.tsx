"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Landing } from "@/components/Landing";
import { AppLoading } from "@/components/ui/Loading";

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <AppLoading />
      </div>
    );
  }

  return <Landing />;
}
