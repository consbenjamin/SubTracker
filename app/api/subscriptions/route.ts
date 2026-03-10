import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { subscriptionBodySchema } from "@/lib/validations/schemas";
import { isRateLimitedRequest } from "@/lib/rate-limit";
import { getClientIp, unauthorizedResponse } from "@/lib/api-auth";

function normalizeSubscriptionPayload(payload: ReturnType<typeof subscriptionBodySchema.parse>) {
  if (payload.payment_type === "installment") {
    return {
      ...payload,
      billing_cycle: "monthly" as const,
      installment_count: payload.installment_count ?? null,
      installments_paid: payload.installments_paid ?? 0,
      total_amount: payload.total_amount ?? null,
    };
  }

  return {
    ...payload,
    payment_type: "recurring" as const,
    installment_count: null,
    installments_paid: 0,
    total_amount: null,
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return unauthorizedResponse(request, "/api/subscriptions");
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("next_payment_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimitedRequest(ip, "api")) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Intenta más tarde." },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return unauthorizedResponse(request, "/api/subscriptions");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const parsed = subscriptionBodySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      { error: "Datos inválidos", details: msg },
      { status: 400 }
    );
  }

  const normalizedPayload = normalizeSubscriptionPayload(parsed.data);

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      ...normalizedPayload,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
