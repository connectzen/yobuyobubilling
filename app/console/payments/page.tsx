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
    <div className="mx-auto grid max-w-6xl gap-8 xl:grid-cols-[1fr_340px]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f5a524]">
          Finance
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Payments</h1>
        <p className="mt-2 text-sm text-[#9aa3b2]">
          Paystack M-PESA charges. Successful payments grant access automatically.
        </p>
        <div className="table-wrap mt-8">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Phone</th>
                <th>KES</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-[#9aa3b2]">
                    No payments yet.
                  </td>
                </tr>
              ) : (
                payments.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono text-xs">{row.reference}</td>
                    <td>{row.phone}</td>
                    <td>{row.amount_kes}</td>
                    <td className="capitalize">{row.status}</td>
                  </tr>
                ))
              )}
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
