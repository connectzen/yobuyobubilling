export function mbpsToKbps(mbps: number): number {
  if (!Number.isFinite(mbps) || mbps <= 0) {
    throw new Error("Speed must be greater than zero");
  }
  return Math.round(mbps * 1000);
}

export function formatMbps(kbps: number): string {
  if (!Number.isFinite(kbps) || kbps < 0) {
    throw new Error("Speed must be a number");
  }
  const mbps = kbps / 1000;
  const text = Number.isInteger(mbps)
    ? String(mbps)
    : mbps.toFixed(2).replace(/\.?0+$/, "");
  return `${text} Mbps`;
}
