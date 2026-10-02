"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const groups = [
  {
    label: "Operate",
    items: [
      ["Overview", "/console"],
      ["Routers", "/console/routers"],
      ["Sessions", "/console/sessions"],
    ],
  },
  {
    label: "Network",
    items: [
      ["Plans", "/console/plans"],
      ["Subscribers", "/console/subscribers"],
      ["Vouchers", "/console/vouchers"],
    ],
  },
  {
    label: "Finance",
    items: [["Payments", "/console/payments"]],
  },
];

export function Shell({
  operatorName,
  children,
}: {
  operatorName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initials = operatorName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="min-h-screen bg-[#0b0d12] text-[#eef0f4] sm:grid sm:grid-cols-[220px_1fr] lg:grid-cols-[248px_1fr]">
      <aside className="flex flex-col border-b border-[#252a35] bg-[#10131a] sm:min-h-screen sm:border-b-0 sm:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-4 sm:justify-start sm:py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#f5a524] text-sm font-bold text-[#16130c]">
              YB
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide">Yobuyobu</p>
              <p className="text-xs text-[#9aa3b2]">ISP billing</p>
            </div>
          </div>
          <form action="/api/auth/logout" method="post" className="sm:hidden">
            <button className="btn-ghost px-3 py-2 text-xs" type="submit">
              Sign out
            </button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 sm:block sm:overflow-visible sm:px-3 sm:pb-4">
          {groups.map((group) => (
            <div key={group.label} className="mt-0 flex shrink-0 items-center gap-1 sm:mt-4 sm:block sm:items-stretch">
              <p className="hidden px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6f7887] sm:block">
                {group.label}
              </p>
              <div className="flex gap-1 sm:mt-1 sm:block sm:space-y-1 sm:gap-0">
                {group.items.map(([label, href]) => {
                  const active =
                    href === "/console"
                      ? pathname === "/console"
                      : pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
                        active
                          ? "bg-[#f5a524]/15 font-medium text-[#f5a524]"
                          : "text-[#c5cad3] hover:bg-white/5"
                      }`}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-[#252a35] px-4 py-4 sm:block">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#f5a524] text-xs font-bold text-[#16130c]">
              {initials || "OP"}
            </div>
            <p className="truncate text-sm text-[#c5cad3]">{operatorName}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button className="btn-ghost w-full" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <section className="min-h-screen bg-[#0b0d12] px-5 py-6 sm:px-8 sm:py-8 lg:px-10">{children}</section>
    </div>
  );
}
