# TDD evidence — Yobuyobu control plane

Source plan: written in this session from the Connectzen-style MikroTik billing brief. The leftover `v1-isp-billing.plan.md` was not used as implementation source.

## Journeys

- As an operator, I get a one-liner that fetches and imports a bootstrap `.rsc`.
- As an operator, I can push hotspot, PPPoE, and anti-sharing to selected ports.
- As billing, a paid package sets `expires_at` and writes the matching MikroTik user.
- As Paystack, only a valid HMAC SHA512 webhook signature is accepted.

## Results

| # | Guarantee | Test | Type | Result |
|---|-----------|------|------|--------|
| 1 | One-liner fetches `/provision/{token}` | `tests/provision.test.ts` | unit | PASS |
| 2 | Bootstrap script polls `/api/agent/{token}/sync` | `tests/provision.test.ts` | unit | PASS |
| 3 | Interface report parsing | `tests/provision.test.ts` | unit | PASS |
| 4 | Hotspot/PPPoE/anti-share scripts | `tests/services.test.ts` | unit | PASS |
| 5 | Grant duration and kick expiry | `tests/access.test.ts` | unit | PASS |
| 6 | Paystack signature verify | `tests/paystack.test.ts` | unit | PASS |

Command: `npm test` — 13 passing.
