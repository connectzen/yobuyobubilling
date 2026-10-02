import { randomBytes } from "node:crypto";
import { getOperator } from "@/lib/auth";
import { sql, type Router } from "@/lib/db";
import { fail, ok } from "@/lib/api";

export async function GET() {
  const operator = await getOperator();
  if (!operator) {
    return fail("Unauthorized", 401);
  }
  const db = sql();
  const routers = await db<Router[]>`
    select * from routers where operator_id = ${operator.id} order by created_at desc
  `;
  return ok(routers);
}

export async function POST(request: Request) {
  const operator = await getOperator();
  if (!operator) {
    return fail("Unauthorized", 401);
  }
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) {
    return fail("Router name is required");
  }

  const db = sql();
  const rows = await db<Router[]>`
    insert into routers (operator_id, name, token)
    values (${operator.id}, ${name}, ${randomBytes(24).toString("hex")})
    returning *
  `;
  return ok(rows[0], 201);
}
