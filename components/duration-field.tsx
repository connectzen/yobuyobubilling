"use client";

import { useEffect, useId, useState } from "react";
import {
  durationToMinutes,
  formatDuration,
  minutesToDuration,
  type DurationUnit,
} from "@/lib/billing/duration";

const UNITS: { unit: DurationUnit; label: string }[] = [
  { unit: "days", label: "Days" },
  { unit: "hours", label: "Hours" },
  { unit: "minutes", label: "Minutes" },
];

export function DurationField({
  minutes,
  onChange,
}: {
  minutes: number;
  onChange: (minutes: number) => void;
}) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const selected = minutesToDuration(minutes);
  const [amount, setAmount] = useState(String(selected.amount));
  const [unit, setUnit] = useState<DurationUnit>(selected.unit);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    const next = minutesToDuration(minutes);
    setAmount(String(next.amount));
    setUnit(next.unit);
    setError("");
  }, [open, minutes]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  function preview(): string {
    try {
      return formatDuration(durationToMinutes(Number(amount), unit));
    } catch {
      return "";
    }
  }

  function apply() {
    try {
      onChange(durationToMinutes(Number(amount), unit));
      setOpen(false);
    } catch {
      setError("Enter a whole number of days, hours, or minutes.");
    }
  }

  return (
    <div>
      <span className="text-[13px] text-[#9aa3b2]">Duration</span>
      <button
        className="mt-1 flex w-full items-center justify-between rounded-[10px] border border-[#252a35] bg-[#0e1117] px-3 py-2.5 text-left text-sm text-[#eef0f4]"
        type="button"
        onClick={() => setOpen(true)}
      >
        <span>{formatDuration(minutes)}</span>
        <span className="text-xs text-[#6f7887]">Change</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="card w-full max-w-sm p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={titleId} className="text-lg font-semibold text-[#eef0f4]">
              Package duration
            </h3>
            <p className="mt-1 text-sm text-[#9aa3b2]">
              Choose days, hours, or minutes, then enter how long the package lasts.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {UNITS.map((item) => (
                <button
                  key={item.unit}
                  type="button"
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    unit === item.unit
                      ? "bg-[#f5a524] text-[#16130c]"
                      : "border border-[#252a35] bg-[#0e1117] text-[#c5cad3]"
                  }`}
                  onClick={() => setUnit(item.unit)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <label className="mt-4 block">
              {unit === "days" ? "Days" : unit === "hours" ? "Hours" : "Minutes"}
              <input
                className="mt-1 w-full"
                type="number"
                min={1}
                step={1}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                autoFocus
              />
            </label>

            {preview() ? (
              <p className="mt-3 text-sm text-[#f5a524]">This package lasts {preview()}.</p>
            ) : null}
            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

            <div className="mt-5 flex gap-2">
              <button className="btn-ghost flex-1" type="button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary flex-1" type="button" onClick={apply}>
                Use duration
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
