import { getOperator } from "@/lib/auth";
import { sql, type Plan, type Router, type Subscriber } from "@/lib/db";
import { SubscriberActions } from "@/components/subscriber-actions";
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
    <div className="mx-auto grid max-w-6xl gap-8 xl:grid-cols-[1fr_340px]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f5a524]">
          Network
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Subscribers</h1>
        <p className="mt-2 text-sm text-[#9aa3b2]">
          Active grants pushed to MikroTik after payment or manual access.
        </p>
        <div className="table-wrap mt-8">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Username</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Expires</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {subscribers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-[#9aa3b2]">
                    No subscribers yet.
                  </td>
                </tr>
              ) : (
                subscribers.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.name}
                      <div className="text-[#6f7887]">{row.phone}</div>
                    </td>
                    <td className="font-mono text-xs">{row.username}</td>
                    <td>{row.plan_name}</td>
                    <td className="capitalize text-[#9aa3b2]">
                      {row.status === "disabled" ? "paused" : row.status}
                    </td>
                    <td className="text-[#9aa3b2]">
                      {row.expires_at ? new Date(row.expires_at).toLocaleString() : "—"}
                    </td>
                    <td>
                      <SubscriberActions id={row.id} name={row.name} status={row.status} />
                    </td>
                  </tr>
                ))
              )}
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
