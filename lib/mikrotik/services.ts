import { HOTSPOT_HTML_FILES, hotspotTemplateUrl } from "./hotspot-html.ts";

export type RouterPort = {
  name: string;
  type: string;
};

export type ServiceConfigInput = {
  wanInterface: string;
  ports: RouterPort[] | unknown;
  hotspot: boolean;
  pppoe: boolean;
  antiShare: boolean;
  ssid?: string;
  buyHost?: string;
  appUrl?: string;
  routerToken?: string;
};

const LAN_BRIDGE = "yb-lan";
const SKIP_TYPES = new Set(["bridge", "loopback"]);

function requirePort(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }
  return trimmed;
}

function tryDo(command: string): string {
  return `:do { ${command} } on-error={}`;
}

function rosValue(value: string): string {
  if (/^[A-Za-z0-9._:-]+$/.test(value)) {
    return value;
  }
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function toolFetch(appUrl: string, url: string, dstPath: string): string {
  const cert = /^https:/i.test(appUrl) ? " check-certificate=no" : "";
  return tryDo(`/tool fetch${cert} url="${url}" dst-path=${rosValue(dstPath)}`);
}

export function normalizeRouterPorts(ports: unknown): RouterPort[] {
  let list: unknown = ports;
  if (typeof ports === "string") {
    try {
      list = JSON.parse(ports);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) {
    return [];
  }
  return list.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const name = String((item as { name?: unknown }).name ?? "").trim();
    const type = String((item as { type?: unknown }).type ?? "unknown").trim() || "unknown";
    if (!name) {
      return [];
    }
    return [{ name, type }];
  });
}

function isCustomerPort(port: RouterPort, wan: string): boolean {
  if (!port.name || port.name === wan || port.name === "lo") {
    return false;
  }
  return !SKIP_TYPES.has(port.type.toLowerCase());
}

function isWifiwavePort(port: RouterPort): boolean {
  const type = port.type.toLowerCase();
  const name = port.name.toLowerCase();
  return type === "wifi" || name.startsWith("wifi");
}

function isClassicWlanPort(port: RouterPort): boolean {
  const type = port.type.toLowerCase();
  const name = port.name.toLowerCase();
  return type === "wlan" || name.startsWith("wlan");
}

