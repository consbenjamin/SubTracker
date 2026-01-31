import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { SubscriptionFormData } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { record_payment, ...formData } = body as SubscriptionFormData & {
    record_payment?: boolean;
  };

  if (record_payment) {
    const { data: current } = await supabase
      .from("subscriptions")
      .select("price, next_payment_date")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (current?.data) {
      const paymentDate =
        formData.next_payment_date != null
          ? new Date().toISOString().slice(0, 10)
          : current.data.next_payment_date?.toString().slice(0, 10) ?? new Date().toISOString().slice(0, 10);
      await supabase.from("payment_history").insert({
        subscription_id: params.id,
        amount: current.data.price,
        payment_date: paymentDate,
      });
    }
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .update(formData)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
