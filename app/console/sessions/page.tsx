import { getOperator } from "@/lib/auth";
import { sql } from "@/lib/db";

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
  }[]>`
    select s.id, s.username, s.mac, s.ip, s.last_seen_at, r.name as router_name
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
        Devices currently seen on your MikroTik radios.
      </p>
      <div className="table-wrap mt-8">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Router</th>
              <th>IP</th>
              <th>MAC</th>
              <th>Seen</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-[#9aa3b2]">
                  No live sessions yet.
                </td>
              </tr>
            ) : (
              sessions.map((row) => (
                <tr key={row.id}>
                  <td>{row.username}</td>
                  <td>{row.router_name}</td>
                  <td className="font-mono text-xs">{row.ip ?? "—"}</td>
                  <td className="font-mono text-xs">{row.mac ?? "—"}</td>
                  <td className="text-[#9aa3b2]">
                    {new Date(row.last_seen_at).toLocaleString()}
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
