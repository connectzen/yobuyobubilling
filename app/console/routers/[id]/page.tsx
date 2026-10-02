import { notFound } from "next/navigation";
import { getOperator } from "@/lib/auth";
import { sql, type Router } from "@/lib/db";
import { getAppUrl } from "@/lib/env";
import { buildProvisionOneLiner } from "@/lib/mikrotik/provision";
import { RouterSetup } from "@/components/router-setup";

export default async function RouterDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const operator = await getOperator();
  const db = sql();
  const rows = await db<Router[]>`
    select * from routers
    where id = ${params.id} and operator_id = ${operator!.id}
    limit 1
  `;
  const router = rows[0];
  if (!router) {
    notFound();
  }

  const oneLiner = buildProvisionOneLiner({
    appUrl: getAppUrl(),
    token: router.token,
  });

  return (
    <RouterSetup router={router} oneLiner={oneLiner} />
  );
}
