"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { DurationField } from "@/components/duration-field";
import { mbpsToKbps } from "@/lib/billing/speed";

export function PlanForm() {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    setError("");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    let downloadKbps = 0;
    let uploadKbps = 0;
    try {
      downloadKbps = mbpsToKbps(Number(formData.get("downloadMbps")));
      uploadKbps = mbpsToKbps(Number(formData.get("uploadMbps")));
    } catch {
      setError("Enter download and upload speed in Mbps.");
      return;
    }
    setPending(true);
    const response = await fetch("/api/plans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        serviceType: String(formData.get("serviceType") ?? "hotspot"),
        durationMinutes,
        priceKes: Number(formData.get("priceKes")),
        downloadKbps,
        uploadKbps,
      }),
    });
    const payload = await response.json();
    setPending(false);
    if (!payload.success) {
      setError(payload.error ?? "Could not save plan");
      return;
    }
    setDurationMinutes(60);
    setFormKey((key) => key + 1);
    close();
    router.refresh();
  }

  return (
    <>
      <button className="btn-primary" type="button" onClick={() => setOpen(true)}>
        New package
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={close}
        >
          <form
            key={formKey}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onSubmit={onSubmit}
            onClick={(event) => event.stopPropagation()}
            className="card max-h-[90vh] w-full max-w-md overflow-y-auto p-5"
          >
            <h2 id={titleId} className="text-lg font-semibold text-[#eef0f4]">
              New package
            </h2>
            <p className="mt-1 text-sm text-[#9aa3b2]">
              Speed is in Mbps. Duration can be days, hours, or minutes.
            </p>
            <div className="mt-4 space-y-3">
              <label>
                Name
                <input name="name" placeholder="Daily 10 Mbps" required className="mt-1 w-full" />
              </label>
              <label>
                Service
                <select name="serviceType" className="mt-1 w-full">
                  <option value="hotspot">Hotspot</option>
                  <option value="pppoe">PPPoE</option>
                </select>
              </label>
              <DurationField minutes={durationMinutes} onChange={setDurationMinutes} />
              <label>
                Price (KES)
                <input name="priceKes" type="number" min={0} defaultValue={50} className="mt-1 w-full" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  Download (Mbps)
                  <input
                    name="downloadMbps"
                    type="number"
                    min={0.1}
                    step={0.1}
                    defaultValue={10}
                    required
                    className="mt-1 w-full"
                  />
                </label>
                <label>
                  Upload (Mbps)
                  <input
                    name="uploadMbps"
                    type="number"
                    min={0.1}
                    step={0.1}
                    defaultValue={2}
                    required
                    className="mt-1 w-full"
                  />
                </label>
              </div>
              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              <div className="flex gap-2 pt-1">
                <button className="btn-ghost flex-1" type="button" onClick={close}>
                  Cancel
                </button>
                <button className="btn-primary flex-1" disabled={pending} type="submit">
                  {pending ? "Saving..." : "Save package"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
