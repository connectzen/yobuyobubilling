import postgres from "postgres";
import { getDatabaseUrl } from "./env";

const globalForSql = globalThis as typeof globalThis & {
  sql?: ReturnType<typeof postgres>;
};

export function sql() {
  if (!globalForSql.sql) {
    globalForSql.sql = postgres(getDatabaseUrl(), {
      max: 1,
      prepare: false,
      ssl: "require",
    });
  }
  return globalForSql.sql;
}

export type Operator = {
  id: string;
  email: string;
  name: string;
};

export type Router = {
  id: string;
  operator_id: string;
  name: string;
  token: string;
  status: "pending" | "online" | "offline" | "configured";
  wan_interface: string | null;
  lan_interface: string | null;
  hotspot_enabled: boolean;
  pppoe_enabled: boolean;
  anti_share_enabled: boolean;
  board_name: string | null;
  ros_version: string | null;
  identity_name: string | null;
  interfaces: { name: string; type: string }[];
  last_seen_at: string | null;
  created_at: string;
};

export type Plan = {
  id: string;
  operator_id: string;
  name: string;
  service_type: "hotspot" | "pppoe";
  duration_minutes: number;
  price_kes: number;
  download_kbps: number;
  upload_kbps: number;
  shared_users: number;
  active: boolean;
};

export type Subscriber = {
  id: string;
  operator_id: string;
  router_id: string;
  plan_id: string;
  name: string;
  phone: string;
  username: string;
  password: string;
  service_type: "hotspot" | "pppoe";
  status: "active" | "expired" | "disabled";
  expires_at: string | null;
  mac_address: string | null;
};

export type Voucher = {
  id: string;
  code: string;
  status: "unused" | "redeemed" | "expired";
  plan_id: string;
  router_id: string;
};

export type Payment = {
  id: string;
  reference: string;
  phone: string | null;
  amount_kes: number;
  status: "pending" | "success" | "failed";
  created_at: string;
};
