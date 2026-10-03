import { sql, type Router } from "@/lib/db";
import { rsc } from "@/lib/api";
import { kickScript } from "@/lib/billing/access";
import { parseHotspotReport } from "@/lib/mikrotik/presence";
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

  if (payload.users !== undefined || payload.actives !== undefined || payload.bypass !== undefined) {
    const presence = parseHotspotReport({
      users: String(payload.users ?? ""),
      actives: String(payload.actives ?? ""),
      bypass: String(payload.bypass ?? ""),
    });
    const kindCode = { active: 1, account: 2, bypassed: 3 } as const;
    await db`delete from sessions where router_id = ${router.id}`;
    for (const row of presence) {
      await db`
        insert into sessions (router_id, username, mac, ip, bytes_in)
        values (${router.id}, ${row.username}, ${row.mac}, ${row.ip}, ${kindCode[row.state]})
      `;
    }
  }

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
