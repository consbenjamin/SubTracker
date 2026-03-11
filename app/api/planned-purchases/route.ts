import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { plannedPurchaseBodySchema } from "@/lib/validations/schemas";
import { isRateLimitedRequest } from "@/lib/rate-limit";
import { getClientIp, unauthorizedResponse } from "@/lib/api-auth";

function normalizePayload(
  payload: ReturnType<typeof plannedPurchaseBodySchema.parse>
) {
  const isCard = payload.bought && payload.payment_method === "card";
  const usesInstallments = isCard && (payload.bought_with_installments ?? false);

  return {
    name: payload.name,
    link: payload.link ?? null,
    planned_month: payload.planned_month,
    planned_year: payload.planned_year,
    bought: payload.bought ?? false,
    bought_date: payload.bought ? (payload.bought_date ?? null) : null,
    payment_method: payload.bought ? payload.payment_method ?? null : null,
    card_name: payload.bought && payload.payment_method === "card"
      ? (payload.card_name?.trim() || null)
      : null,
    bought_with_installments: usesInstallments,
    installment_count: usesInstallments
      ? (payload.installment_count ?? null)
      : null,
    installments_paid: usesInstallments
      ? (payload.installments_paid ?? 0)
      : 0,
    installments_start_next_month: usesInstallments
      ? (payload.installments_start_next_month ?? false)
      : false,
    notes: payload.notes?.trim() || null,
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return unauthorizedResponse(request, "/api/planned-purchases");
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  let query = supabase
    .from("planned_purchases")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (month) {
    const m = parseInt(month, 10);
    if (!Number.isNaN(m) && m >= 1 && m <= 12) query = query.eq("planned_month", m);
  }
  if (year) {
    const y = parseInt(year, 10);
    if (!Number.isNaN(y) && y >= 2000 && y <= 2100) query = query.eq("planned_year", y);
  }

  const { data, error } = await query;

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
    return unauthorizedResponse(request, "/api/planned-purchases");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const parsed = plannedPurchaseBodySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      { error: "Datos inválidos", details: msg },
      { status: 400 }
    );
  }

  const payload = normalizePayload(parsed.data);

  const { data, error } = await supabase
    .from("planned_purchases")
    .insert({
      ...payload,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
