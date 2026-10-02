import { getOperator } from "@/lib/auth";
import { sql, type Plan, type Router } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { getPaystackSecret } from "@/lib/env";
import { toPaystackAmount } from "@/lib/paystack";

export async function POST(request: Request) {
  const operator = await getOperator();
  if (!operator) {
    return fail("Unauthorized", 401);
  }
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const phone = String(body?.phone ?? "").replace(/\s+/g, "");
  const routerId = String(body?.routerId ?? "");
  const planId = String(body?.planId ?? "");
  if (!name || !phone || !routerId || !planId) {
    return fail("Customer, phone, router, and plan are required");
  }

  const db = sql();
  const [router] = await db<Router[]>`
    select * from routers where id = ${routerId} and operator_id = ${operator.id} limit 1
  `;
  const [plan] = await db<Plan[]>`
    select * from plans where id = ${planId} and operator_id = ${operator.id} limit 1
  `;
  if (!router || !plan) {
    return fail("Router or plan not found", 404);
  }

  const reference = `yb_${crypto.randomUUID().replaceAll("-", "")}`;
  await db`
    insert into payments (operator_id, router_id, plan_id, reference, phone, amount_kes, customer_name)
    values (${operator.id}, ${router.id}, ${plan.id}, ${reference}, ${phone}, ${plan.price_kes}, ${name})
  `;

  const charge = await fetch("https://api.paystack.co/charge", {
    method: "POST",
    headers: {
      authorization: `Bearer ${getPaystackSecret()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: `${phone}@customers.yobuyobu.com`,
      amount: String(toPaystackAmount(plan.price_kes)),
      currency: "KES",
      reference,
      mobile_money: { phone, provider: "mpesa" },
    }),
  });
  const payload = await charge.json();
  if (!charge.ok || !payload.status) {
    await db`update payments set status = 'failed' where reference = ${reference}`;
    return fail(payload.message ?? "Paystack charge failed", 502);
  }

  return ok({
    reference,
    message: "M-PESA prompt sent. Access is granted after Paystack confirms payment.",
  });
}
