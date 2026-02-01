import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select("name, category")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const names = new Set<string>();
  const categories = new Set<string>();

  for (const sub of subscriptions ?? []) {
    if (sub.name?.toLowerCase().includes(q)) {
      names.add(sub.name);
    }
    if (sub.category?.toLowerCase().includes(q)) {
      categories.add(sub.category);
    }
  }

  const suggestions = [
    ...Array.from(names).map((name) => ({ type: "name" as const, value: name })),
    ...Array.from(categories).map((cat) => ({
      type: "category" as const,
      value: cat,
    })),
  ].slice(0, 8);

  return NextResponse.json({ suggestions });
}
