import { sql, type Plan, type Router } from "../db";
import { getPaystackSecret } from "../env";
import { isChargeSuccessful, toPaystackAmount } from "../paystack";
import { applySuccessfulPayment } from "./fulfill";
import { kenyaMpesaPhone, kenyaPhoneDisplay } from "./kenya-phone";
import { normalizeMac } from "./access";

export async function startPackageCharge(input: {
  operatorId: string;
  router: Router;
  plan: Plan;
  name: string;
  phone: string;
  macAddress?: string;
}) {
  const displayPhone = kenyaPhoneDisplay(input.phone);
  const mpesaPhone = kenyaMpesaPhone(input.phone);
  const name = input.name.trim() || `Customer ${displayPhone}`;
  let macAddress: string | undefined;
  try {
    macAddress = normalizeMac(input.macAddress);
  } catch {
    macAddress = undefined;
  }
  const db = sql();
  const reference = `yb_${crypto.randomUUID().replaceAll("-", "")}`;
  await db`
    insert into payments (operator_id, router_id, plan_id, reference, phone, amount_kes, customer_name, mac_address)
    values (
      ${input.operatorId}, ${input.router.id}, ${input.plan.id}, ${reference},
      ${displayPhone}, ${input.plan.price_kes}, ${name}, ${macAddress ?? null}
    )
  `;

  const charge = await fetch("https://api.paystack.co/charge", {
    method: "POST",
    headers: {
      authorization: `Bearer ${getPaystackSecret()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: `${mpesaPhone}@customers.yobuyobu.com`,
      amount: String(toPaystackAmount(input.plan.price_kes)),
      currency: "KES",
      reference,
      mobile_money: { phone: mpesaPhone, provider: "mpesa" },
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
