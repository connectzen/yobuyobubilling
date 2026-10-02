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
    <div className="max-w-xl">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Identity</p>
      <h1 className="mt-2 text-2xl font-semibold">Link a MikroTik</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Name the router, then paste the provision script into Winbox Terminal.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input name="name" placeholder="Manyatta AP 1" required className="w-full" />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button className="btn-primary" disabled={pending} type="submit">
          {pending ? "Creating..." : "Create provision script"}
        </button>
      </form>
    </div>
  );
}
