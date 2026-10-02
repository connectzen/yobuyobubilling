# Yobuyobu

Hotspot and PPPoE billing for MikroTik. An operator pastes one script into Winbox, the router phones home, and the console can push hotspot, PPPoE, anti-sharing, packages, vouchers, and Paystack M-PESA grants.

## Operator flow

1. Create an operator account.
2. Link a MikroTik and copy the provision one-liner into Terminal.
3. When the router is online, choose WAN/LAN plus Hotspot, PPPoE, and unit sharing.
4. Upload the configuration. The next 10-second poll applies it.
5. Sell packages, generate vouchers, or send a Paystack M-PESA prompt.

The cloud is the source of truth for expiry. Overdue sessions are kicked on the next poll.

## Stack

- Next.js App Router
- Supabase Postgres
- Paystack
- Vercel
