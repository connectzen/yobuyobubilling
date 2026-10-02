import { sql } from "../db";
import { idleAgentScript } from "./provision";

export async function takeQueuedCommandScript(routerId: string): Promise<string> {
  const db = sql();
  const queued = await db<{ id: string; script: string }[]>`
    select id, script from router_commands
    where router_id = ${routerId} and status = 'queued'
    order by created_at asc
    limit 5
  `;

  if (queued.length === 0) {
    return idleAgentScript();
  }

  for (const row of queued) {
    await db`
      update router_commands
      set status = 'sent', sent_at = now()
      where id = ${row.id}
    `;
  }

  return queued.map((row) => row.script).join("\n");
}
