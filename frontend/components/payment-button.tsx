"use client";

import { CreditCard } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { loadRazorpay } from "@/lib/razorpay";
import type { Course } from "@/lib/types";
import { designMode } from "@/lib/design-mode";

export function PaymentButton({ course }: { course: Course }) {
  async function handlePayment() {
    if (designMode) return;

    const loaded = await loadRazorpay();
    if (!loaded || !window.Razorpay) {
      alert("Unable to load Razorpay");
      return;
    }

    const payload = await apiFetch<{
      razorpay: { key: string; orderId: string; amount: number; currency: string };
    }>("/api/payment/create-order", {
      method: "POST",
      body: JSON.stringify({ courseId: course._id })
    });

    const checkout = new window.Razorpay({
      key: payload.razorpay.key,
      amount: payload.razorpay.amount,
      currency: payload.razorpay.currency,
      name: "Magnafic Academy",
      description: course.title,
      order_id: payload.razorpay.orderId,
      handler: async (response: Record<string, string>) => {
        await apiFetch("/api/payment/verify", {
          method: "POST",
          body: JSON.stringify(response)
        });
        window.location.reload();
      }
    });

    checkout.open();
  }

  return (
    <button onClick={handlePayment} className="inline-flex items-center justify-center gap-2 rounded-md bg-ocean px-4 py-2 font-semibold text-white shadow-card transition hover:-translate-y-0.5">
      <CreditCard className="h-4 w-4" />
      Buy course
    </button>
  );
}
