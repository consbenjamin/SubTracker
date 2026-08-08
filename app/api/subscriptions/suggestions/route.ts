import { NextResponse } from "next/server";
import { authenticate, dbError } from "@/lib/api/route";

const MAX_QUERY_LENGTH = 100;
const MAX_SUGGESTIONS = 8;

export async function GET(request: Request) {
  const auth = await authenticate(request, "/api/subscriptions/suggestions");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase().slice(0, MAX_QUERY_LENGTH);

  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  const { data: subscriptions, error } = await auth.supabase
    .from("subscriptions")
    .select("name, category")
    .eq("user_id", auth.userId);

  if (error) return dbError(error);

  const names = new Set<string>();
  const categories = new Set<string>();

  for (const sub of subscriptions ?? []) {
    if (sub.name?.toLowerCase().includes(q)) names.add(sub.name);
    if (sub.category?.toLowerCase().includes(q)) categories.add(sub.category);
  }

  const suggestions = [
    ...[...names].map((value) => ({ type: "name" as const, value })),
    ...[...categories].map((value) => ({ type: "category" as const, value })),
  ].slice(0, MAX_SUGGESTIONS);

  return NextResponse.json({ suggestions });
}
