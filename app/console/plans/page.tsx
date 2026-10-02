import { getOperator } from "@/lib/auth";
import { sql, type Plan } from "@/lib/db";
import { PlanForm } from "@/components/plan-form";
import { formatDuration } from "@/lib/billing/duration";
import { formatMbps } from "@/lib/billing/speed";

export default async function PlansPage() {
  const operator = await getOperator();
  const db = sql();
  const plans = await db<Plan[]>`
    select * from plans where operator_id = ${operator!.id} order by created_at desc
  `;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f5a524]">
            Network
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Packages</h1>
          <p className="mt-2 text-sm text-[#9aa3b2]">
            Speed, duration, and price sold to customers.
          </p>
        </div>
        <PlanForm />
      </div>
      <div className="table-wrap mt-8">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Speed</th>
              <th>Time</th>
              <th>KES</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-[#9aa3b2]">
                  No packages yet. Add one with New package.
                </td>
              </tr>
            ) : (
              plans.map((plan) => (
                <tr key={plan.id}>
                  <td>{plan.name}</td>
                  <td className="capitalize">{plan.service_type}</td>
                  <td>
                    {formatMbps(plan.download_kbps)} / {formatMbps(plan.upload_kbps)}
                  </td>
                  <td>{formatDuration(plan.duration_minutes)}</td>
                  <td>{plan.price_kes}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
