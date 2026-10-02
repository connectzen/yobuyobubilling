import { getOperator } from "@/lib/auth";
import { sql, type Plan, type Router, type Subscriber } from "@/lib/db";
import { SubscriberForm } from "@/components/subscriber-form";

export default async function SubscribersPage() {
  const operator = await getOperator();
  const db = sql();
  const [subscribers, routers, plans] = await Promise.all([
    db<(Subscriber & { router_name: string; plan_name: string })[]>`
      select s.*, r.name as router_name, p.name as plan_name
      from subscribers s
      join routers r on r.id = s.router_id
      join plans p on p.id = s.plan_id
      where s.operator_id = ${operator!.id}
      order by s.created_at desc
    `,
    db<Router[]>`select * from routers where operator_id = ${operator!.id} order by name`,
    db<Plan[]>`select * from plans where operator_id = ${operator!.id} and active = true order by name`,
  ]);

  return (
    <div className="grid grid-cols-[1fr_360px] gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Subscribers</h1>
        <div className="mt-6 overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-black/30 text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Username</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Expires</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-4 py-3">{row.name}<div className="text-zinc-500">{row.phone}</div></td>
                  <td className="px-4 py-3">{row.username}</td>
                  <td className="px-4 py-3">{row.plan_name}</td>
                  <td className="px-4 py-3">{row.expires_at ? new Date(row.expires_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <SubscriberForm
        routers={routers.map((row) => ({ id: row.id, name: row.name }))}
        plans={plans.map((row) => ({ id: row.id, name: row.name }))}
      />
    </div>
  );
}
