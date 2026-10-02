export function normalizeMac(value?: string): string | undefined {
  const raw = (value ?? "").trim();
  if (!raw) {
    return undefined;
  }
  const hex = raw.toUpperCase().replace(/[^0-9A-F]/g, "");
  if (hex.length !== 12) {
    throw new Error("MAC address is invalid");
  }
  return hex.match(/.{2}/g)!.join(":");
}
