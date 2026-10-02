import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyPaystackSignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  if (!body || !signature || !secret) {
    return false;
  }

  const expected = createHmac("sha512", secret).update(body).digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function toPaystackAmount(kes: number): number {
  return Math.round(kes * 100);
}

export function isChargeSuccessful(payload: {
  data?: { status?: string };
}): boolean {
  return payload.data?.status === "success";
}
