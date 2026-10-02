import { getOperator } from "@/lib/auth";
import { sql, type Router } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { getAppUrl } from "@/lib/env";
import { buildServiceConfigScript, customerLanPorts } from "@/lib/mikrotik/services";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const operator = await getOperator();
  if (!operator) {
    return fail("Unauthorized", 401);
  }

  const body = await request.json().catch(() => null);
  const db = sql();
  const routers = await db<Router[]>`
    select * from routers where id = ${params.id} and operator_id = ${operator.id} limit 1
  `;
  const router = routers[0];
  if (!router) {
    return fail("Router not found", 404);
  }

  const wanInterface = String(body?.wanInterface ?? "");
  let script = "";
  try {
    script = buildServiceConfigScript({
      wanInterface,
      ports: router.interfaces ?? [],
      hotspot: Boolean(body?.hotspot),
      pppoe: Boolean(body?.pppoe),
      antiShare: Boolean(body?.antiShare),
      buyHost: new URL(getAppUrl()).host,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid configuration");
  }

  const lanInterface = customerLanPorts(wanInterface, router.interfaces ?? []).join(",");

  try {
    await db`
      insert into router_commands (router_id, script)
      values (${router.id}, ${script})
    `;
    await db`
      update routers
      set wan_interface = ${wanInterface},
          lan_interface = ${lanInterface},
          hotspot_enabled = ${Boolean(body?.hotspot)},
          pppoe_enabled = ${Boolean(body?.pppoe)},
          anti_share_enabled = ${Boolean(body?.antiShare)},
          status = 'configured'
      where id = ${router.id}
    `;
  } catch {
    return fail("Could not queue configuration", 500);
  }

  return ok({ queued: true });
}
