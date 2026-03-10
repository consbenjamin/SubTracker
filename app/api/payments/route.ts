import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { unauthorizedResponse } from "@/lib/api-auth";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return unauthorizedResponse(request, "/api/payments");
  }

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id);

  if (!subs?.length) {
    return NextResponse.json([]);
  }

  const ids = subs.map((s) => s.id);
  const { data, error } = await supabase
    .from("payment_history")
    .select("*")
    .in("subscription_id", ids)
    .order("payment_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
