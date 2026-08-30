import { NextResponse } from "next/server";
import { isValidSubscriptionId, paymentBodySchema } from "@/lib/validations/schemas";
import { nextBillingDate, toDateOnly } from "@/lib/date";
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
    rateLimit: "write",
  });
  if (auth instanceof NextResponse) return auth;

  // `*` y no una lista: así `billing_day` llega cuando existe y no rompe
  // mientras la migración 009 no se haya corrido, en vez de fallar la consulta
  // entera por nombrar una columna que todavía no está.
  const sub = await auth.supabase
    .from("subscriptions")
    .select("*")
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
  // Ancla del ciclo. Falta mientras la migración 009 no se haya corrido: ahí
  // `nextBillingDate` usa el día de la fecha actual, que es el comportamiento
  // de siempre.
  const billingDay: number | null = sub.data.billing_day ?? null;

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
  const isNewPayment = !payment;
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
    // El contador se deriva de los pagos que hay, en vez de sumar uno cada vez
    // que entra por acá: registrar dos cuotas con la misma fecha no inserta un
    // segundo pago (son el mismo día), pero antes igual sumaba dos al contador
    // y adelantaba dos meses. Contando, el número siempre coincide con el
    // historial y una discrepancia previa se corrige sola.
    const { count } = await auth.supabase
      .from("payment_history")
      .select("id", { count: "exact", head: true })
      .eq("subscription_id", id);

    const nextPaid = Math.min(count ?? 0, sub.data.installment_count);

    const update = await auth.supabase
      .from("subscriptions")
      .update({
        installments_paid: nextPaid,
        // La fecha solo avanza con un pago nuevo: es acumulativa y no se puede
        // recalcular contando.
        ...(isNewPayment && {
          next_payment_date:
            nextPaid < sub.data.installment_count
              // Las cuotas también son mensuales y también se corrían: una
              // compra del 31 quedaba en 28 después de febrero.
              ? nextBillingDate(currentDue || paidDate, "monthly", billingDay)
              : paidDate,
        }),
      })
      .eq("id", id)
      .eq("user_id", auth.userId);

    // Sin esto el pago quedaba registrado y el plan sin avanzar, en silencio.
    if (update.error) return dbError(update.error);
  }

  // Recurrentes (o legacy null): solo avanzamos si el pago corresponde al vencimiento actual.
  if (isRecurring && currentDue === paidDate) {
    const update = await auth.supabase
      .from("subscriptions")
      .update({
        next_payment_date: nextBillingDate(
          currentDue,
          sub.data.billing_cycle ?? "monthly",
          billingDay
        ),
      })
      .eq("id", id)
      .eq("user_id", auth.userId);

    // Igual que en el plan de cuotas: sin esto el pago quedaba registrado, la
    // fecha sin avanzar y la respuesta decía que todo salió bien. Desde afuera
    // era idéntico a "confirmé y no pasó nada".
    if (update.error) return dbError(update.error);
  }

  // Se devuelve la suscripción ya actualizada, no solo el pago: quien confirma
  // necesita saber cuál es el nuevo vencimiento para decir si todavía queda
  // algo vencido, y adivinarlo en el cliente repetiría la regla de negocio.
  const fresh = await auth.supabase
    .from("subscriptions")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .single();

  return NextResponse.json({ payment, subscription: fresh.data ?? null }, NO_STORE);
}
