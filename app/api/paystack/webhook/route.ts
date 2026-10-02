import { applySuccessfulPayment } from "@/lib/billing/fulfill";
import { fail, ok } from "@/lib/api";
import { getPaystackSecret } from "@/lib/env";
import { verifyPaystackSignature } from "@/lib/paystack";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";
  if (!verifyPaystackSignature(body, signature, getPaystackSecret())) {
    return fail("Invalid signature", 401);
  }

  const event = JSON.parse(body);
  if (event.event !== "charge.success") {
    return ok({ ignored: true });
  }

  try {
    const grant = await applySuccessfulPayment(String(event.data?.reference ?? ""));
    return ok({
      granted: true,
      duplicate: grant.duplicate,
      username: grant.username,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Grant failed", 404);
  }
}
