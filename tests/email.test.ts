import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeOperatorEmail } from "../lib/email.ts";

describe("operator email", () => {
  it("trims and lowercases a valid address", () => {
    assert.equal(normalizeOperatorEmail("  ConnectZen013@Gmail.com "), "connectzen013@gmail.com");
  });

  it("rejects a domain with no dot", () => {
    assert.equal(normalizeOperatorEmail("connectzen013@gmailcom"), null);
  });

  it("rejects an empty value", () => {
    assert.equal(normalizeOperatorEmail("   "), null);
  });
});
