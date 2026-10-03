import { getOperator } from "@/lib/auth";
import { removeAccessScript } from "@/lib/billing/access";
import { sql } from "@/lib/db";
import { fail, ok } from "@/lib/api";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const operator = await getOperator();
  if (!operator) {
    return fail("Unauthorized", 401);
  }

  const db = sql();
  const [row] = await db<{ id: string; username: string; mac: string | null; router_id: string }[]>`
    select s.id, s.username, s.mac, s.router_id
    from sessions s
    join routers r on r.id = s.router_id
    where s.id = ${params.id} and r.operator_id = ${operator.id}
    limit 1
  `;
  if (!row) {
    return fail("Session not found", 404);
  }
  if (!/^[A-Za-z0-9._-]{1,40}$/.test(row.username)) {
    return fail("This router entry cannot be removed from here");
  }

  await db`
    insert into router_commands (router_id, script)
    values (${row.router_id}, ${removeAccessScript(row.username, "hotspot", row.mac ?? undefined)})
  `;
  await db`delete from sessions where id = ${row.id}`;
  return ok({ deleted: true });
}
