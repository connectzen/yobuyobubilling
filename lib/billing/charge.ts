import { sql, type Plan, type Router } from "../db";
import { getPaystackSecret } from "../env";
import { isChargeSuccessful, toPaystackAmount } from "../paystack";
import { applySuccessfulPayment } from "./fulfill";

export async function startPackageCharge(input: {
  operatorId: string;
  router: Router;
  plan: Plan;
  name: string;
  phone: string;
  macAddress?: string;
}) {
  const db = sql();
  const reference = `yb_${crypto.randomUUID().replaceAll("-", "")}`;
  await db`
    insert into payments (operator_id, router_id, plan_id, reference, phone, amount_kes, customer_name, mac_address)
    values (
      ${input.operatorId}, ${input.router.id}, ${input.plan.id}, ${reference},
      ${input.phone}, ${input.plan.price_kes}, ${input.name}, ${input.macAddress ?? null}
    )
  `;

  const charge = await fetch("https://api.paystack.co/charge", {
    method: "POST",
    headers: {
      authorization: `Bearer ${getPaystackSecret()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: `${input.phone}@customers.yobuyobu.com`,
      amount: String(toPaystackAmount(input.plan.price_kes)),
      currency: "KES",
      reference,
      mobile_money: { phone: input.phone, provider: "mpesa" },
    }),
  });
  const payload = await charge.json();
  if (!charge.ok || !payload.status) {
    await db`update payments set status = 'failed' where reference = ${reference}`;
    throw new Error(payload.message ?? "Paystack charge failed");
  }

  if (isChargeSuccessful(payload)) {
    const grant = await applySuccessfulPayment(reference);
    return {
      reference,
      granted: true,
      username: grant.username,
      password: grant.password,
      expiresAt: grant.expiresAt,
      message: "Payment confirmed. You are being connected now.",
    };
  }

  return {
    reference,
    granted: false,
    message: "Approve the M-PESA prompt. Access starts as soon as Paystack confirms.",
  };
}
