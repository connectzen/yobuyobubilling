import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getSessionSecret } from "./env";
import { sql, type Operator } from "./db";

const COOKIE = "yobuyobu_session";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) {
    return false;
  }
  const next = scryptSync(password, salt, 64);
  const current = Buffer.from(hash, "hex");
  return current.length === next.length && timingSafeEqual(current, next);
}

function sign(value: string): string {
  return createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

export function createSessionToken(operatorId: string): string {
  return `${operatorId}.${sign(operatorId)}`;
}

export function readSessionToken(token: string): string | null {
  const [operatorId, mac] = token.split(".");
  if (!operatorId || !mac) {
    return null;
  }
  const expected = sign(operatorId);
  const left = Buffer.from(expected);
  const right = Buffer.from(mac);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }
  return operatorId;
}

export async function getOperator(): Promise<Operator | null> {
  const jar = cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) {
    return null;
  }
  const operatorId = readSessionToken(raw);
  if (!operatorId) {
    return null;
  }
  const db = sql();
  const rows = await db<Operator[]>`
    select id, email, name from operators where id = ${operatorId} limit 1
  `;
  return rows[0] ?? null;
}

export function sessionCookie(operatorId: string) {
  return {
    name: COOKIE,
    value: createSessionToken(operatorId),
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    },
  };
}
