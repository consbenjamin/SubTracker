import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush, type StoredSubscription } from "@/lib/push";

// web-push necesita crypto de Node, y el cron nunca debe servirse cacheado.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Zona horaria con la que se decide qué es "hoy".
 *
 * Las fechas de cobro son DATE (días sin hora). El cron corre en UTC, así que
 * sin esto, entre las 21:00 y las 24:00 de Argentina el servidor ya estaría en
 * el día siguiente y avisaría de vencimientos equivocados.
 */
const TIMEZONE = process.env.NOTIFY_TIMEZONE || "America/Argentina/Buenos_Aires";

/** "YYYY-MM-DD" de hoy en la zona configurada. */
function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

interface DueSubscription {
  id: string;
  user_id: string;
  name: string;
  next_payment_date: string;
}

function buildMessage(subs: DueSubscription[], when: "hoy" | "mañana") {
  if (subs.length === 1) {
    const [sub] = subs;
    return {
      title: when === "hoy" ? `Vence hoy: ${sub.name}` : `Pago próximo: ${sub.name}`,
      body: `El pago de ${sub.name} vence ${when}. Marcá si ya lo hiciste.`,
      url: `/subscriptions/${sub.id}?confirmDue=true&due=${encodeURIComponent(sub.next_payment_date)}`,
    };
  }

  return {
    title: when === "hoy" ? `${subs.length} pagos vencen hoy` : `${subs.length} pagos vencen mañana`,
    body: subs.map((s) => s.name).join(", "),
    url: "/dashboard",
  };
}

export async function GET(request: Request) {
  // Vercel Cron manda `Authorization: Bearer $CRON_SECRET`.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = todayIn(TIMEZONE);
  const tomorrow = nextDay(today);

  // Vencimientos de hoy y de mañana, de todas las cuentas, solo recurrentes activas.
  const { data: due, error } = await supabase
    .from("subscriptions")
    .select("id, user_id, name, next_payment_date")
    .eq("status", "active")
    .eq("payment_type", "recurring")
    .in("next_payment_date", [today, tomorrow]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!due?.length) {
    return NextResponse.json({ ok: true, today, sent: 0, reason: "sin vencimientos" });
  }

  // Agrupamos por usuario para mandar un aviso por persona, no uno por suscripción.
  const byUser = new Map<string, DueSubscription[]>();
  for (const sub of due as DueSubscription[]) {
    const list = byUser.get(sub.user_id);
    if (list) list.push(sub);
    else byUser.set(sub.user_id, [sub]);
  }

  const { data: devices } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, last_notified_on")
    .in("user_id", [...byUser.keys()]);

  let sent = 0;
  const staleIds: string[] = [];
  const notifiedIds: string[] = [];

  for (const device of devices ?? []) {
    // Ya se le avisó hoy a este dispositivo.
    if (device.last_notified_on === today) continue;

    const subs = byUser.get(device.user_id) ?? [];
    const dueToday = subs.filter((s) => s.next_payment_date.slice(0, 10) === today);
    const dueTomorrow = subs.filter((s) => s.next_payment_date.slice(0, 10) === tomorrow);

    const group = dueToday.length ? dueToday : dueTomorrow;
    if (!group.length) continue;

    const message = buildMessage(group, dueToday.length ? "hoy" : "mañana");
    const result = await sendPush(device as StoredSubscription, {
      ...message,
      tag: `due:${today}`,
    });

    if (result.ok) {
      sent += 1;
      notifiedIds.push(device.id);
    } else if (result.gone) {
      staleIds.push(device.id);
    } else {
      console.error("[cron/notify] envío fallido", device.id, result.error);
    }
  }

  if (notifiedIds.length) {
    await supabase
      .from("push_subscriptions")
      .update({ last_notified_on: today })
      .in("id", notifiedIds);
  }

  // Dispositivos dados de baja por el navegador: se limpian solos.
  if (staleIds.length) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }

  return NextResponse.json({
    ok: true,
    today,
    usuariosConVencimientos: byUser.size,
    dispositivos: devices?.length ?? 0,
    sent,
    limpiados: staleIds.length,
  });
}

/** Día siguiente a una fecha YYYY-MM-DD, sin pasar por UTC. */
function nextDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(y, m - 1, d + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}
