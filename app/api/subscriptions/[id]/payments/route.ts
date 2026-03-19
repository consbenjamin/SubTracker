import { addMonths } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  isValidSubscriptionId,
  paymentBodySchema,
} from "@/lib/validations/schemas";
import { isRateLimitedRequest } from "@/lib/rate-limit";
import { getClientIp, unauthorizedResponse } from "@/lib/api-auth";

/** Suma un mes a una fecha YYYY-MM-DD manteniendo el día (ej. 9 mar → 9 abr). */
function addOneMonth(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const next = addMonths(date, 1);
  const yy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  const dd = String(next.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function addBillingCycle(
  dateStr: string,
  billingCycle: "monthly" | "quarterly" | "yearly"
): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const monthsToAdd = billingCycle === "monthly" ? 1 : billingCycle === "quarterly" ? 3 : 12;
  const next = addMonths(date, monthsToAdd);
  const yy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  const dd = String(next.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
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
    return unauthorizedResponse(request, `/api/subscriptions/${id}/payments`);
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
    return unauthorizedResponse(request, `/api/subscriptions/${id}/payments`);
  }

  const sub = await supabase
    .from("subscriptions")
    .select(
      "id, payment_type, billing_cycle, installment_count, installments_paid, next_payment_date"
    )
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

  const paidDate = parsed.data.payment_date;

  // Idempotencia: si ya existe un pago para ese día, no insertamos duplicado.
  const existing = await supabase
    .from("payment_history")
    .select("id, subscription_id, amount, payment_date, created_at")
    .eq("subscription_id", id)
    .eq("payment_date", paidDate)
    .maybeSingle();

  let data = existing.data;
  if (!data) {
    const inserted = await supabase
      .from("payment_history")
      .insert({
        subscription_id: id,
        amount: parsed.data.amount,
        payment_date: paidDate,
      })
      .select()
      .single();

    if (inserted.error) {
      return NextResponse.json({ error: inserted.error.message }, { status: 500 });
    }
    data = inserted.data;
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

  // Para recurrentes (o legacy null): solo avanzamos si el pago corresponde al vencimiento actual.
  const paymentType = sub.data.payment_type ?? "recurring";
  if (paymentType === "recurring" && sub.data.next_payment_date === paidDate) {
    const nextDue = addBillingCycle(
      sub.data.next_payment_date,
      sub.data.billing_cycle ?? "monthly"
    );

    await supabase
      .from("subscriptions")
      .update({ next_payment_date: nextDue })
      .eq("id", id)
      .eq("user_id", user.id);
  }

  return NextResponse.json(data);
}
