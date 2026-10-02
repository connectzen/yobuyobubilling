import { sql, type Plan, type Router } from "../db";
import { grantAccess, usernameFromPhone } from "./access";

export async function fulfillPaidAccess(input: {
  operatorId: string;
  routerId: string;
  planId: string;
  name: string;
  phone: string;
  macAddress?: string;
}) {
  const db = sql();
  const [router] = await db<Router[]>`
    select * from routers
    where id = ${input.routerId} and operator_id = ${input.operatorId}
    limit 1
  `;
  const [plan] = await db<Plan[]>`
    select * from plans
    where id = ${input.planId} and operator_id = ${input.operatorId}
    limit 1
  `;
  if (!router || !plan) {
    throw new Error("Router or plan not found");
  }

  const username = usernameFromPhone(input.phone);
  const password = username;
  const grant = grantAccess({
    now: new Date(),
    durationMinutes: plan.duration_minutes,
    downloadKbps: plan.download_kbps,
    uploadKbps: plan.upload_kbps,
    serviceType: plan.service_type,
    username,
    password,
    macAddress: input.macAddress,
  });

  const rows = await db<{ id: string }[]>`
    insert into subscribers (
      operator_id, router_id, plan_id, name, phone, username, password, service_type, expires_at, mac_address
    ) values (
      ${input.operatorId}, ${router.id}, ${plan.id}, ${input.name}, ${input.phone},
      ${username}, ${password}, ${plan.service_type}, ${grant.expiresAt.toISOString()}, ${input.macAddress ?? null}
    )
    returning id
  `;
  await db`
    insert into router_commands (router_id, script)
    values (${router.id}, ${grant.script})
  `;

  return { subscriberId: rows[0].id, username, password, expiresAt: grant.expiresAt };
}

export async function applySuccessfulPayment(reference: string) {
  const db = sql();
  const rows = await db<{
    id: string;
    operator_id: string;
    router_id: string;
    plan_id: string;
    phone: string;
    customer_name: string;
    status: string;
    mac_address: string | null;
    subscriber_id: string | null;
  }[]>`
    select id, operator_id, router_id, plan_id, phone, customer_name, status, mac_address, subscriber_id
    from payments
    where reference = ${reference}
    limit 1
  `;
  const payment = rows[0];
  if (!payment) {
    throw new Error("Payment not found");
  }
  if (payment.status === "success" && payment.subscriber_id) {
    const [existing] = await db<{ username: string; password: string; expires_at: string | null }[]>`
      select username, password, expires_at from subscribers where id = ${payment.subscriber_id} limit 1
    `;
    return {
      duplicate: true,
      subscriberId: payment.subscriber_id,
      username: existing?.username ?? "",
      password: existing?.password ?? "",
      expiresAt: existing?.expires_at ? new Date(existing.expires_at) : new Date(),
    };
  }

  const grant = await fulfillPaidAccess({
    operatorId: payment.operator_id,
    routerId: payment.router_id,
    planId: payment.plan_id,
    name: payment.customer_name,
    phone: payment.phone,
    macAddress: payment.mac_address ?? undefined,
  });
  await db`
    update payments
    set status = 'success', subscriber_id = ${grant.subscriberId}
    where id = ${payment.id}
  `;
  return { duplicate: false, ...grant };
}
