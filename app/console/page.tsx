import Link from "next/link";
import { getOperator } from "@/lib/auth";
import { sql } from "@/lib/db";
import { LiveRefresh } from "@/components/live-refresh";
import { routerPresence } from "@/lib/routers/presence";

export default async function OverviewPage() {
  const operator = await getOperator();
  const db = sql();
  const [routerRows, plans, subscribers, payments] = await Promise.all([
    db<{ last_seen_at: string | null }[]>`
      select last_seen_at from routers where operator_id = ${operator!.id}
    `,
    db`select count(*)::int as n from plans where operator_id = ${operator!.id}`,
    db`select count(*)::int as n from subscribers where operator_id = ${operator!.id} and status = 'active'`,
    db`select coalesce(sum(amount_kes), 0)::int as n from payments where operator_id = ${operator!.id} and status = 'success'`,
  ]);

  const liveRouters = routerRows.filter((row) => routerPresence(row.last_seen_at).live).length;

  const cards = [
    ["Live routers", liveRouters, "MikroTik boxes checking in now"],
    ["Plans", plans[0]?.n ?? 0, "Speed and time packages"],
    ["Live subscribers", subscribers[0]?.n ?? 0, "Active access grants"],
    ["Paystack KES", payments[0]?.n ?? 0, "Confirmed collections"],
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <LiveRefresh />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f5a524]">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-2 max-w-xl text-sm text-[#9aa3b2]">
            Link a MikroTik, push hotspot or PPPoE, then sell packages. Paid
            customers are connected automatically.
          </p>
        </div>
        <Link className="btn-primary" href="/console/routers/new">
          Link MikroTik
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, hint]) => (
          <div key={String(label)} className="card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-[#9aa3b2]">
              {label}
            </p>
            <p className="mt-3 text-3xl font-semibold">{value}</p>
            <p className="mt-2 text-sm text-[#6f7887]">{hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Link className="card p-5 hover:border-[#f5a524]/40" href="/console/routers">
          <p className="font-medium">Routers</p>
          <p className="mt-2 text-sm text-[#9aa3b2]">
            Provision, choose ports, and upload hotspot or PPPoE.
          </p>
        </Link>
        <Link className="card p-5 hover:border-[#f5a524]/40" href="/console/plans">
          <p className="font-medium">Packages</p>
          <p className="mt-2 text-sm text-[#9aa3b2]">
            Set speed, duration, and price before you sell.
          </p>
        </Link>
        <Link className="card p-5 hover:border-[#f5a524]/40" href="/console/payments">
          <p className="font-medium">Paystack</p>
          <p className="mt-2 text-sm text-[#9aa3b2]">
            Send an M-PESA prompt. Access is granted on success.
          </p>
        </Link>
      </div>
    </div>
  );
}
