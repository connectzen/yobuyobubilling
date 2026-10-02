import { startPackageCharge } from "@/lib/billing/charge";
import { sql, type Plan, type Router } from "@/lib/db";
import { fail, ok } from "@/lib/api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = String(body?.token ?? "").trim();
  const name = String(body?.name ?? "").trim();
  const phone = String(body?.phone ?? "").replace(/\s+/g, "");
  const planId = String(body?.planId ?? "");
  const macAddress = String(body?.macAddress ?? "").trim() || undefined;
  const ipAddress = String(body?.ipAddress ?? "").trim() || undefined;
  if (!token || !phone || !planId) {
    return fail("Phone, package, and router token are required");
  }

  const db = sql();
  const [router] = await db<Router[]>`
    select * from routers where token = ${token} limit 1
  `;
  if (!router) {
    return fail("Router not found", 404);
  }
  const [plan] = await db<Plan[]>`
    select * from plans
    where id = ${planId} and operator_id = ${router.operator_id} and active = true
    limit 1
  `;
  if (!plan) {
    return fail("Package not found", 404);
  }

  try {
    const result = await startPackageCharge({
      operatorId: router.operator_id,
      router,
      plan,
      name,
      phone,
      macAddress,
      ipAddress,
    });
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Paystack charge failed", 502);
  }
}
