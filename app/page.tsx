import { redirect } from "next/navigation";
import { getOperator } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function HomePage() {
  const operator = await getOperator();
  if (operator) {
    redirect("/console");
  }

  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Yobuyobu</p>
        <h1 className="mt-3 text-3xl font-semibold">ISP control plane</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Link a MikroTik, push hotspot or PPPoE, and sell packages with Paystack.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
