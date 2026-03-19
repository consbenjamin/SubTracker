import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  isValidSubscriptionId,
  subscriptionUpdateBodySchema,
} from "@/lib/validations/schemas";
import { isRateLimitedRequest } from "@/lib/rate-limit";
import { getClientIp, unauthorizedResponse } from "@/lib/api-auth";

import { addMonths } from "date-fns";

function normalizeSubscriptionPayload(payload: ReturnType<typeof subscriptionUpdateBodySchema.parse>) {
  const { record_payment, ...rest } = payload;

  if (rest.payment_type === "installment") {
    return {
      record_payment,
      formData: {
        ...rest,
        billing_cycle: "monthly" as const,
        installment_count: rest.installment_count ?? null,
        installments_paid: rest.installments_paid ?? 0,
        total_amount: rest.total_amount ?? null,
      },
    };
  }

  return {
    record_payment,
    formData: {
      ...rest,
      payment_type: "recurring" as const,
      installment_count: null,
      installments_paid: 0,
      total_amount: null,
    },
  };
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
    return unauthorizedResponse(request, `/api/subscriptions/${id}`);
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(
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
    return unauthorizedResponse(request, `/api/subscriptions/${id}`);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const parsed = subscriptionUpdateBodySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      { error: "Datos inválidos", details: msg },
      { status: 400 }
    );
  }

  const { record_payment, formData } = normalizeSubscriptionPayload(parsed.data);

  if (record_payment) {
    const { data: current } = await supabase
      .from("subscriptions")
      .select(
        "price, next_payment_date, billing_cycle, payment_type, installment_count, installments_paid"
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (current) {
      const dueDate = current.next_payment_date?.toString().slice(0, 10);
      const paymentDate = dueDate ?? new Date().toISOString().slice(0, 10);

      // Idempotencia: evitar duplicados (mismo subscription_id + payment_date)
      const existing = await supabase
        .from("payment_history")
        .select("id")
        .eq("subscription_id", id)
        .eq("payment_date", paymentDate)
        .maybeSingle();

      if (!existing.data) {
        await supabase.from("payment_history").insert({
          subscription_id: id,
          amount: current.price,
          payment_date: paymentDate,
        });
      }

      if (
        current.payment_type === "installment" &&
        current.installment_count != null
      ) {
        formData.installments_paid = Math.min(
          (current.installments_paid ?? 0) + 1,
          current.installment_count
        );
      }

      // Para recurrentes: avanzar automáticamente a la próxima fecha
      // solo si el usuario no reprogramó manualmente el `next_payment_date`.
      const paymentType = (current.payment_type ?? "recurring") as "recurring" | "installment";
      if (paymentType === "recurring") {
        const currentDue = current.next_payment_date?.toString().slice(0, 10);
        const requestedDue = formData.next_payment_date?.toString().slice(0, 10);

        if (currentDue && requestedDue === currentDue) {
          formData.next_payment_date = addBillingCycle(
            currentDue,
            (current.billing_cycle ?? "monthly") as "monthly" | "quarterly" | "yearly"
          );
        }
      }
    }
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .update(formData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
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
    return unauthorizedResponse(request, `/api/subscriptions/${id}`);
  }

  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
