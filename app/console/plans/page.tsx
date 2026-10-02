import { getOperator } from "@/lib/auth";
import { sql, type Plan } from "@/lib/db";
import { PlanForm } from "@/components/plan-form";

export default async function PlansPage() {
  const operator = await getOperator();
  const db = sql();
  const plans = await db<Plan[]>`
    select * from plans where operator_id = ${operator!.id} order by created_at desc
  `;

  return (
    <div className="grid grid-cols-[1fr_360px] gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Packages</h1>
        <p className="text-sm text-zinc-400">Speed, duration, and price sold to customers.</p>
        <div className="mt-6 overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-black/30 text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Speed</th>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">KES</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-t border-line">
                  <td className="px-4 py-3">{plan.name}</td>
                  <td className="px-4 py-3 capitalize">{plan.service_type}</td>
                  <td className="px-4 py-3">
                    {plan.download_kbps}k / {plan.upload_kbps}k
                  </td>
                  <td className="px-4 py-3">{plan.duration_minutes} min</td>
                  <td className="px-4 py-3">{plan.price_kes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <PlanForm />
    </div>
  );
}
