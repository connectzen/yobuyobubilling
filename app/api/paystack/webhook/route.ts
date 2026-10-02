import { sql } from "@/lib/db";
import { fulfillPaidAccess } from "@/lib/billing/fulfill";
import { fail, ok } from "@/lib/api";
import { getPaystackSecret } from "@/lib/env";
import { verifyPaystackSignature } from "@/lib/paystack";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";
  if (!verifyPaystackSignature(body, signature, getPaystackSecret())) {
    return fail("Invalid signature", 401);
  }

  const event = JSON.parse(body);
  if (event.event !== "charge.success") {
    return ok({ ignored: true });
  }

  const reference = String(event.data?.reference ?? "");
  const db = sql();
  const rows = await db<{
    id: string;
    operator_id: string;
    router_id: string;
    plan_id: string;
    phone: string;
    customer_name: string;
    status: string;
  }[]>`
    select id, operator_id, router_id, plan_id, phone, customer_name, status
    from payments
    where reference = ${reference}
    limit 1
  `;
  const payment = rows[0];
  if (!payment) {
    return fail("Payment not found", 404);
  }
  if (payment.status === "success") {
    return ok({ duplicate: true });
  }

  const grant = await fulfillPaidAccess({
    operatorId: payment.operator_id,
    routerId: payment.router_id,
    planId: payment.plan_id,
    name: payment.customer_name,
    phone: payment.phone,
  });
  await db`
    update payments
    set status = 'success', subscriber_id = ${grant.subscriberId}
    where id = ${payment.id}
  `;

  return ok({ granted: true, username: grant.username });
}
