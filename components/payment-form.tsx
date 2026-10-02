"use client";

import { useEffect, useState } from "react";
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
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (!reference) {
      return;
    }
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/paystack/status?reference=${reference}`);
      const payload = await response.json();
      if (payload.success && payload.data.status === "success") {
        setMessage(`Connected as ${payload.data.username}. The router has the grant.`);
        setReference("");
        router.refresh();
      }
      if (payload.success && payload.data.status === "failed") {
        setError("Payment failed");
        setReference("");
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [reference, router]);

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
        macAddress: String(formData.get("macAddress") ?? ""),
      }),
    });
    const payload = await response.json();
    if (!payload.success) {
      setError(payload.error ?? "Payment failed to start");
      return;
    }
    setReference(payload.data.reference);
    setMessage(payload.data.message);
    if (payload.data.granted) {
      setReference("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="card h-fit space-y-3 p-5">
      <h2 className="font-medium text-[#eef0f4]">Charge with Paystack</h2>
      <input name="name" placeholder="Customer name" required className="w-full" />
      <input name="phone" placeholder="2547..." required className="w-full" />
      <input name="macAddress" placeholder="MAC (optional, auto-connect)" className="w-full" />
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
      <button className="btn-primary w-full" type="submit">
        Send M-PESA prompt
      </button>
    </form>
  );
}
