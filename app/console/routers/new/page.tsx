"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewRouterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    const response = await fetch("/api/routers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: String(formData.get("name") ?? "") }),
    });
    const payload = await response.json();
    setPending(false);
    if (!payload.success) {
      setError(payload.error ?? "Could not create router");
      return;
    }
    router.push(`/console/routers/${payload.data.id}`);
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f5a524]">Identity</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Link a MikroTik</h1>
        </div>
        <button className="btn-ghost" type="button" onClick={() => router.push("/console/routers")}>
          Back
        </button>
      </div>
      <p className="mt-2 text-sm text-[#9aa3b2]">
        Name the router, then paste the provision script into Winbox Terminal.
      </p>
      <form onSubmit={onSubmit} className="card mt-8 space-y-3 p-6">
        <label>
          Router name
          <input name="name" placeholder="Manyatta AP 1" required className="mt-1 w-full" />
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" type="button" onClick={() => router.push("/console/routers")}>
            Cancel
          </button>
          <button className="btn-primary" disabled={pending} type="submit">
            {pending ? "Creating..." : "Create provision script"}
          </button>
        </div>
      </form>
    </div>
  );
}
