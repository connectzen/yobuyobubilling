import { randomBytes } from "node:crypto";
import { getOperator } from "@/lib/auth";
import { sql } from "@/lib/db";
import { fail, ok } from "@/lib/api";

export async function POST(request: Request) {
  const operator = await getOperator();
  if (!operator) {
    return fail("Unauthorized", 401);
  }
  const body = await request.json().catch(() => null);
  const routerId = String(body?.routerId ?? "");
  const planId = String(body?.planId ?? "");
  const count = Math.min(50, Math.max(1, Number(body?.count ?? 1)));
  if (!routerId || !planId) {
    return fail("Router and plan are required");
  }

  const db = sql();
  const codes: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const code = randomBytes(4).toString("hex").toUpperCase();
    await db`
      insert into vouchers (operator_id, router_id, plan_id, code)
      values (${operator.id}, ${routerId}, ${planId}, ${code})
    `;
    codes.push(code);
  }
  return ok({ codes }, 201);
}
