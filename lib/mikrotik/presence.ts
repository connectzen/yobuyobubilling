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
  const active = (input.actives ?? "")
    .split(";")
    .map((part) => {
      const [username, ip, mac] = part.split("|");
      const name = cleanName(username ?? "");
      if (!name) {
        return null;
      }
      return {
        username: name,
        ip: cleanIp(ip ?? ""),
        mac: cleanMac(mac ?? ""),
        state: "active" as const,
      };
    })
    .filter((row): row is HotspotPresence => Boolean(row));

  const online = new Set(active.map((row) => row.username));
  const accounts = (input.users ?? "")
    .split(",")
    .map((name) => cleanName(name))
    .filter((name): name is string => Boolean(name) && !online.has(name))
    .map((username) => ({
      username,
      mac: null,
      ip: null,
      state: "account" as const,
    }));

  const bypassed = (input.bypass ?? "")
    .split(";")
    .map((part) => {
      const [mac, comment] = part.split("|");
      const cleanedMac = cleanMac(mac ?? "");
      if (!cleanedMac) {
        return null;
      }
      const fromComment = cleanName((comment ?? "").replace(/^yb-/, ""));
      return {
        username: fromComment ?? "bypassed",
        mac: cleanedMac,
        ip: null,
        state: "bypassed" as const,
      };
    })
    .filter((row): row is HotspotPresence => Boolean(row));

  return [...active, ...accounts, ...bypassed];
}
