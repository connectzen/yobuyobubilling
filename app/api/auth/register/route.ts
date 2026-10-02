import { cookies } from "next/headers";
import { hashPassword, sessionCookie } from "@/lib/auth";
import { sql } from "@/lib/db";
import { fail, ok } from "@/lib/api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "").trim();
  if (!email || !name || password.length < 8) {
    return fail("Name, email, and an 8+ character password are required");
  }

  const db = sql();
  const existing = await db`select id from operators where email = ${email} limit 1`;
  if (existing.length > 0) {
    return fail("An operator with that email already exists", 409);
  }

  const rows = await db<{ id: string }[]>`
    insert into operators (email, name, password_hash)
    values (${email}, ${name}, ${hashPassword(password)})
    returning id
  `;
  const cookie = sessionCookie(rows[0].id);
  cookies().set(cookie.name, cookie.value, cookie.options);
  return ok({ id: rows[0].id });
}
