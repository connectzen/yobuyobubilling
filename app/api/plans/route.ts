import { getOperator } from "@/lib/auth";
import { sql, type Plan } from "@/lib/db";
import { fail, ok } from "@/lib/api";

export async function POST(request: Request) {
  const operator = await getOperator();
  if (!operator) {
    return fail("Unauthorized", 401);
  }
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const serviceType = body?.serviceType === "pppoe" ? "pppoe" : "hotspot";
  const durationMinutes = Number(body?.durationMinutes);
  const priceKes = Number(body?.priceKes);
  const downloadKbps = Number(body?.downloadKbps);
  const uploadKbps = Number(body?.uploadKbps);
  if (!name || durationMinutes <= 0 || priceKes < 0 || downloadKbps <= 0 || uploadKbps <= 0) {
    return fail("Check name, duration, price, and speed values");
  }

  const db = sql();
  const rows = await db<Plan[]>`
    insert into plans (
      operator_id, name, service_type, duration_minutes, price_kes, download_kbps, upload_kbps
    ) values (
      ${operator.id}, ${name}, ${serviceType}, ${durationMinutes}, ${priceKes}, ${downloadKbps}, ${uploadKbps}
    )
    returning *
  `;
  return ok(rows[0], 201);
}
