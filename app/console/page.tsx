import { getOperator } from "@/lib/auth";
import { sql } from "@/lib/db";

export default async function OverviewPage() {
  const operator = await getOperator();
  const db = sql();
  const [routers, plans, subscribers, payments] = await Promise.all([
    db`select count(*)::int as n from routers where operator_id = ${operator!.id}`,
    db`select count(*)::int as n from plans where operator_id = ${operator!.id}`,
    db`select count(*)::int as n from subscribers where operator_id = ${operator!.id} and status = 'active'`,
    db`select coalesce(sum(amount_kes), 0)::int as n from payments where operator_id = ${operator!.id} and status = 'success'`,
  ]);

  const cards = [
    ["Routers", routers[0]?.n ?? 0],
    ["Plans", plans[0]?.n ?? 0],
    ["Live subscribers", subscribers[0]?.n ?? 0],
    ["Paystack KES", payments[0]?.n ?? 0],
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Overview</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Link a MikroTik, apply hotspot or PPPoE, then sell packages.
      </p>
      <div className="mt-6 grid grid-cols-4 gap-4">
        {cards.map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-line bg-panel p-5">
            <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
