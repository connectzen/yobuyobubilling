import Link from "next/link";
import { getOperator } from "@/lib/auth";
import { sql, type Router } from "@/lib/db";

export default async function RoutersPage() {
  const operator = await getOperator();
  const db = sql();
  const routers = await db<Router[]>`
    select * from routers where operator_id = ${operator!.id} order by created_at desc
  `;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Routers</h1>
          <p className="text-sm text-zinc-400">Provision MikroTik, then push services.</p>
        </div>
        <Link className="btn-primary" href="/console/routers/new">
          Link MikroTik
        </Link>
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-black/30 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Services</th>
              <th className="px-4 py-3 text-left">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {routers.map((router) => (
              <tr key={router.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <Link className="text-accent" href={`/console/routers/${router.id}`}>
                    {router.name}
                  </Link>
                </td>
                <td className="px-4 py-3 capitalize">{router.status}</td>
                <td className="px-4 py-3">
                  {[router.hotspot_enabled && "Hotspot", router.pppoe_enabled && "PPPoE", router.anti_share_enabled && "Anti-share"]
                    .filter(Boolean)
                    .join(" · ") || "Not applied"}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {router.last_seen_at ? new Date(router.last_seen_at).toLocaleString() : "Waiting"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
