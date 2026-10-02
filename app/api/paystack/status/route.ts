import { applySuccessfulPayment } from "@/lib/billing/fulfill";
import { sql } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { getPaystackSecret } from "@/lib/env";
import { isChargeSuccessful } from "@/lib/paystack";

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference") ?? "";
  if (!reference) {
    return fail("Reference is required");
  }

  const db = sql();
  const rows = await db<{ status: string; subscriber_id: string | null }[]>`
    select status, subscriber_id from payments where reference = ${reference} limit 1
  `;
  const payment = rows[0];
  if (!payment) {
    return fail("Payment not found", 404);
  }
  if (payment.status === "success") {
    const grant = await applySuccessfulPayment(reference);
    return ok({
      status: "success",
      username: grant.username,
      password: grant.password,
      expiresAt: grant.expiresAt,
    });
  }
  if (payment.status === "failed") {
    return ok({ status: "failed" });
  }

  const verify = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { authorization: `Bearer ${getPaystackSecret()}` },
  });
  const payload = await verify.json();
  if (isChargeSuccessful(payload)) {
    const grant = await applySuccessfulPayment(reference);
    return ok({
      status: "success",
      username: grant.username,
      password: grant.password,
      expiresAt: grant.expiresAt,
    });
  }

  return ok({ status: "pending" });
}
