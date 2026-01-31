import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
