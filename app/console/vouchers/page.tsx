import { getOperator } from "@/lib/auth";
import { sql, type Plan, type Router, type Voucher } from "@/lib/db";
import { VoucherForm } from "@/components/voucher-form";

export default async function VouchersPage() {
  const operator = await getOperator();
  const db = sql();
  const [vouchers, routers, plans] = await Promise.all([
    db<(Voucher & { plan_name: string; router_name: string })[]>`
      select v.*, p.name as plan_name, r.name as router_name
      from vouchers v
      join plans p on p.id = v.plan_id
      join routers r on r.id = v.router_id
      where v.operator_id = ${operator!.id}
      order by v.created_at desc
      limit 100
    `,
    db<Router[]>`select * from routers where operator_id = ${operator!.id} order by name`,
    db<Plan[]>`select * from plans where operator_id = ${operator!.id} and active = true order by name`,
  ]);

  return (
    <div className="grid grid-cols-[1fr_360px] gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Vouchers</h1>
        <div className="mt-6 overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-black/30 text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Router</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-4 py-3 font-mono">{row.code}</td>
                  <td className="px-4 py-3">{row.plan_name}</td>
                  <td className="px-4 py-3">{row.router_name}</td>
                  <td className="px-4 py-3 capitalize">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <VoucherForm
        routers={routers.map((row) => ({ id: row.id, name: row.name }))}
        plans={plans.map((row) => ({ id: row.id, name: row.name }))}
      />
    </div>
  );
}
