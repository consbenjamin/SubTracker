import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, dbError, parseBody } from "@/lib/api/route";

const PATH = "/api/push/subscribe";

/** Forma que devuelve `pushManager.subscribe()` en el navegador. */
const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
});

export async function POST(request: Request) {
  const auth = await authenticate(request, PATH, { rateLimit: "write" });
  if (auth instanceof NextResponse) return auth;

  const body = await parseBody(request, subscriptionSchema);
  if (body instanceof NextResponse) return body;

  // El endpoint es único: si el navegador re-suscribe, actualizamos la fila
  // en vez de duplicarla (y la reasignamos si cambió de usuario en ese equipo).
  const { error } = await auth.supabase.from("push_subscriptions").upsert(
    {
      user_id: auth.userId,
      endpoint: body.data.endpoint,
      p256dh: body.data.keys.p256dh,
      auth: body.data.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) return dbError(error);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const auth = await authenticate(request, PATH, { rateLimit: "write" });
  if (auth instanceof NextResponse) return auth;

  const body = await parseBody(request, z.object({ endpoint: z.string().url().max(2000) }));
  if (body instanceof NextResponse) return body;

  const { error } = await auth.supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", body.data.endpoint)
    .eq("user_id", auth.userId);

  if (error) return dbError(error);
  return NextResponse.json({ success: true });
}
