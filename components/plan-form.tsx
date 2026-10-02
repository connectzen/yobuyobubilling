"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PlanForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    const response = await fetch("/api/plans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        serviceType: String(formData.get("serviceType") ?? "hotspot"),
        durationMinutes: Number(formData.get("durationMinutes")),
        priceKes: Number(formData.get("priceKes")),
        downloadKbps: Number(formData.get("downloadKbps")),
        uploadKbps: Number(formData.get("uploadKbps")),
      }),
    });
    const payload = await response.json();
    if (!payload.success) {
      setError(payload.error ?? "Could not save plan");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-line bg-panel p-5 space-y-3">
      <h2 className="font-medium">New package</h2>
      <input name="name" placeholder="Daily 10 Mbps" required className="w-full" />
      <select name="serviceType" className="w-full">
        <option value="hotspot">Hotspot</option>
        <option value="pppoe">PPPoE</option>
      </select>
      <input name="durationMinutes" type="number" min={15} defaultValue={60} className="w-full" />
      <input name="priceKes" type="number" min={0} defaultValue={50} className="w-full" />
      <input name="downloadKbps" type="number" min={128} defaultValue={10240} className="w-full" />
      <input name="uploadKbps" type="number" min={128} defaultValue={2048} className="w-full" />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button className="btn-primary w-full" type="submit">
        Save package
      </button>
    </form>
  );
}
