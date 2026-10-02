import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { getOperator } from "@/lib/auth";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const operator = await getOperator();
  if (!operator) {
    redirect("/");
  }

  return <Shell operatorName={operator.name}>{children}</Shell>;
}
