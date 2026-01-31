"use client";

import { useRouter } from "next/navigation";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function NewSubscriptionPage() {
  const router = useRouter();

  const handleSubmit = async (data: any) => {
    const response = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      router.push("/subscriptions");
    }
  };

  const handleCancel = () => {
    router.push("/subscriptions");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Nueva Suscripción</CardTitle>
        </CardHeader>
        <CardContent>
          <SubscriptionForm onSubmit={handleSubmit} onCancel={handleCancel} />
        </CardContent>
      </Card>
    </div>
  );
}
