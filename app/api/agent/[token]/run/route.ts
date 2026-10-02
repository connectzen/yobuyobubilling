import { sql, type Router } from "@/lib/db";
import { rsc } from "@/lib/api";
import {
  ackQueuedCommands,
  peekQueuedCommandScript,
} from "@/lib/mikrotik/agent-commands";
import { idleAgentScript } from "@/lib/mikrotik/provision";

export const dynamic = "force-dynamic";

export async function GET(
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

  try {
    const done = new URL(request.url).searchParams.get("done") === "1";
    if (done) {
      await ackQueuedCommands(router.id);
      return rsc(idleAgentScript());
    }
    return rsc(await peekQueuedCommandScript(router.id));
  } catch {
    return rsc(idleAgentScript());
  }
}
