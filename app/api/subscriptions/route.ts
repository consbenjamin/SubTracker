import { NextResponse } from "next/server";
import { subscriptionBodySchema } from "@/lib/validations/schemas";
import { normalizeSubscriptionPayload } from "@/lib/subscriptions";
import { authenticate, dbError, parseBody } from "@/lib/api/route";

const PATH = "/api/subscriptions";

export async function GET(request: Request) {
  const auth = await authenticate(request, PATH);
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await auth.supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", auth.userId)
    .order("next_payment_date", { ascending: true });

  if (error) return dbError(error);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const auth = await authenticate(request, PATH, { rateLimit: true });
  if (auth instanceof NextResponse) return auth;

  const body = await parseBody(request, subscriptionBodySchema);
  if (body instanceof NextResponse) return body;

  const { data, error } = await auth.supabase
    .from("subscriptions")
    .insert({ ...normalizeSubscriptionPayload(body.data), user_id: auth.userId })
    .select()
    .single();

  if (error) return dbError(error);
  return NextResponse.json(data);
}
