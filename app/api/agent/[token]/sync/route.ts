import { sql, type Router } from "@/lib/db";
import { rsc } from "@/lib/api";
import { kickScript } from "@/lib/billing/access";
import { idleAgentScript, parseInterfaceReport } from "@/lib/mikrotik/provision";

export async function POST(
  request: Request,
  { params }: { params: { token: string } },
) {
  const db = sql();
  const routers = await db<Router[]>`
    select * from routers where token = ${params.token} limit 1
  `;
  const router = routers[0];
  if (!router) {
    return rsc("# unknown router");
  }

  const payload = await request.json().catch(() => ({}));
  const interfaces = parseInterfaceReport(String(payload.interfaces ?? ""));
  const nextStatus = router.status === "configured" ? "configured" : "online";

  await db`
    update routers
    set identity_name = ${String(payload.identity ?? router.name)},
        ros_version = ${String(payload.version ?? "") || null},
        board_name = ${String(payload.board ?? "") || null},
        interfaces = ${db.json(interfaces)},
        last_seen_at = now(),
        status = ${nextStatus}
    where id = ${router.id}
  `;

  const expired = await db<{ username: string; service_type: "hotspot" | "pppoe"; id: string; mac_address: string | null }[]>`
    select id, username, service_type, mac_address from subscribers
    where router_id = ${router.id}
      and status = 'active'
      and expires_at is not null
      and expires_at <= now()
  `;

  for (const row of expired) {
    await db`
      insert into router_commands (router_id, script)
      values (${router.id}, ${kickScript(row.username, row.service_type, row.mac_address ?? undefined)})
    `;
    await db`update subscribers set status = 'expired' where id = ${row.id}`;
  }

  return rsc(idleAgentScript());
}
