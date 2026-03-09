import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  isValidSubscriptionId,
  paymentBodySchema,
} from "@/lib/validations/schemas";
import { isRateLimitedRequest } from "@/lib/rate-limit";

function addOneMonth(dateStr: string): string {
  const date = new Date(dateStr);
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
}

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidSubscriptionId(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await supabase
    .from("subscriptions")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (sub.error || !sub.data) {
    return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("payment_history")
    .select("*")
    .eq("subscription_id", id)
    .order("payment_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidSubscriptionId(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await supabase
    .from("subscriptions")
    .select("id, payment_type, installment_count, installments_paid, next_payment_date")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (sub.error || !sub.data) {
    return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const parsed = paymentBodySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      { error: "Datos inválidos", details: msg },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("payment_history")
    .insert({
      subscription_id: id,
      amount: parsed.data.amount,
      payment_date: parsed.data.payment_date,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (
    sub.data.payment_type === "installment" &&
    sub.data.installment_count != null
  ) {
    const nextPaid = Math.min(
      (sub.data.installments_paid ?? 0) + 1,
      sub.data.installment_count
    );

    await supabase
      .from("subscriptions")
      .update({
        installments_paid: nextPaid,
        next_payment_date:
          nextPaid < sub.data.installment_count
            ? addOneMonth(sub.data.next_payment_date)
            : parsed.data.payment_date,
      })
      .eq("id", id)
      .eq("user_id", user.id);
  }

  return NextResponse.json(data);
}
