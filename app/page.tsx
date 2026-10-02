import { redirect } from "next/navigation";
import { getOperator } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function HomePage() {
  const operator = await getOperator();
  if (operator) {
    redirect("/console");
  }

  return (
    <main className="min-h-screen bg-[#0b0d12] px-6 py-16 text-[#eef0f4]">
      <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f5a524]">
            Yobuyobu
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            MikroTik hotspot and PPPoE billing
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-[#9aa3b2]">
            Paste one script into Winbox. The router comes online, you choose
            ports and services, then customers pay with M-PESA and get access
            automatically.
          </p>
        </div>
        <div className="card p-8">
          <h2 className="text-xl font-semibold">Operator sign in</h2>
          <p className="mt-1 text-sm text-[#9aa3b2]">
            Use the same account for every router in this ISP.
          </p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
