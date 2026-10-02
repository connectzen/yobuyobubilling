import { getOperator } from "@/lib/auth";
import { sql, type Payment, type Plan, type Router } from "@/lib/db";
import { PaymentForm } from "@/components/payment-form";

export default async function PaymentsPage() {
  const operator = await getOperator();
  const db = sql();
  const [payments, routers, plans] = await Promise.all([
    db<Payment[]>`
      select * from payments where operator_id = ${operator!.id} order by created_at desc limit 50
    `,
    db<Router[]>`select * from routers where operator_id = ${operator!.id} order by name`,
    db<Plan[]>`select * from plans where operator_id = ${operator!.id} and active = true order by name`,
  ]);

  return (
    <div className="grid grid-cols-[1fr_360px] gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Payments</h1>
        <div className="mt-6 overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-black/30 text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left">Reference</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">KES</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-4 py-3 font-mono text-xs">{row.reference}</td>
                  <td className="px-4 py-3">{row.phone}</td>
                  <td className="px-4 py-3">{row.amount_kes}</td>
                  <td className="px-4 py-3 capitalize">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <PaymentForm
        routers={routers.map((row) => ({ id: row.id, name: row.name }))}
        plans={plans.map((row) => ({ id: row.id, name: row.name }))}
      />
    </div>
  );
}
