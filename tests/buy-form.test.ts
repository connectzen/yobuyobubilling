import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(new URL("../components/buy-form.tsx", import.meta.url), "utf8");

describe("captive portal buy form", () => {
  it("asks only for a Kenya 07 M-PESA number", () => {
    assert.match(source, /name="mpesa"/);
    assert.match(source, /0712345678/);
    assert.match(source, /start with 07/);
    assert.doesNotMatch(source, /Your name/i);
    assert.doesNotMatch(source, /name="customer"/i);
    assert.doesNotMatch(source, /placeholder="\+254/);
    assert.doesNotMatch(source, /placeholder="254/);
  });

  it("logs the phone into MikroTik after payment instead of only showing a message", () => {
    assert.match(source, /hotspotPapLoginUrl/);
    assert.match(source, /connectPhone/);
    assert.match(source, /location\.replace/);
    assert.match(source, /Connecting you now/);
    assert.doesNotMatch(source, /You can close this page/);
  });
});
