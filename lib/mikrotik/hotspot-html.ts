import { normalizeMac } from "../billing/mac.ts";

export const HOTSPOT_HTML_FILES = [
  "login.html",
  "status.html",
  "logout.html",
  "error.html",
  "alogin.html",
  "redirect.html",
] as const;

export type HotspotHtmlFile = (typeof HOTSPOT_HTML_FILES)[number];

export type HotspotHtmlInput = {
  appUrl: string;
  token: string;
};

const PAGE_STYLE =
  "body{margin:0;padding:2rem;font-family:sans-serif;background:#0b0d12;color:#eef0f4}a{color:#f5a524}";

export function isHotspotHtmlFile(value: string): value is HotspotHtmlFile {
  return (HOTSPOT_HTML_FILES as readonly string[]).includes(value);
}

export function hotspotTemplateUrl(appUrl: string, token: string, file: string): string {
  return `${trimAppUrl(appUrl)}/hotspot/${encodeURIComponent(token)}/${file}`;
}

export function clientMacFromQuery(params: {
  mac?: string;
  "identity-mac"?: string;
}): string {
  const raw = (params.mac || params["identity-mac"] || "").trim();
  try {
    return normalizeMac(raw) ?? "";
  } catch {
    return "";
  }
}

export function clientIpFromQuery(params: { ip?: string }): string {
  const raw = (params.ip ?? "").trim();
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(raw)) {
    return "";
  }
  return raw;
}

export function buildHotspotHtml(file: string, input: HotspotHtmlInput): string {
  if (!isHotspotHtmlFile(file)) {
    throw new Error("Unknown hotspot file");
  }
  if (file === "status.html" || file === "alogin.html") {
    return htmlPage("Connected", "<p>You are connected.</p>");
  }
  if (file === "logout.html") {
    return htmlPage(
      "Logged out",
      `<p>You are logged out.</p><p><a href="${buyRedirectUrl(input)}">Buy internet</a></p>`,
    );
  }
  return redirectPage(input);
}

function trimAppUrl(appUrl: string): string {
  return appUrl.replace(/\/$/, "");
}

function buyPageUrl(input: HotspotHtmlInput): string {
  return `${trimAppUrl(input.appUrl)}/buy/${encodeURIComponent(input.token)}`;
}

function buyRedirectUrl(input: HotspotHtmlInput): string {
  return `${buyPageUrl(input)}?v=3&mac=$(mac)&ip=$(ip)`;
}

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
${body}
</body>
</html>`;
}

function redirectPage(input: HotspotHtmlInput): string {
  const dest = buyRedirectUrl(input);
  const buy = buyPageUrl(input);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0;url=${dest}">
<title>Buy internet</title>
<style>${PAGE_STYLE}</style>
<script>
(function () {
  var mac = "$(mac)";
  if (!mac) { mac = "$(identity-mac)"; }
  var ip = "$(ip)";
  var url = "${buy}?v=3&mac=" + encodeURIComponent(mac) + "&ip=" + encodeURIComponent(ip);
  location.replace(url);
})();
</script>
</head>
<body>
<p>Opening packages...</p>
<p><a href="${dest}">Buy internet</a></p>
</body>
</html>`;
}
