"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readDeleteApiResult, routerDeleteConfirm } from "@/lib/routers/delete";

export function DeleteRouterButton({
  id,
  name,
  redirectTo = "/console/routers",
}: {
  id: string;
  name: string;
  redirectTo?: string;
}) {
  const nav = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onDelete() {
    if (!window.confirm(routerDeleteConfirm(name))) {
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/routers/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const result = readDeleteApiResult(response.status, await response.text());
      if (!result.ok) {
        setError(result.message);
        return;
      }
      nav.push(redirectTo);
      nav.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        className="btn-ghost text-red-400"
        disabled={pending}
        type="button"
        onClick={() => {
          void onDelete();
        }}
      >
        {pending ? "Deleting..." : "Delete"}
      </button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
