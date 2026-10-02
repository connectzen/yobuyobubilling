import { notFound } from "next/navigation";
import { sql, type Plan, type Router } from "@/lib/db";
import { BuyForm } from "@/components/buy-form";
import { clientMacFromQuery } from "@/lib/mikrotik/hotspot-html";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BuyPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { mac?: string; ip?: string; "identity-mac"?: string };
}) {
  const db = sql();
  const [router] = await db<Router[]>`
    select * from routers where token = ${params.token} limit 1
  `;
  if (!router) {
    notFound();
  }
  const plans = await db<Plan[]>`
    select * from plans
    where operator_id = ${router.operator_id} and active = true
    order by price_kes
  `;

  return (
    <main className="min-h-screen bg-[#0b0d12] px-6 py-10 text-[#eef0f4]">
      <div className="card mx-auto w-full max-w-md p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f5a524]">Yobuyobu</p>
        <h1 className="mt-3 text-2xl font-semibold">Pay with M-PESA</h1>
        <p className="mt-2 text-sm text-[#9aa3b2]">
          Type your Safaricom number as 07XXXXXXXX. {router.name} opens this phone
          automatically after the prompt is approved.
        </p>
        <BuyForm
          token={router.token}
          macAddress={clientMacFromQuery(searchParams)}
          plans={plans.map((plan) => ({
            id: plan.id,
            name: plan.name,
            priceKes: plan.price_kes,
            durationMinutes: plan.duration_minutes,
          }))}
        />
      </div>
    </main>
  );
}
