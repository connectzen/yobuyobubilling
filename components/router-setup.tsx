"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Router } from "@/lib/db";
import { CopyBlock } from "@/components/copy-block";
import { customerLanPorts, normalizeRouterPorts } from "@/lib/mikrotik/services";
import { readConfigureApiResult, uploadBlockedReason } from "@/lib/mikrotik/setup-ui";

export function RouterSetup({
  router,
  oneLiner,
  buyUrl,
}: {
  router: Router;
  oneLiner: string;
  buyUrl: string;
}) {
  const nav = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const [wan, setWan] = useState(router.wan_interface ?? "");
  const [hotspot, setHotspot] = useState(
    router.status === "configured" ? router.hotspot_enabled : true,
  );
  const [pppoe, setPppoe] = useState(
    router.status === "configured" ? router.pppoe_enabled : true,
  );
  const [antiShare, setAntiShare] = useState(
    router.status === "configured" ? router.anti_share_enabled : true,
  );
  const ports = useMemo(
    () => normalizeRouterPorts(router.interfaces),
    [router.interfaces],
  );
  const customerPorts = useMemo(() => customerLanPorts(wan, ports), [wan, ports]);
  const connected = ports.length > 0;
  const blocked = uploadBlockedReason({
    connected,
    wan,
    customerPortCount: customerPorts.length,
    hotspot,
    pppoe,
  });

  useEffect(() => {
    if (connected) {
      return;
    }
    const timer = window.setInterval(() => nav.refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [connected, nav]);

  async function applyConfig() {
    if (blocked) {
      setSuccess("");
      setError(blocked);
      return;
    }
    setPending(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/routers/${router.id}/configure`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wanInterface: wan, hotspot, pppoe, antiShare }),
      });
      const result = readConfigureApiResult(response.status, await response.text());
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSuccess(result.message);
      nav.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f5a524]">
            MikroTik setup
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{router.name}</h1>
          <p className="mt-2 text-sm text-[#9aa3b2]">
            Status: {router.status}
            {router.board_name ? ` · ${router.board_name}` : ""}
            {router.ros_version ? ` · ROS ${router.ros_version}` : ""}
          </p>
        </div>
        <Link className="btn-ghost" href="/console/routers">
          Back to routers
        </Link>
      </div>

      <section className="card p-5">
        <h2 className="font-medium">1. Provision</h2>
        <p className="mt-1 text-sm text-[#9aa3b2]">
          Open Winbox → New Terminal, copy this one-liner, paste it, and press Enter. The
          router downloads its agent and starts polling Yobuyobu. If Upload does not create
          a bridge in Winbox, paste this one-liner again (the agent must be able to run
          queued commands), then Upload configuration.
        </p>
        <CopyBlock label="Copy provision" value={oneLiner} />
        {connected ? (
          <p className="mt-3 text-sm text-emerald-400">
            Router is online. {ports.length} port{ports.length === 1 ? "" : "s"} reported.
          </p>
        ) : (
          <p className="mt-3 text-sm text-amber-300">
            Waiting for the MikroTik to check in. Ports will appear here after it connects.
          </p>
        )}
      </section>

      <section className={`card p-5 ${connected ? "" : "opacity-70"}`}>
        <h2 className="font-medium">2. Ports and services</h2>
        {connected ? (
          <p className="mt-1 text-sm text-[#9aa3b2]">
            Choose the WAN port. Every remaining customer port joins Hotspot and PPPoE.
          </p>
        ) : (
          <p className="mt-1 text-sm text-[#9aa3b2]">
            Port lists stay empty until this MikroTik connects. Paste the provision script
            first, then this section unlocks.
          </p>
        )}
        <div className="mt-4 grid gap-3">
          <label className="text-sm">
            WAN
            <select
              className="mt-1 w-full"
              disabled={!connected}
              value={wan}
              onChange={(event) => setWan(event.target.value)}
            >
              <option value="">{connected ? "Select port" : "Waiting for MikroTik"}</option>
              {ports.map((port) => (
                <option key={`wan-${port.name}`} value={port.name}>
                  {port.name} ({port.type})
                </option>
              ))}
            </select>
          </label>
          {connected && wan ? (
            <div>
              <p className="text-sm">Customer ports (Hotspot and PPPoE)</p>
              <p className="mt-1 text-sm text-[#9aa3b2]">
                {customerPorts.length > 0
                  ? customerPorts.join(", ")
                  : "No remaining ports. Pick a different WAN."}
              </p>
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              checked={hotspot}
              disabled={!connected}
              type="checkbox"
              onChange={(event) => setHotspot(event.target.checked)}
            />
            Hotspot
          </label>
          <label className="flex items-center gap-2">
            <input
              checked={pppoe}
              disabled={!connected}
              type="checkbox"
              onChange={(event) => setPppoe(event.target.checked)}
            />
            PPPoE
          </label>
          <label className="flex items-center gap-2">
            <input
              checked={antiShare}
              disabled={!connected}
              type="checkbox"
              onChange={(event) => setAntiShare(event.target.checked)}
            />
            Anti-sharing
          </label>
        </div>
        <p className="mt-2 text-sm text-[#6f7887]">
          Anti-sharing keeps one login per account. Extra phones or hotspot sharing are blocked.
        </p>
        {blocked && !pending ? <p className="mt-3 text-sm text-amber-300">{blocked}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        {success ? <p className="mt-3 text-sm text-emerald-400">{success}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="btn-ghost" href="/console/routers">
            Cancel
          </Link>
          <button
            className="btn-primary"
            disabled={pending}
            type="button"
            onClick={() => {
              void applyConfig();
            }}
          >
            {pending ? "Uploading..." : "Upload configuration"}
          </button>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-medium">3. Customer buy link</h2>
        <p className="mt-1 text-sm text-[#9aa3b2]">
          After you upload configuration, phones that join this hotspot open this page.
          The login template sends <code>?mac=</code> so the device is opened automatically
          after M-PESA payment.
        </p>
        <CopyBlock label="Copy link" value={buyUrl} />
      </section>
    </div>
  );
}
