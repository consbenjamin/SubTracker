import { NextResponse } from "next/server";
import {
  isValidSubscriptionId,
  subscriptionUpdateBodySchema,
} from "@/lib/validations/schemas";
import { normalizeSubscriptionPayload } from "@/lib/subscriptions";
import { addBillingCycle, toDateOnly, todayDateOnly } from "@/lib/date";
import { authenticate, dbError, parseBody, NO_STORE } from "@/lib/api/route";

type Params = { params: Promise<{ id: string }> };

const invalidId = () => NextResponse.json({ error: "ID inválido" }, { status: 400 });

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isValidSubscriptionId(id)) return invalidId();

  const auth = await authenticate(request, `/api/subscriptions/${id}`);
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await auth.supabase
    .from("subscriptions")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .single();

  if (error) return dbError(error);
  return NextResponse.json(data, NO_STORE);
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isValidSubscriptionId(id)) return invalidId();

  const auth = await authenticate(request, `/api/subscriptions/${id}`, {
    rateLimit: "write",
  });
  if (auth instanceof NextResponse) return auth;

  const body = await parseBody(request, subscriptionUpdateBodySchema);
  if (body instanceof NextResponse) return body;

  const { record_payment, ...rest } = body.data;
  const formData = normalizeSubscriptionPayload(rest);

  if (record_payment) {
    const { data: current } = await auth.supabase
      .from("subscriptions")
      .select("price, next_payment_date, billing_cycle, payment_type, installment_count, installments_paid")
      .eq("id", id)
      .eq("user_id", auth.userId)
      .single();

    if (current) {
      const currentDue = toDateOnly(current.next_payment_date);
      const paymentDate = currentDue || todayDateOnly();

      // Idempotencia: evitar duplicados (mismo subscription_id + payment_date).
      const { data: existing } = await auth.supabase
        .from("payment_history")
        .select("id")
        .eq("subscription_id", id)
        .eq("payment_date", paymentDate)
        .limit(1);

      if (!existing?.length) {
        await auth.supabase.from("payment_history").insert({
          subscription_id: id,
          amount: current.price,
          payment_date: paymentDate,
        });
      }

      if (current.payment_type === "installment" && current.installment_count != null) {
        // Igual que en POST /payments: el contador sale de los pagos que hay.
        // Sumando uno, guardar dos veces con la misma fecha contaba dos cuotas
        // y registraba un solo pago.
        const { count } = await auth.supabase
          .from("payment_history")
          .select("id", { count: "exact", head: true })
          .eq("subscription_id", id);

        formData.installments_paid = Math.min(count ?? 0, current.installment_count);
      }

      // Recurrentes: avanzar a la próxima fecha solo si el usuario no la reprogramó a mano.
      const isRecurring = (current.payment_type ?? "recurring") === "recurring";
      if (isRecurring && currentDue && toDateOnly(formData.next_payment_date) === currentDue) {
        formData.next_payment_date = addBillingCycle(
          currentDue,
          current.billing_cycle ?? "monthly"
        );
      }
    }
  }

  const { data, error } = await auth.supabase
    .from("subscriptions")
    .update(formData)
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select()
    .single();

  if (error) return dbError(error);
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isValidSubscriptionId(id)) return invalidId();

  const auth = await authenticate(request, `/api/subscriptions/${id}`, {
    rateLimit: "write",
  });
  if (auth instanceof NextResponse) return auth;

  const { error } = await auth.supabase
    .from("subscriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return dbError(error);
  return NextResponse.json({ success: true });
}
