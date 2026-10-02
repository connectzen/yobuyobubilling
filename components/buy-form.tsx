"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/billing/duration";

type Grant = {
  username: string;
  password: string;
  expiresAt?: string;
};

export function BuyForm({
  token,
  macAddress,
  plans,
}: {
  token: string;
  macAddress: string;
  plans: { id: string; name: string; priceKes: number; durationMinutes: number }[];
}) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const [grant, setGrant] = useState<Grant | null>(null);

  useEffect(() => {
    if (!reference || grant) {
      return;
    }
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/paystack/status?reference=${reference}`);
      const payload = await response.json();
      if (payload.success && payload.data.status === "success") {
        setGrant({
          username: payload.data.username,
          password: payload.data.password,
          expiresAt: payload.data.expiresAt,
        });
        setMessage("Payment confirmed. You are connected.");
      }
      if (payload.success && payload.data.status === "failed") {
        setError("Payment failed. Try again.");
        setReference("");
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [grant, reference]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    setMessage("");
    setGrant(null);
    const response = await fetch("/api/paystack/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        name: String(formData.get("name") ?? "Hotspot customer"),
        phone: String(formData.get("phone") ?? ""),
        planId: String(formData.get("planId") ?? ""),
        macAddress,
      }),
    });
    const payload = await response.json();
    if (!payload.success) {
      setError(payload.error ?? "Could not start payment");
      return;
    }
    setReference(payload.data.reference);
    setMessage(payload.data.message);
    if (payload.data.granted) {
      setGrant({
        username: payload.data.username,
        password: payload.data.password,
        expiresAt: payload.data.expiresAt,
      });
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <input name="name" placeholder="Your name" className="w-full" />
      <input name="phone" placeholder="2547..." required className="w-full" />
      <select name="planId" required className="w-full">
        <option value="">Choose a package</option>
        {plans.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {plan.name} — KES {plan.priceKes} / {formatDuration(plan.durationMinutes)}
          </option>
        ))}
      </select>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {grant ? (
        <div className="rounded-lg border border-[#252a35] bg-[#0e1117] p-3 text-sm">
          <p>Login with your phone number.</p>
          <p className="mt-1 font-mono">User: {grant.username}</p>
          <p className="font-mono">Pass: {grant.password}</p>
          {macAddress ? (
            <p className="mt-2 text-[#9aa3b2]">This device is being opened automatically.</p>
          ) : null}
        </div>
      ) : null}
      <button className="btn-primary w-full" type="submit" disabled={Boolean(reference) && !grant}>
        {reference && !grant ? "Waiting for M-PESA..." : "Pay and connect"}
      </button>
    </form>
  );
}
