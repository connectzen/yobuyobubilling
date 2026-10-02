import { sql, type Router } from "@/lib/db";
import { rsc } from "@/lib/api";
import { takeQueuedCommandScript } from "@/lib/mikrotik/agent-commands";
import { idleAgentScript } from "@/lib/mikrotik/provision";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
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

  try {
    return rsc(await takeQueuedCommandScript(router.id));
  } catch {
    return rsc(idleAgentScript());
  }
}
