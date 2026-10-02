export const ROUTER_STALE_AFTER_MS = 20_000;

export type RouterPresence = {
  live: boolean;
  headline: "Waiting" | "Online" | "Offline";
  detail: string;
  ageMs: number | null;
};

export function formatAge(ageMs: number): string {
  const seconds = Math.max(0, Math.floor(ageMs / 1000));
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return `${hours}h ago`;
  }
  return `${Math.floor(hours / 24)}d ago`;
}

export function routerPresence(
  lastSeenAt: string | Date | null | undefined,
  now = Date.now(),
): RouterPresence {
  if (!lastSeenAt) {
    return {
      live: false,
      headline: "Waiting",
      detail: "Paste the provision script in Terminal.",
      ageMs: null,
    };
  }
  const seen = lastSeenAt instanceof Date ? lastSeenAt.getTime() : Date.parse(String(lastSeenAt));
  const ageMs = Number.isFinite(seen) ? now - seen : Number.POSITIVE_INFINITY;
  if (ageMs > ROUTER_STALE_AFTER_MS) {
    return {
      live: false,
      headline: "Offline",
      detail: `Last seen ${formatAge(ageMs)}. After a reset, paste provision again.`,
      ageMs,
    };
  }
  return {
    live: true,
    headline: "Online",
    detail: `Seen ${formatAge(ageMs)}`,
    ageMs,
  };
}
