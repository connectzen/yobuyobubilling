import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { kenyaMpesaPhone, kenyaPhoneDisplay } from "../lib/billing/kenya-phone.ts";

describe("Kenya M-PESA phone numbers", () => {
  it("accepts a local 07 number", () => {
    assert.equal(kenyaMpesaPhone("0712345678"), "254712345678");
    assert.equal(kenyaPhoneDisplay("0712345678"), "0712345678");
  });

  it("accepts +254 and 254 forms and shows 07", () => {
    assert.equal(kenyaMpesaPhone("+254712345678"), "254712345678");
    assert.equal(kenyaMpesaPhone("254712345678"), "254712345678");
    assert.equal(kenyaPhoneDisplay("+254 712 345 678"), "0712345678");
    assert.equal(kenyaPhoneDisplay("712345678"), "0712345678");
  });

  it("rejects numbers that are not Kenyan 07 mobiles", () => {
    assert.throws(() => kenyaMpesaPhone("2547"), /07/);
    assert.throws(() => kenyaMpesaPhone("020123456"), /07/);
    assert.throws(() => kenyaMpesaPhone(""), /07/);
  });
});
