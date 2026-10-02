import { getOperator } from "@/lib/auth";
import { fulfillPaidAccess } from "@/lib/billing/fulfill";
import { sql, type Plan, type Router } from "@/lib/db";
import { fail, ok } from "@/lib/api";

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
  const macAddress = String(body?.macAddress ?? "").trim() || undefined;
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

  try {
    const grant = await fulfillPaidAccess({
      operatorId: operator.id,
      routerId: router.id,
      planId: plan.id,
      name,
      phone,
      macAddress,
    });
    return ok(grant, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not grant access");
  }
}
