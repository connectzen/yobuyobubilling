import { getOperator } from "@/lib/auth";
import { sql, type Router } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { buildServiceConfigScript } from "@/lib/mikrotik/services";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const operator = await getOperator();
  if (!operator) {
    return fail("Unauthorized", 401);
  }

  const body = await request.json().catch(() => null);
  let script = "";
  try {
    script = buildServiceConfigScript({
      wanInterface: String(body?.wanInterface ?? ""),
      lanInterface: String(body?.lanInterface ?? ""),
      hotspot: Boolean(body?.hotspot),
      pppoe: Boolean(body?.pppoe),
      antiShare: Boolean(body?.antiShare),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid configuration");
  }

  const db = sql();
  const routers = await db<Router[]>`
    select * from routers where id = ${params.id} and operator_id = ${operator.id} limit 1
  `;
  const router = routers[0];
  if (!router) {
    return fail("Router not found", 404);
  }

  await db`
    insert into router_commands (router_id, script)
    values (${router.id}, ${script})
  `;
  await db`
    update routers
    set wan_interface = ${String(body.wanInterface)},
        lan_interface = ${String(body.lanInterface)},
        hotspot_enabled = ${Boolean(body.hotspot)},
        pppoe_enabled = ${Boolean(body.pppoe)},
        anti_share_enabled = ${Boolean(body.antiShare)},
        status = 'configured'
    where id = ${router.id}
  `;

  return ok({ queued: true });
}
