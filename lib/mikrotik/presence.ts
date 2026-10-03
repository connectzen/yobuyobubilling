export type HotspotPresence = {
  username: string;
  mac: string | null;
  ip: string | null;
  state: "active" | "account" | "bypassed";
};

const NAME = /^[A-Za-z0-9._-]{1,40}$/;
const MAC = /^(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
const IP = /^(?:\d{1,3}\.){3}\d{1,3}$/;

function cleanName(value: string): string | null {
  const name = value.trim();
  return NAME.test(name) ? name : null;
}

function cleanMac(value: string): string | null {
  const mac = value.trim().toUpperCase();
  return MAC.test(mac) ? mac : null;
}

function cleanIp(value: string): string | null {
  const ip = value.trim();
  return IP.test(ip) ? ip : null;
}

export function parseHotspotReport(input: {
  users?: string;
  actives?: string;
  bypass?: string;
}): HotspotPresence[] {
  const active: HotspotPresence[] = [];
  for (const part of (input.actives ?? "").split(";")) {
    const [username, ip, mac] = part.split("|");
    const name = cleanName(username ?? "");
    if (!name) {
      continue;
    }
    active.push({
      username: name,
      ip: cleanIp(ip ?? ""),
      mac: cleanMac(mac ?? ""),
      state: "active",
    });
  }

  const online = new Set(active.map((row) => row.username));
  const accounts: HotspotPresence[] = [];
  for (const part of (input.users ?? "").split(",")) {
    const name = cleanName(part);
    if (!name || online.has(name)) {
      continue;
    }
    accounts.push({ username: name, mac: null, ip: null, state: "account" });
  }

  const bypassed: HotspotPresence[] = [];
  for (const part of (input.bypass ?? "").split(";")) {
    const [mac, comment] = part.split("|");
    const cleanedMac = cleanMac(mac ?? "");
    if (!cleanedMac) {
      continue;
    }
    const fromComment = cleanName((comment ?? "").replace(/^yb-/, ""));
    bypassed.push({
      username: fromComment ?? "bypassed",
      mac: cleanedMac,
      ip: null,
      state: "bypassed",
    });
  }

  return [...active, ...accounts, ...bypassed];
}
