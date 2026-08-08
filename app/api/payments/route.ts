import { NextResponse } from "next/server";
import { authenticate, dbError } from "@/lib/api/route";

export async function GET(request: Request) {
  const auth = await authenticate(request, "/api/payments");
  if (auth instanceof NextResponse) return auth;

  const { data: subs } = await auth.supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", auth.userId);

  if (!subs?.length) return NextResponse.json([]);

  const { data, error } = await auth.supabase
    .from("payment_history")
    .select("*")
    .in("subscription_id", subs.map((s) => s.id))
    .order("payment_date", { ascending: false });

  if (error) return dbError(error);
  return NextResponse.json(data ?? []);
}