export function hotspotSsid(value?: string): string {
  const cleaned = (value ?? "").trim().replace(/["\\]/g, "").slice(0, 32);
  return cleaned || "Yobuyobu";
}

export function customerLanPortRecords(
  wanInterface: string,
  ports: RouterPort[] | unknown,
): RouterPort[] {
  const wan = wanInterface.trim();
  return normalizeRouterPorts(ports).filter((port) => isCustomerPort(port, wan));
}

export function customerLanPorts(wanInterface: string, ports: RouterPort[] | unknown): string[] {
  return customerLanPortRecords(wanInterface, ports).map((port) => port.name);
}

export function buildServiceConfigScript(input: ServiceConfigInput): string {
  const wan = requirePort(input.wanInterface, "WAN interface");
  const lanPortRecords = customerLanPortRecords(wan, input.ports);
  const lanPorts = lanPortRecords.map((port) => port.name);
  if (lanPorts.length === 0) {
    throw new Error("Choose a WAN port so the remaining ports can be used for customers");
  }
  if (!input.hotspot && !input.pppoe) {
    throw new Error("Choose hotspot or PPPoE");
  }

  const ssid = hotspotSsid(input.ssid);
  const wifiwavePorts = lanPortRecords.filter(isWifiwavePort);
  const classicWlanPorts = lanPortRecords.filter(isClassicWlanPort);

  const lines = [
    `/log warning "yobuyobu applying LAN and services"`,
    tryDo(`/ip hotspot remove [find name="yb-hotspot"]`),
    tryDo(`/interface pppoe-server server remove [find service-name="yb-pppoe"]`),
    tryDo(`/ip dhcp-server remove [find name="yb-hotspot"]`),
    tryDo(`/ip dhcp-server network remove [find comment="yobuyobu-hotspot"]`),
    tryDo(`/ip dhcp-server disable [find interface="bridge"]`),
    tryDo(`/ip address remove [find comment="yobuyobu-hotspot"]`),
    tryDo(`/interface wifi datapath remove [find name="yb-hotspot"]`),
    tryDo(`/interface bridge port remove [find comment="yobuyobu-lan"]`),
    tryDo(`/interface bridge remove [find name="${LAN_BRIDGE}"]`),
    tryDo(`/interface bridge add name=${LAN_BRIDGE} comment=yobuyobu-lan protocol-mode=none`),
    tryDo(`/interface list add name=WAN comment=yobuyobu`),
    tryDo(`/interface list add name=LAN comment=yobuyobu`),
    tryDo(`/interface list member remove [find interface="${LAN_BRIDGE}"]`),
    tryDo(`/interface list member add list=LAN interface=${LAN_BRIDGE}`),
    tryDo(`/interface list member remove [find interface="${wan}"]`),
    tryDo(`/interface list member add list=WAN interface=${wan}`),
  ];

  for (const port of lanPortRecords) {
    lines.push(
      tryDo(`/interface bridge port remove [find interface="${port.name}"]`),
      tryDo(
        `/interface bridge port add bridge=${LAN_BRIDGE} interface=${port.name} comment=yobuyobu-lan`,
      ),
    );
  }

  if (wifiwavePorts.length > 0) {
    for (const port of wifiwavePorts) {
      lines.push(
        tryDo(`/interface list member remove [find interface="${port.name}"]`),
        tryDo(`/interface list member add list=LAN interface=${port.name}`),
        tryDo(
          `/interface wifi set [find name="${port.name}"] disabled=no configuration.ssid=${rosValue(ssid)} configuration.mode=ap`,
        ),
        tryDo(`/interface wifi set [find name="${port.name}"] datapath.bridge=${LAN_BRIDGE}`),
        tryDo(`/interface wifi set [find name="${port.name}"] datapath.client-isolation=no`),
        tryDo(`/interface wifi set [find name="${port.name}"] security.authentication-types=""`),
      );
    }
  }

  for (const port of classicWlanPorts) {
    lines.push(
      tryDo(
        `/interface wireless set [find name="${port.name}"] mode=ap-bridge ssid=${rosValue(ssid)} disabled=no`,
      ),
    );
  }

  lines.push(
    tryDo(`/ip firewall nat remove [find comment="yobuyobu-masquerade"]`),
    tryDo(`/ip firewall nat add chain=srcnat out-interface=${wan} action=masquerade comment=yobuyobu-masquerade`),
    tryDo(`/ip firewall filter remove [find comment="yobuyobu-dhcp"]`),
    tryDo(
      `/ip firewall filter add chain=input action=accept protocol=udp dst-port=67-68 comment=yobuyobu-dhcp place-before=0`,
    ),
    tryDo(`/ip firewall filter remove [find comment="yobuyobu-lan-in"]`),
    tryDo(`/ip firewall filter remove [find comment="yobuyobu-fwd"]`),
    tryDo(`/ip dns set allow-remote-requests=yes`),
  );

  if (input.hotspot) {
    lines.push(
      tryDo(`/ip pool remove [find name="yb-hotspot"]`),
      tryDo(`/ip pool add name=yb-hotspot ranges=10.10.0.10-10.10.0.254`),
      tryDo(`/ip address add address=10.10.0.1/24 interface=${LAN_BRIDGE} comment=yobuyobu-hotspot`),
      tryDo(`/ip dhcp-server add name=yb-hotspot interface=${LAN_BRIDGE} address-pool=yb-hotspot authoritative=yes disabled=no`),
      tryDo(`/ip dhcp-server network add address=10.10.0.0/24 gateway=10.10.0.1 dns-server=1.1.1.1,8.8.8.8 comment=yobuyobu-hotspot`),
      tryDo(`/ip hotspot profile remove [find name="yb-hotspot"]`),
      tryDo(`/ip hotspot profile add name=yb-hotspot hotspot-address=10.10.0.1 dns-name=hotspot.yobuyobu html-directory=hotspot login-by="http-pap,mac-cookie,http-chap"`),
      tryDo(`/ip hotspot user profile remove [find name="yb-hotspot"]`),
      tryDo(`/ip hotspot user profile add name=yb-hotspot shared-users=${input.antiShare ? "1" : "2"} rate-limit=${rosValue("10M/2M")}`),
      tryDo(`/ip hotspot add name=yb-hotspot interface=${LAN_BRIDGE} address-pool=yb-hotspot profile=yb-hotspot disabled=no`),
    );
    if (input.buyHost) {
      const host = rosValue(input.buyHost);
      const wildcard = rosValue(`*.${input.buyHost}`);
      lines.push(
        tryDo(`/ip hotspot walled-garden remove [find comment="yobuyobu-buy"]`),
        tryDo(`/ip hotspot walled-garden add dst-host=${host} comment=yobuyobu-buy`),
        tryDo(`/ip hotspot walled-garden add dst-host=${wildcard} comment=yobuyobu-buy`),
        tryDo(`/ip hotspot walled-garden ip remove [find comment="yobuyobu-buy"]`),
        tryDo(`/ip hotspot walled-garden ip add dst-host=${host} action=accept comment=yobuyobu-buy`),
      );
    }
    const appUrl = input.appUrl?.trim().replace(/\/$/, "") ?? "";
    const token = input.routerToken?.trim() ?? "";
    if (appUrl && token) {
      for (const file of HOTSPOT_HTML_FILES) {
        lines.push(
          toolFetch(appUrl, hotspotTemplateUrl(appUrl, token, file), `hotspot/${file}`),
        );
      }
      lines.push(
        ":delay 2s",
        tryDo(`/ip hotspot profile set [find name="yb-hotspot"] html-directory=hotspot`),
      );
    }
  }

  if (input.pppoe) {
    lines.push(
      tryDo(`/ip pool remove [find name="yb-pppoe"]`),
      tryDo(`/ip pool add name=yb-pppoe ranges=10.20.0.10-10.20.0.254`),
      tryDo(`/ppp profile remove [find name="yb-pppoe"]`),
      tryDo(`/ppp profile add name=yb-pppoe local-address=10.20.0.1 remote-address=yb-pppoe rate-limit=${rosValue("10M/2M")} only-one=${input.antiShare ? "yes" : "no"}`),
      tryDo(`/interface pppoe-server server add service-name=yb-pppoe interface=${LAN_BRIDGE} default-profile=yb-pppoe authentication="pap,chap,mschap2"`),
    );
  }

  if (input.antiShare) {
    lines.push(
      `:if ([:len [/ip hotspot user profile find]] > 0) do={ /ip hotspot user profile set [find] shared-users=1 }`,
      `:if ([:len [/ppp profile find]] > 0) do={ /ppp profile set [find] only-one=yes }`,
    );
  }

  return lines.join("\n");
}
