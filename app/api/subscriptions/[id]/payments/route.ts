import { NextResponse } from "next/server";
import { isValidSubscriptionId, paymentBodySchema } from "@/lib/validations/schemas";
import { addBillingCycle, addMonthsDateOnly, toDateOnly } from "@/lib/date";
import { authenticate, dbError, parseBody, NO_STORE } from "@/lib/api/route";

type Params = { params: Promise<{ id: string }> };

const invalidId = () => NextResponse.json({ error: "ID inválido" }, { status: 400 });

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isValidSubscriptionId(id)) return invalidId();

  const auth = await authenticate(request, `/api/subscriptions/${id}/payments`);
  if (auth instanceof NextResponse) return auth;

  const sub = await auth.supabase
    .from("subscriptions")
    .select("id")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .single();

  if (sub.error || !sub.data) {
    return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 });
  }

  const { data, error } = await auth.supabase
    .from("payment_history")
    .select("*")
    .eq("subscription_id", id)
    .order("payment_date", { ascending: false });

  if (error) return dbError(error);
  return NextResponse.json(data, NO_STORE);
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isValidSubscriptionId(id)) return invalidId();

  const auth = await authenticate(request, `/api/subscriptions/${id}/payments`, {
    rateLimit: true,
  });
  if (auth instanceof NextResponse) return auth;

  const sub = await auth.supabase
    .from("subscriptions")
    .select("id, price, payment_type, billing_cycle, installment_count, installments_paid, next_payment_date")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .single();

  if (sub.error || !sub.data) {
    return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 });
  }

  const body = await parseBody(request, paymentBodySchema);
  if (body instanceof NextResponse) return body;

  const isRecurring = (sub.data.payment_type ?? "recurring") === "recurring";
  const currentDue = toDateOnly(sub.data.next_payment_date);

  let paidDate = body.data.payment_date;
  let insertAmount = body.data.amount;

  if (body.data.confirm_due && isRecurring) {
    const expected = toDateOnly(body.data.expected_due);
    if (!expected) {
      return NextResponse.json(
        { error: "Falta expected_due para confirmar el vencimiento" },
        { status: 400 }
      );
    }
    if (expected !== currentDue) {
      return NextResponse.json(
        { error: "Ese vencimiento ya no es el actual. Recargá la página y volvé a intentar." },
        { status: 409 }
      );
    }
    if (!currentDue) {
      return NextResponse.json(
        { error: "La suscripción no tiene próxima fecha de cobro" },
        { status: 400 }
      );
    }
    paidDate = currentDue;
    insertAmount = Number(sub.data.price);
  }

  // Idempotencia: si ya existe un pago para ese día, no insertamos duplicado.
  const { data: existing } = await auth.supabase
    .from("payment_history")
    .select("id, subscription_id, amount, payment_date, created_at")
    .eq("subscription_id", id)
    .eq("payment_date", paidDate)
    .limit(1);

  let payment = existing?.[0];
  if (!payment) {
    const inserted = await auth.supabase
      .from("payment_history")
      .insert({ subscription_id: id, amount: insertAmount, payment_date: paidDate })
      .select()
      .single();

    if (inserted.error) return dbError(inserted.error);
    payment = inserted.data;
  }

  if (!isRecurring && sub.data.installment_count != null) {
    const nextPaid = Math.min(
      (sub.data.installments_paid ?? 0) + 1,
      sub.data.installment_count
    );

    await auth.supabase
      .from("subscriptions")
      .update({
        installments_paid: nextPaid,
        next_payment_date:
          nextPaid < sub.data.installment_count
            ? addMonthsDateOnly(currentDue || paidDate, 1)
            : paidDate,
      })
      .eq("id", id)
      .eq("user_id", auth.userId);
  }

  // Recurrentes (o legacy null): solo avanzamos si el pago corresponde al vencimiento actual.
  if (isRecurring && currentDue === paidDate) {
    await auth.supabase
      .from("subscriptions")
      .update({
        next_payment_date: addBillingCycle(currentDue, sub.data.billing_cycle ?? "monthly"),
      })
      .eq("id", id)
      .eq("user_id", auth.userId);
  }

  return NextResponse.json(payment, NO_STORE);
}
