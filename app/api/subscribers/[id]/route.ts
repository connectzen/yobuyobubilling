import { getOperator } from "@/lib/auth";
import { isExpired, kickScript, removeAccessScript, resumeScript } from "@/lib/billing/access";
import { sql } from "@/lib/db";
import { fail, ok } from "@/lib/api";

type SubscriberRow = {
  id: string;
  router_id: string;
  username: string;
  service_type: "hotspot" | "pppoe";
  status: "active" | "expired" | "disabled";
  expires_at: string | null;
  mac_address: string | null;
};

async function ownedSubscriber(id: string, operatorId: string) {
  const db = sql();
  const [row] = await db<SubscriberRow[]>`
    select id, router_id, username, service_type, status, expires_at, mac_address
    from subscribers
    where id = ${id} and operator_id = ${operatorId}
    limit 1
  `;
  return { db, row };
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const operator = await getOperator();
  if (!operator) {
    return fail("Unauthorized", 401);
  }
  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "");
  if (action !== "pause" && action !== "resume") {
    return fail("Action must be pause or resume");
  }

  const { db, row } = await ownedSubscriber(params.id, operator.id);
  if (!row) {
    return fail("Subscriber not found", 404);
  }

  if (action === "pause") {
    if (row.status === "disabled") {
      return ok({ status: "disabled" });
    }
    await db.begin(async (tx) => {
      await tx`
        insert into router_commands (router_id, script)
        values (${row.router_id}, ${kickScript(row.username, row.service_type, row.mac_address ?? undefined)})
      `;
      await tx`
        update subscribers set status = 'disabled' where id = ${row.id}
      `;
    });
    return ok({ status: "disabled" });
  }

  if (row.status === "active") {
    return ok({ status: "active" });
  }
  if (row.expires_at && isExpired(new Date(row.expires_at), new Date())) {
    return fail("This package has expired");
  }
  await db.begin(async (tx) => {
    await tx`
      insert into router_commands (router_id, script)
      values (${row.router_id}, ${resumeScript(row.username, row.service_type, row.mac_address ?? undefined)})
    `;
    await tx`
      update subscribers set status = 'active' where id = ${row.id}
    `;
  });
  return ok({ status: "active" });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const operator = await getOperator();
  if (!operator) {
    return fail("Unauthorized", 401);
  }

  const { db, row } = await ownedSubscriber(params.id, operator.id);
  if (!row) {
    return fail("Subscriber not found", 404);
  }

  await db.begin(async (tx) => {
    await tx`
      insert into router_commands (router_id, script)
      values (${row.router_id}, ${removeAccessScript(row.username, row.service_type, row.mac_address ?? undefined)})
    `;
    await tx`
      update payments set subscriber_id = null where subscriber_id = ${row.id}
    `;
    await tx`
      update vouchers set subscriber_id = null where subscriber_id = ${row.id}
    `;
    await tx`
      delete from subscribers where id = ${row.id} and operator_id = ${operator.id}
    `;
  });
  return ok({ deleted: true });
}
