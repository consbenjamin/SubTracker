import { NextResponse } from "next/server";
import { plannedPurchaseBodySchema } from "@/lib/validations/schemas";
import { normalizePlannedPurchase } from "@/lib/plannedPurchases";
import { authenticate, dbError, parseBody } from "@/lib/api/route";

const PATH = "/api/planned-purchases";

/** Filtro numérico opcional del querystring, ignorado si es inválido. */
function numberParam(value: string | null, min: number, max: number): number | null {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < min || parsed > max ? null : parsed;
}

export async function GET(request: Request) {
  const auth = await authenticate(request, PATH);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const month = numberParam(searchParams.get("month"), 1, 12);
  const year = numberParam(searchParams.get("year"), 2000, 2100);

  let query = auth.supabase
    .from("planned_purchases")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (month != null) query = query.eq("planned_month", month);
  if (year != null) query = query.eq("planned_year", year);

  const { data, error } = await query;

  if (error) return dbError(error);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const auth = await authenticate(request, PATH, { rateLimit: "write" });
  if (auth instanceof NextResponse) return auth;

  const body = await parseBody(request, plannedPurchaseBodySchema);
  if (body instanceof NextResponse) return body;

  const { data, error } = await auth.supabase
    .from("planned_purchases")
    .insert({ ...normalizePlannedPurchase(body.data), user_id: auth.userId })
    .select()
    .single();

  if (error) return dbError(error);
  return NextResponse.json(data);
}
