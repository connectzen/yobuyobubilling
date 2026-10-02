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
    <div>
      <h1 className="text-2xl font-semibold">Live sessions</h1>
      <div className="mt-6 overflow-hidden rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-black/30 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Router</th>
              <th className="px-4 py-3 text-left">IP</th>
              <th className="px-4 py-3 text-left">MAC</th>
              <th className="px-4 py-3 text-left">Seen</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-4 py-3">{row.username}</td>
                <td className="px-4 py-3">{row.router_name}</td>
                <td className="px-4 py-3">{row.ip ?? "—"}</td>
                <td className="px-4 py-3">{row.mac ?? "—"}</td>
                <td className="px-4 py-3">{new Date(row.last_seen_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
