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

/**
 * Cada cuántos días se repite el recordatorio de vencidas.
 *
 * Una suscripción vencida lo sigue estando hasta que el usuario confirma el
 * pago: avisar a diario sería spam y termina en que se ignoran los avisos.
 */
const OVERDUE_REMINDER_DAYS = 7;

interface DueSubscription {
  id: string;
  user_id: string;
  name: string;
  next_payment_date: string;
}

type Reason = "hoy" | "mañana" | "vencidas";

/** Días enteros entre dos fechas YYYY-MM-DD. */
function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000
  );
}

function buildMessage(subs: DueSubscription[], reason: Reason, today: string) {
  const detail = (sub: DueSubscription) =>
    `/subscriptions/${sub.id}?confirmDue=true&due=${encodeURIComponent(sub.next_payment_date)}`;

  if (reason === "vencidas") {
    if (subs.length === 1) {
      const [sub] = subs;
      const days = daysBetween(sub.next_payment_date.slice(0, 10), today);
      return {
        title: `Pago vencido: ${sub.name}`,
        body:
          days === 1
            ? `${sub.name} venció ayer y sigue sin confirmar.`
            : `${sub.name} venció hace ${days} días y sigue sin confirmar.`,
        url: detail(sub),
      };
    }
    return {
      title: `${subs.length} pagos vencidos`,
      body: `Sin confirmar: ${subs.map((s) => s.name).join(", ")}`,
      url: "/dashboard",
    };
  }

  if (subs.length === 1) {
    const [sub] = subs;
    return {
      title: reason === "hoy" ? `Vence hoy: ${sub.name}` : `Pago próximo: ${sub.name}`,
      body: `El pago de ${sub.name} vence ${reason}. Marcá si ya lo hiciste.`,
      url: detail(sub),
    };
  }

  return {
    title:
      reason === "hoy" ? `${subs.length} pagos vencen hoy` : `${subs.length} pagos vencen mañana`,
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

  // Todo lo que vence hasta mañana (incluye lo ya vencido), solo recurrentes activas.
  const { data: due, error } = await supabase
    .from("subscriptions")
    .select("id, user_id, name, next_payment_date")
    .eq("status", "active")
    .eq("payment_type", "recurring")
    .lte("next_payment_date", tomorrow);

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

  const { data: devices, error: devicesError } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, last_notified_on, last_overdue_notified_on")
    .in("user_id", [...byUser.keys()]);

  // Sin esto, si falta la tabla o falla la consulta, el cron respondía
  // "ok, 0 enviados" y no había forma de saber por qué no llegaba nada.
  if (devicesError) {
    return NextResponse.json(
      { error: `No se pudieron leer los dispositivos: ${devicesError.message}` },
      { status: 500 }
    );
  }

  if (!devices?.length) {
    return NextResponse.json({
      ok: true,
      today,
      sent: 0,
      reason: "no hay dispositivos suscritos a notificaciones",
    });
  }

  let sent = 0;
  const staleIds: string[] = [];
  const notifiedIds: string[] = [];
  const overdueNotifiedIds: string[] = [];

  for (const device of devices) {
    // Ya se le avisó hoy a este dispositivo, sea por el motivo que sea.
    if (device.last_notified_on === today) continue;

    const subs = byUser.get(device.user_id) ?? [];
    const dueToday = subs.filter((s) => s.next_payment_date.slice(0, 10) === today);
    const dueTomorrow = subs.filter((s) => s.next_payment_date.slice(0, 10) === tomorrow);
    const overdue = subs.filter((s) => s.next_payment_date.slice(0, 10) < today);

    // Las vencidas se recuerdan cada OVERDUE_REMINDER_DAYS, no todos los días.
    const overdueIsDue =
      overdue.length > 0 &&
      (!device.last_overdue_notified_on ||
        daysBetween(device.last_overdue_notified_on, today) >= OVERDUE_REMINDER_DAYS);

    // Lo inmediato manda: primero lo que vence hoy, después mañana, y recién
    // entonces el recordatorio de lo vencido.
    let reason: Reason;
    let group: DueSubscription[];
    if (dueToday.length) {
      reason = "hoy";
      group = dueToday;
    } else if (dueTomorrow.length) {
      reason = "mañana";
      group = dueTomorrow;
    } else if (overdueIsDue) {
      reason = "vencidas";
      group = overdue;
    } else {
      continue;
    }

    const message = buildMessage(group, reason, today);
    const result = await sendPush(device as StoredSubscription, {
      ...message,
      tag: `${reason}:${today}`,
    });

    if (result.ok) {
      sent += 1;
      notifiedIds.push(device.id);
      if (reason === "vencidas") overdueNotifiedIds.push(device.id);
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

  // Solo los que recibieron el recordatorio de vencidas reinician ese contador.
  if (overdueNotifiedIds.length) {
    await supabase
      .from("push_subscriptions")
      .update({ last_overdue_notified_on: today })
      .in("id", overdueNotifiedIds);
  }

  // Dispositivos dados de baja por el navegador: se limpian solos.
  if (staleIds.length) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }

  return NextResponse.json({
    ok: true,
    today,
    usuariosConVencimientos: byUser.size,
    dispositivos: devices.length,
    sent,
    porVencidas: overdueNotifiedIds.length,
    limpiados: staleIds.length,
  });
}

/** Día siguiente a una fecha YYYY-MM-DD, sin pasar por UTC. */
function nextDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(y, m - 1, d + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}
