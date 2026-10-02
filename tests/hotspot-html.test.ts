import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildHotspotHtml,
  clientMacFromQuery,
  HOTSPOT_HTML_FILES,
  hotspotTemplateUrl,
} from "../lib/mikrotik/hotspot-html.ts";

describe("MikroTik hotspot login HTML", () => {
  it("lists the files the router must install", () => {
    assert.deepEqual(HOTSPOT_HTML_FILES, [
      "login.html",
      "status.html",
      "logout.html",
      "error.html",
      "alogin.html",
      "redirect.html",
    ]);
  });

  it("builds the hosted template URL per router token", () => {
    assert.equal(
      hotspotTemplateUrl("https://safisaana.com/", "tok_abc", "login.html"),
      "https://safisaana.com/hotspot/tok_abc/login.html",
    );
  });

  it("redirects captive portal clients to the buy page with MikroTik MAC and IP", () => {
    const html = buildHotspotHtml("login.html", {
      appUrl: "https://safisaana.com",
      token: "tok_abc",
    });

    assert.match(html, /http-equiv="refresh"/i);
    assert.match(html, /https:\/\/safisaana\.com\/buy\/tok_abc\?mac=\$\(mac\)&ip=\$\(ip\)/);
    assert.match(html, /\$\(identity-mac\)/);
    assert.match(html, /location\.replace/);
    assert.match(html, /Buy internet/);
    assert.doesNotMatch(html, /name="username"/i);
    assert.doesNotMatch(html, /name="password"/i);
  });

  it("keeps error and redirect pages pointed at the package chooser", () => {
    for (const file of ["error.html", "redirect.html"] as const) {
      const html = buildHotspotHtml(file, {
        appUrl: "https://safisaana.com",
        token: "tok_abc",
      });
      assert.match(html, /\/buy\/tok_abc\?mac=\$\(mac\)/);
    }
  });

  it("shows a connected status page without a login form", () => {
    const html = buildHotspotHtml("status.html", {
      appUrl: "https://safisaana.com",
      token: "tok_abc",
    });
    assert.match(html, /connected/i);
    assert.doesNotMatch(html, /name="username"/i);
  });

  it("reads MAC from identity-mac when mac is empty", () => {
    assert.equal(clientMacFromQuery({ mac: "AA:BB:CC:DD:EE:FF" }), "AA:BB:CC:DD:EE:FF");
    assert.equal(clientMacFromQuery({ "identity-mac": "11:22:33:44:55:66" }), "11:22:33:44:55:66");
    assert.equal(clientMacFromQuery({ mac: "", "identity-mac": "11:22:33:44:55:66" }), "11:22:33:44:55:66");
    assert.equal(clientMacFromQuery({}), "");
  });
});
