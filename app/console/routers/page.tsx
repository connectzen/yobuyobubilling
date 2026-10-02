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
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f5a524]">
            Network
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Routers</h1>
          <p className="mt-2 text-sm text-[#9aa3b2]">
            Provision MikroTik, then push hotspot or PPPoE.
          </p>
        </div>
        <Link className="btn-primary" href="/console/routers/new">
          Link MikroTik
        </Link>
      </div>
      <div className="table-wrap mt-8">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Services</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {routers.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-[#9aa3b2]">
                  No routers yet. Link a MikroTik to get the paste-in script.
                </td>
              </tr>
            ) : (
              routers.map((router) => (
                <tr key={router.id}>
                  <td>
                    <Link className="font-medium text-[#f5a524]" href={`/console/routers/${router.id}`}>
                      {router.name}
                    </Link>
                  </td>
                  <td className="capitalize">{router.status}</td>
                  <td>
                    {[router.hotspot_enabled && "Hotspot", router.pppoe_enabled && "PPPoE", router.anti_share_enabled && "Anti-sharing"]
                      .filter(Boolean)
                      .join(" · ") || "Not applied"}
                  </td>
                  <td className="text-[#9aa3b2]">
                    {router.last_seen_at ? new Date(router.last_seen_at).toLocaleString() : "Waiting"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
