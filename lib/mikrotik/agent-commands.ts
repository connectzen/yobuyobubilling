import { sql } from "../db";
import { idleAgentScript } from "./provision";

export async function peekQueuedCommandScript(routerId: string): Promise<string> {
  const db = sql();
  const queued = await db<{ id: string; script: string }[]>`
    select id, script from router_commands
    where router_id = ${routerId} and status = 'queued'
    order by created_at asc
    limit 1
  `;

  if (queued.length === 0) {
    return idleAgentScript();
  }

  return queued.map((row) => row.script).join("\n");
}

export async function ackQueuedCommands(routerId: string): Promise<void> {
  const db = sql();
  await db`
    update router_commands
    set status = 'sent', sent_at = now()
    where id in (
      select id from router_commands
      where router_id = ${routerId} and status = 'queued'
      order by created_at asc
      limit 1
    )
  `;
}

export async function takeQueuedCommandScript(routerId: string): Promise<string> {
  const script = await peekQueuedCommandScript(routerId);
  if (!script.trim().startsWith("# yobuyobu idle")) {
    await ackQueuedCommands(routerId);
  }
  return script;
}
