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
  buyHost?: string;
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

export function customerLanPorts(wanInterface: string, ports: RouterPort[] | unknown): string[] {
  const wan = wanInterface.trim();
  return normalizeRouterPorts(ports)
    .filter((port) => isCustomerPort(port, wan))
    .map((port) => port.name);
}

export function buildServiceConfigScript(input: ServiceConfigInput): string {
  const wan = requirePort(input.wanInterface, "WAN interface");
  const lanPorts = customerLanPorts(wan, input.ports);
  if (lanPorts.length === 0) {
    throw new Error("Choose a WAN port so the remaining ports can be used for customers");
  }
  if (!input.hotspot && !input.pppoe) {
    throw new Error("Choose hotspot or PPPoE");
  }

  const lines = [
    tryDo(`/ip hotspot remove [find name="yb-hotspot"]`),
    tryDo(`/interface pppoe-server server remove [find service-name="yb-pppoe"]`),
    tryDo(`/ip address remove [find comment="yobuyobu-hotspot"]`),
    tryDo(`/interface bridge port remove [find comment="yobuyobu-lan"]`),
    tryDo(`/interface bridge remove [find name="${LAN_BRIDGE}"]`),
    tryDo(`/interface bridge add name=${LAN_BRIDGE} comment=yobuyobu-lan`),
    tryDo(`/interface list add name=WAN comment=yobuyobu`),
    tryDo(`/interface list add name=LAN comment=yobuyobu`),
    tryDo(`/interface list member remove [find interface="${LAN_BRIDGE}"]`),
    tryDo(`/interface list member add list=LAN interface=${LAN_BRIDGE}`),
    tryDo(`/interface list member remove [find interface="${wan}"]`),
    tryDo(`/interface list member add list=WAN interface=${wan}`),
  ];

  for (const port of lanPorts) {
    lines.push(
      tryDo(`/interface bridge port remove [find interface="${port}"]`),
      tryDo(`/interface bridge port add bridge=${LAN_BRIDGE} interface=${port} comment=yobuyobu-lan`),
    );
  }

  lines.push(
    tryDo(`/ip firewall nat remove [find comment="yobuyobu-masquerade"]`),
    tryDo(`/ip firewall nat add chain=srcnat out-interface=${wan} action=masquerade comment=yobuyobu-masquerade`),
  );

  if (input.hotspot) {
    lines.push(
      tryDo(`/ip pool remove [find name="yb-hotspot"]`),
      tryDo(`/ip pool add name=yb-hotspot ranges=10.10.0.10-10.10.0.254`),
      tryDo(`/ip address add address=10.10.0.1/24 interface=${LAN_BRIDGE} comment=yobuyobu-hotspot`),
      tryDo(`/ip hotspot profile remove [find name="yb-hotspot"]`),
      tryDo(`/ip hotspot profile add name=yb-hotspot hotspot-address=10.10.0.1 dns-name=hotspot.yobuyobu login-by="http-chap,http-pap,mac-cookie"`),
      tryDo(`/ip hotspot user profile remove [find name="yb-hotspot"]`),
      tryDo(`/ip hotspot user profile add name=yb-hotspot shared-users=${input.antiShare ? "1" : "2"} rate-limit=${rosValue("10M/2M")}`),
      tryDo(`/ip hotspot add name=yb-hotspot interface=${LAN_BRIDGE} address-pool=yb-hotspot profile=yb-hotspot`),
    );
    if (input.buyHost) {
      lines.push(
        tryDo(`/ip hotspot walled-garden remove [find comment="yobuyobu-buy"]`),
        tryDo(`/ip hotspot walled-garden add dst-host=${input.buyHost} comment=yobuyobu-buy`),
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
