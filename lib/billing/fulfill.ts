import type { Sql, TransactionSql } from "postgres";
import { sql, type Plan, type Router } from "../db";
import { grantAccess, normalizeMac, paymentAlreadyProvisioned, randomHotspotUsername } from "./access";
import { kenyaPhoneDisplay } from "./kenya-phone";

type Db = Sql | TransactionSql;

export async function fulfillPaidAccess(input: {
  operatorId: string;
  routerId: string;
  planId: string;
  name: string;
  phone: string;
  macAddress?: string;
  ipAddress?: string;
}, db: Db = sql()) {
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

  const displayPhone = kenyaPhoneDisplay(input.phone);
  const username = randomHotspotUsername();
  const password = username;
  const name = input.name.trim() || `Customer ${displayPhone}`;
  let macAddress: string | undefined;
  try {
    macAddress = normalizeMac(input.macAddress);
  } catch {
    macAddress = undefined;
  }
  const grant = grantAccess({
    now: new Date(),
    durationMinutes: plan.duration_minutes,
    downloadKbps: plan.download_kbps,
    uploadKbps: plan.upload_kbps,
    serviceType: plan.service_type,
    username,
    password,
    macAddress,
    ipAddress: input.ipAddress,
    sharedUsers: plan.shared_users,
  });

  const rows = await db<{ id: string }[]>`
    insert into subscribers (
      operator_id, router_id, plan_id, name, phone, username, password, service_type, expires_at, mac_address
    ) values (
      ${input.operatorId}, ${router.id}, ${plan.id}, ${name}, ${displayPhone},
      ${username}, ${password}, ${plan.service_type}, ${grant.expiresAt.toISOString()}, ${macAddress ?? null}
    )
    returning id
  `;
  await db`
    insert into router_commands (router_id, script)
    values (${router.id}, ${grant.script})
  `;

  return { subscriberId: rows[0].id, username, password, expiresAt: grant.expiresAt };
}

export async function applySuccessfulPayment(
  reference: string,
  extra?: { ipAddress?: string },
) {
  return sql().begin(async (tx) => applyLockedPayment(reference, tx, extra));
}

async function applyLockedPayment(
  reference: string,
  db: Db,
  extra?: { ipAddress?: string },
) {
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
    for update
  `;
  const payment = rows[0];
  if (!payment) {
    throw new Error("Payment not found");
  }
  if (paymentAlreadyProvisioned(payment)) {
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
    ipAddress: extra?.ipAddress,
  }, db);
  const updated = await db<{ id: string }[]>`
    update payments
    set status = 'success', subscriber_id = ${grant.subscriberId}
    where id = ${payment.id}
      and subscriber_id is null
    returning id
  `;
  if (!updated[0]) {
    throw new Error("Payment already provisioned");
  }
  return { duplicate: false, ...grant };
}
