import { getOperator } from "@/lib/auth";
import { startPackageCharge } from "@/lib/billing/charge";
import { sql, type Plan, type Router } from "@/lib/db";
import { fail, ok } from "@/lib/api";

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
  const macAddress = String(body?.macAddress ?? "").trim() || undefined;
  if (!phone || !routerId || !planId) {
    return fail("Phone, router, and plan are required");
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
    const result = await startPackageCharge({
      operatorId: operator.id,
      router,
      plan,
      name,
      phone,
      macAddress,
    });
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Paystack charge failed", 502);
  }
}
