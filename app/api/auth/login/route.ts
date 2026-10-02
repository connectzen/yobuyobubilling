import { cookies } from "next/headers";
import { sessionCookie, verifyPassword } from "@/lib/auth";
import { sql } from "@/lib/db";
import { normalizeOperatorEmail } from "@/lib/email";
import { fail, ok } from "@/lib/api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = normalizeOperatorEmail(String(body?.email ?? ""));
  const password = String(body?.password ?? "");
  if (!email) {
    return fail("Invalid email or password", 401);
  }
  const db = sql();
  const rows = await db<{ id: string; password_hash: string }[]>`
    select id, password_hash from operators where email = ${email} limit 1
  `;
  const operator = rows[0];
  if (!operator || !verifyPassword(password, operator.password_hash)) {
    return fail("Invalid email or password", 401);
  }
  const cookie = sessionCookie(operator.id);
  cookies().set(cookie.name, cookie.value, cookie.options);
  return ok({ id: operator.id });
}
