import { randomBytes } from "node:crypto";
import { getOperator } from "@/lib/auth";
import { sql, type Plan, type Router } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { grantAccess } from "@/lib/billing/access";

export async function POST(request: Request) {
  const operator = await getOperator();
  if (!operator) {
    return fail("Unauthorized", 401);
  }
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
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
      ${operator.id}, ${router.id}, ${plan.id}, ${name}, ${phone}, ${username}, ${password},
      ${plan.service_type}, ${grant.expiresAt.toISOString()}
    )
    returning id
  `;
  await db`
    insert into router_commands (router_id, script)
    values (${router.id}, ${grant.script})
  `;

  return ok({ id: rows[0].id, username, password, expiresAt: grant.expiresAt }, 201);
}
