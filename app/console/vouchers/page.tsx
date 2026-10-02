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
    <div className="mx-auto grid max-w-6xl gap-8 xl:grid-cols-[1fr_340px]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f5a524]">
          Network
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Vouchers</h1>
        <p className="mt-2 text-sm text-[#9aa3b2]">
          Prepaid codes for hotspot login when you sell offline.
        </p>
        <div className="table-wrap mt-8">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Plan</th>
                <th>Router</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-[#9aa3b2]">
                    No vouchers yet.
                  </td>
                </tr>
              ) : (
                vouchers.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono">{row.code}</td>
                    <td>{row.plan_name}</td>
                    <td>{row.router_name}</td>
                    <td className="capitalize">{row.status}</td>
                  </tr>
                ))
              )}
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
