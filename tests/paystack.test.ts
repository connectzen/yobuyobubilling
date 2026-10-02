import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { verifyPaystackSignature } from "../lib/paystack.ts";

describe("Paystack webhook signature", () => {
  it("accepts a matching HMAC SHA512 signature", () => {
    const body = JSON.stringify({ event: "charge.success" });
    const secret = "sk_test_example";
    const signature = createHmac("sha512", secret).update(body).digest("hex");
    assert.equal(verifyPaystackSignature(body, signature, secret), true);
  });

  it("rejects a missing or wrong signature", () => {
    const body = JSON.stringify({ event: "charge.success" });
    assert.equal(verifyPaystackSignature(body, "", "sk_test_example"), false);
    assert.equal(verifyPaystackSignature(body, "deadbeef", "sk_test_example"), false);
  });
});
