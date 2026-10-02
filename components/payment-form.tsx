"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PaymentForm({
  routers,
  plans,
}: {
  routers: { id: string; name: string }[];
  plans: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    setMessage("");
    const response = await fetch("/api/paystack/initialize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        routerId: String(formData.get("routerId") ?? ""),
        planId: String(formData.get("planId") ?? ""),
      }),
    });
    const payload = await response.json();
    if (!payload.success) {
      setError(payload.error ?? "Payment failed to start");
      return;
    }
    setMessage(payload.data.message ?? "STK prompt sent");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-line bg-panel p-5 space-y-3">
      <h2 className="font-medium">Charge with Paystack</h2>
      <input name="name" placeholder="Customer name" required className="w-full" />
      <input name="phone" placeholder="2547..." required className="w-full" />
      <select name="routerId" required className="w-full">
        <option value="">Router</option>
        {routers.map((row) => (
          <option key={row.id} value={row.id}>{row.name}</option>
        ))}
      </select>
      <select name="planId" required className="w-full">
        <option value="">Package</option>
        {plans.map((row) => (
          <option key={row.id} value={row.id}>{row.name}</option>
        ))}
      </select>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      <button className="btn-primary w-full" type="submit">Send M-PESA prompt</button>
    </form>
  );
}
