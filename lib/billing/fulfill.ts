import { randomBytes } from "node:crypto";
import { sql, type Plan, type Router } from "../db";
import { grantAccess } from "./access";

export async function fulfillPaidAccess(input: {
  operatorId: string;
  routerId: string;
  planId: string;
  name: string;
  phone: string;
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

  const username = `${plan.service_type.slice(0, 2)}-${randomBytes(3).toString("hex")}`;
  const password = randomBytes(4).toString("hex");
  const grant = grantAccess({
    now: new Date(),
    durationMinutes: plan.duration_minutes,
    downloadKbps: plan.download_kbps,
    uploadKbps: plan.upload_kbps,
    serviceType: plan.service_type,
    username,
    password,
  });

  const rows = await db<{ id: string }[]>`
    insert into subscribers (
      operator_id, router_id, plan_id, name, phone, username, password, service_type, expires_at
    ) values (
      ${input.operatorId}, ${router.id}, ${plan.id}, ${input.name}, ${input.phone},
      ${username}, ${password}, ${plan.service_type}, ${grant.expiresAt.toISOString()}
    )
    returning id
  `;
  await db`
    insert into router_commands (router_id, script)
    values (${router.id}, ${grant.script})
  `;

  return { subscriberId: rows[0].id, username, password, expiresAt: grant.expiresAt };
}
