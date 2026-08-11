import { NextResponse } from "next/server";
import {
  isValidPlannedPurchaseId,
  plannedPurchaseBodySchema,
} from "@/lib/validations/schemas";
import { normalizePlannedPurchase } from "@/lib/plannedPurchases";
import { authenticate, dbError, parseBody } from "@/lib/api/route";

type Params = { params: Promise<{ id: string }> };

const invalidId = () => NextResponse.json({ error: "ID inválido" }, { status: 400 });

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isValidPlannedPurchaseId(id)) return invalidId();

  const auth = await authenticate(request, `/api/planned-purchases/${id}`);
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await auth.supabase
    .from("planned_purchases")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .single();

  if (error) return dbError(error);
  return NextResponse.json(data);
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isValidPlannedPurchaseId(id)) return invalidId();

  const auth = await authenticate(request, `/api/planned-purchases/${id}`, {
    rateLimit: "write",
  });
  if (auth instanceof NextResponse) return auth;

  const body = await parseBody(request, plannedPurchaseBodySchema);
  if (body instanceof NextResponse) return body;

  const { data, error } = await auth.supabase
    .from("planned_purchases")
    .update(normalizePlannedPurchase(body.data))
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select()
    .single();

  if (error) return dbError(error);
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isValidPlannedPurchaseId(id)) return invalidId();

  const auth = await authenticate(request, `/api/planned-purchases/${id}`, {
    rateLimit: "write",
  });
  if (auth instanceof NextResponse) return auth;

  const { error } = await auth.supabase
    .from("planned_purchases")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return dbError(error);
  return NextResponse.json({ success: true });
}
