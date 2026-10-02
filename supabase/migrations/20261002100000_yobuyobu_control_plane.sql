-- Applied remotely as replace_legacy_schema.
-- Fresh operator, router, billing, and command-queue schema for Yobuyobu.
-- The live database already has this shape; keep this file as the source of truth.

create extension if not exists pgcrypto;

create table if not exists operators (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists routers (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id) on delete cascade,
  name text not null,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'online', 'offline', 'configured')),
  wan_interface text,
  lan_interface text,
  hotspot_enabled boolean not null default false,
  pppoe_enabled boolean not null default false,
  anti_share_enabled boolean not null default false,
  board_name text,
  ros_version text,
  identity_name text,
  interfaces jsonb not null default '[]'::jsonb,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists router_commands (
  id uuid primary key default gen_random_uuid(),
  router_id uuid not null references routers(id) on delete cascade,
  script text not null,
  status text not null default 'queued' check (status in ('queued', 'sent')),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id) on delete cascade,
  name text not null,
  service_type text not null check (service_type in ('hotspot', 'pppoe')),
  duration_minutes integer not null check (duration_minutes > 0),
  price_kes integer not null check (price_kes >= 0),
  download_kbps integer not null check (download_kbps > 0),
  upload_kbps integer not null check (upload_kbps > 0),
  shared_users integer not null default 1 check (shared_users >= 1),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id) on delete cascade,
  router_id uuid not null references routers(id) on delete cascade,
  plan_id uuid not null references plans(id),
  name text not null,
  phone text not null,
  username text not null,
  password text not null,
  service_type text not null check (service_type in ('hotspot', 'pppoe')),
  status text not null default 'active' check (status in ('active', 'expired', 'disabled')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  mac_address text
);

create table if not exists vouchers (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id) on delete cascade,
  router_id uuid not null references routers(id) on delete cascade,
  plan_id uuid not null references plans(id),
  code text not null unique,
  status text not null default 'unused' check (status in ('unused', 'redeemed', 'expired')),
  subscriber_id uuid references subscribers(id),
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id) on delete cascade,
  router_id uuid references routers(id),
  plan_id uuid references plans(id),
  subscriber_id uuid references subscribers(id),
  reference text not null unique,
  phone text,
  customer_name text not null default '',
  amount_kes integer not null,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  created_at timestamptz not null default now(),
  mac_address text
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  router_id uuid not null references routers(id) on delete cascade,
  username text not null,
  mac text,
  ip text,
  bytes_in bigint not null default 0,
  bytes_out bigint not null default 0,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table operators enable row level security;
alter table routers enable row level security;
alter table router_commands enable row level security;
alter table plans enable row level security;
alter table subscribers enable row level security;
alter table vouchers enable row level security;
alter table payments enable row level security;
alter table sessions enable row level security;

drop policy if exists operators_app on operators;
drop policy if exists routers_app on routers;
drop policy if exists router_commands_app on router_commands;
drop policy if exists plans_app on plans;
drop policy if exists subscribers_app on subscribers;
drop policy if exists vouchers_app on vouchers;
drop policy if exists payments_app on payments;
drop policy if exists sessions_app on sessions;

create policy operators_app on operators for all to yobuyobu_app using (true) with check (true);
create policy routers_app on routers for all to yobuyobu_app using (true) with check (true);
create policy router_commands_app on router_commands for all to yobuyobu_app using (true) with check (true);
create policy plans_app on plans for all to yobuyobu_app using (true) with check (true);
create policy subscribers_app on subscribers for all to yobuyobu_app using (true) with check (true);
create policy vouchers_app on vouchers for all to yobuyobu_app using (true) with check (true);
create policy payments_app on payments for all to yobuyobu_app using (true) with check (true);
create policy sessions_app on sessions for all to yobuyobu_app using (true) with check (true);
