"use client";

import { useState } from "react";

export function CopyBlock({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("clipboard unavailable");
      }
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg bg-black/40">
      <div className="flex justify-end border-b border-white/5 px-2 py-2">
        <button className="btn-ghost px-3 py-1.5 text-xs" type="button" onClick={copy}>
          {copied ? "Copied" : label}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all p-4 text-xs leading-5">{value}</pre>
    </div>
  );
}
