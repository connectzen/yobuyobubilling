"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Router } from "@/lib/db";

export function RouterSetup({
  router,
  oneLiner,
}: {
  router: Router;
  oneLiner: string;
}) {
  const nav = useRouter();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [wan, setWan] = useState(router.wan_interface ?? "");
  const [lan, setLan] = useState(router.lan_interface ?? "");
  const [hotspot, setHotspot] = useState(router.hotspot_enabled);
  const [pppoe, setPppoe] = useState(router.pppoe_enabled);
  const [antiShare, setAntiShare] = useState(router.anti_share_enabled);
  const ports = useMemo(() => router.interfaces ?? [], [router.interfaces]);

  async function applyConfig() {
    setPending(true);
    setError("");
    const response = await fetch(`/api/routers/${router.id}/configure`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wanInterface: wan, lanInterface: lan, hotspot, pppoe, antiShare }),
    });
    const payload = await response.json();
    setPending(false);
    if (!payload.success) {
      setError(payload.error ?? "Could not queue configuration");
      return;
    }
    nav.refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-accent">MikroTik setup</p>
        <h1 className="mt-2 text-2xl font-semibold">{router.name}</h1>
        <p className="text-sm text-zinc-400">
          Status: {router.status}
          {router.board_name ? ` · ${router.board_name}` : ""}
          {router.ros_version ? ` · ROS ${router.ros_version}` : ""}
        </p>
      </div>

      <section className="rounded-xl border border-line bg-panel p-5">
        <h2 className="font-medium">1. Provision</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Open Winbox → New Terminal, paste this one-liner, and press Enter. The
          router downloads its agent and starts polling Yobuyobu.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-black/40 p-4 text-xs">{oneLiner}</pre>
        <button
          className="btn-ghost mt-3"
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(oneLiner);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy script"}
        </button>
        {router.status === "pending" ? (
          <p className="mt-3 text-sm text-amber-300">Waiting for the router to check in...</p>
        ) : (
          <p className="mt-3 text-sm text-emerald-400">Router is talking to Yobuyobu.</p>
        )}
      </section>

      <section className="rounded-xl border border-line bg-panel p-5">
        <h2 className="font-medium">2. Ports and services</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Select WAN and LAN, then choose Hotspot, PPPoE, and unit sharing.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm">
            WAN
            <select className="mt-1 w-full" value={wan} onChange={(event) => setWan(event.target.value)}>
              <option value="">Select port</option>
              {ports.map((port) => (
                <option key={`wan-${port.name}`} value={port.name}>
                  {port.name} ({port.type})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            LAN
            <select className="mt-1 w-full" value={lan} onChange={(event) => setLan(event.target.value)}>
              <option value="">Select port</option>
              {ports.map((port) => (
                <option key={`lan-${port.name}`} value={port.name}>
                  {port.name} ({port.type})
                </option>
              ))}
            </select>
          </label>
        </div>
        {ports.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Ports appear after the router comes online.</p>
        ) : null}
        <div className="mt-4 flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input checked={hotspot} type="checkbox" onChange={(event) => setHotspot(event.target.checked)} />
            Hotspot
          </label>
          <label className="flex items-center gap-2">
            <input checked={pppoe} type="checkbox" onChange={(event) => setPppoe(event.target.checked)} />
            PPPoE
          </label>
          <label className="flex items-center gap-2">
            <input checked={antiShare} type="checkbox" onChange={(event) => setAntiShare(event.target.checked)} />
            Unit sharing
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        <button className="btn-primary mt-4" disabled={pending} type="button" onClick={applyConfig}>
          {pending ? "Uploading..." : "Upload configuration"}
        </button>
      </section>
    </div>
  );
}
