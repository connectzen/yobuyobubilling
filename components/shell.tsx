import Link from "next/link";
import type { Operator } from "@/lib/db";

const links = [
  ["Overview", "/console"],
  ["Routers", "/console/routers"],
  ["Plans", "/console/plans"],
  ["Subscribers", "/console/subscribers"],
  ["Vouchers", "/console/vouchers"],
  ["Payments", "/console/payments"],
  ["Sessions", "/console/sessions"],
];

export function Shell({
  operator,
  children,
}: {
  operator: Operator;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      <aside className="border-r border-line bg-black/30 px-4 py-6">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Yobuyobu</p>
        <p className="mt-2 text-sm text-zinc-400">{operator.name}</p>
        <nav className="mt-8 space-y-1">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="block rounded-md px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
            >
              {label}
            </Link>
          ))}
        </nav>
        <form action="/api/auth/logout" method="post" className="mt-10">
          <button className="btn-ghost w-full" type="submit">
            Sign out
          </button>
        </form>
      </aside>
      <section className="px-8 py-8">{children}</section>
    </div>
  );
}
