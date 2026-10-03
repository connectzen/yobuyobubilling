"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SessionRemove({ id, name }: { id: string; name: string }) {
  const nav = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm(`Remove ${name} from MikroTik? Their internet stops when the router applies it.`)) {
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/sessions/${id}`, { method: "DELETE", credentials: "same-origin" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setError(payload?.error ?? "Could not remove this session");
        return;
      }
      nav.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button className="btn-ghost px-3 py-1 text-xs text-red-400" type="button" disabled={pending} onClick={() => void remove()}>
        {pending ? "Removing..." : "Remove"}
      </button>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
