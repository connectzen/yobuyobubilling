"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LiveRefresh({ intervalMs = 3000 }: { intervalMs?: number }) {
  const nav = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => nav.refresh(), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, nav]);
  return null;
}
