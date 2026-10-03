import { getOperator } from "@/lib/auth";
import { SessionRemove } from "@/components/session-remove";
import { sql } from "@/lib/db";

function presenceLabel(kind: number) {
  if (kind === 2) {
    return "On router";
  }
  if (kind === 3) {
    return "Bypassed";
  }
  return "Online";
}

export default async function SessionsPage() {
  const operator = await getOperator();
  const db = sql();
  const sessions = await db<{
    id: string;
    username: string;
    mac: string | null;
    ip: string | null;
    last_seen_at: string;
    router_name: string;
    bytes_in: number;
  }[]>`
    select s.id, s.username, s.mac, s.ip, s.last_seen_at, s.bytes_in, r.name as router_name
    from sessions s
    join routers r on r.id = s.router_id
    where r.operator_id = ${operator!.id}
    order by s.last_seen_at desc
    limit 100
  `;

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f5a524]">
        Operate
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Live sessions</h1>
      <p className="mt-2 text-sm text-[#9aa3b2]">
        HotSpot accounts, live logins, and MAC bypasses reported by the router.
        Paste the router setup command again so this list can update.
      </p>
      <div className="table-wrap mt-8">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>State</th>
              <th>Router</th>
              <th>IP</th>
              <th>MAC</th>
              <th>Seen</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-[#9aa3b2]">
                  No HotSpot users reported yet. Open the router and paste the setup command once.
                </td>
              </tr>
            ) : (
              sessions.map((row) => (
                <tr key={row.id}>
                  <td className="font-mono text-xs">{row.username}</td>
                  <td className="text-[#9aa3b2]">{presenceLabel(Number(row.bytes_in))}</td>
                  <td>{row.router_name}</td>
                  <td className="font-mono text-xs">{row.ip ?? "—"}</td>
                  <td className="font-mono text-xs">{row.mac ?? "—"}</td>
                  <td className="text-[#9aa3b2]">
                    {new Date(row.last_seen_at).toLocaleString()}
                  </td>
                  <td>
                    <SessionRemove id={row.id} name={row.username} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
