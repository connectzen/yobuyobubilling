"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SubscriberActions({
  id,
  name,
  status,
}: {
  id: string;
  name: string;
  status: "active" | "expired" | "disabled";
}) {
  const nav = useRouter();
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  async function run(action: "pause" | "resume" | "delete") {
    const prompts = {
      pause: `Pause ${name}? They lose internet until you resume them. MikroTik applies this within a few seconds.`,
      resume: `Resume ${name}? MikroTik will enable this account again.`,
      delete: `Delete ${name}? This removes them from MikroTik. Payment records stay.`,
    };
    if (!window.confirm(prompts[action])) {
      return;
    }
    setPending(action);
    setError("");
    try {
      const response = await fetch(`/api/subscribers/${id}`, {
        method: action === "delete" ? "DELETE" : "PATCH",
        credentials: "same-origin",
        headers: action === "delete" ? undefined : { "content-type": "application/json" },
        body: action === "delete" ? undefined : JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setError(payload?.error ?? "Could not update this subscriber");
        return;
      }
      nav.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setPending("");
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-2">
        {status === "disabled" ? (
          <button
            className="btn-ghost px-3 py-1 text-xs"
            type="button"
            disabled={Boolean(pending)}
            onClick={() => {
              void run("resume");
            }}
          >
            {pending === "resume" ? "Resuming..." : "Resume"}
          </button>
        ) : status === "active" ? (
          <button
            className="btn-ghost px-3 py-1 text-xs"
            type="button"
            disabled={Boolean(pending)}
            onClick={() => {
              void run("pause");
            }}
          >
            {pending === "pause" ? "Pausing..." : "Pause"}
          </button>
        ) : null}
        <button
          className="btn-ghost px-3 py-1 text-xs text-red-400"
          type="button"
          disabled={Boolean(pending)}
          onClick={() => {
            void run("delete");
          }}
        >
          {pending === "delete" ? "Deleting..." : "Delete"}
        </button>
      </div>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
