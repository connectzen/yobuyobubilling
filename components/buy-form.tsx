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
        setMessage(
          macAddress
            ? "Payment confirmed. This phone is being opened on the network now."
            : "Payment confirmed. Open a website to finish connecting.",
        );
      }
      if (payload.success && payload.data.status === "failed") {
        setError("Payment failed. Try again.");
        setReference("");
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [grant, macAddress, reference]);

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
        phone: String(formData.get("mpesa") ?? ""),
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
    <form onSubmit={onSubmit} className="mt-6 space-y-3" autoComplete="off">
      <label className="text-sm">
        M-PESA number (start with 07)
        <input
          name="mpesa"
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          maxLength={10}
          placeholder="0712345678"
          required
          className="mt-1 w-full"
        />
      </label>
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
      {grant && macAddress ? (
        <p className="text-sm text-[#9aa3b2]">
          You can close this page and browse. If a site still asks you to sign in, open it
          again after a few seconds.
        </p>
      ) : null}
      {!macAddress ? (
        <p className="text-sm text-amber-300">
          Open this page from the Wi-Fi sign-in screen so we can see this phone’s MAC
          address and connect it automatically.
        </p>
      ) : null}
      <button className="btn-primary w-full" type="submit" disabled={Boolean(reference) && !grant}>
        {reference && !grant ? "Waiting for M-PESA..." : "Pay and connect"}
      </button>
    </form>
  );
}
