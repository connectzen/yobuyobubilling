import { sql, type Router } from "@/lib/db";
import { getAppUrl } from "@/lib/env";
import { rsc } from "@/lib/api";
import { peekQueuedCommandScript } from "@/lib/mikrotik/agent-commands";
import {
  appendPendingCommands,
  buildBootstrapScript,
} from "@/lib/mikrotik/provision";

export async function GET(
  _request: Request,
  { params }: { params: { token: string } },
) {
  const db = sql();
  const rows = await db<Router[]>`
    select * from routers where token = ${params.token} limit 1
  `;
  const router = rows[0];
  if (!router) {
    return rsc("# unknown router");
  }

  const bootstrap = buildBootstrapScript({
    appUrl: getAppUrl(),
    token: router.token,
    routerName: router.name,
  });
  const pending = await peekQueuedCommandScript(router.id);
  return rsc(appendPendingCommands(bootstrap, pending));
}
