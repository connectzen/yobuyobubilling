"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VoucherForm({
  routers,
  plans,
}: {
  routers: { id: string; name: string }[];
  plans: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    const response = await fetch("/api/vouchers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        routerId: String(formData.get("routerId") ?? ""),
        planId: String(formData.get("planId") ?? ""),
        count: Number(formData.get("count") ?? 1),
      }),
    });
    const payload = await response.json();
    if (!payload.success) {
      setError(payload.error ?? "Could not create vouchers");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-line bg-panel p-5 space-y-3">
      <h2 className="font-medium">Generate vouchers</h2>
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
      <input name="count" type="number" min={1} max={50} defaultValue={5} className="w-full" />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button className="btn-primary w-full" type="submit">Generate</button>
    </form>
  );
}
