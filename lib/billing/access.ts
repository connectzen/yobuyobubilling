import { randomBytes } from "node:crypto";

export type ServiceType = "hotspot" | "pppoe";

export type GrantAccessInput = {
  now: Date;
  durationMinutes: number;
  downloadKbps: number;
  uploadKbps: number;
  serviceType: ServiceType;
  username: string;
  password?: string;
  macAddress?: string;
};

function tryDo(command: string): string {
  return `:do { ${command} } on-error={}`;
}

export function grantAccess(input: GrantAccessInput) {
  if (input.durationMinutes <= 0) {
    throw new Error("Duration must be greater than zero");
  }

  const expiresAt = new Date(input.now.getTime() + input.durationMinutes * 60_000);
  const rate = `${input.downloadKbps}k/${input.uploadKbps}k`;
  const password = input.password ?? input.username;
  const mac = normalizeMac(input.macAddress);

  const lines =
    input.serviceType === "pppoe"
      ? [
          tryDo(`/ppp secret remove [find name="${input.username}"]`),
          tryDo(
            `/ppp secret add name=${input.username} password=${password} service=pppoe profile=yb-pppoe`,
          ),
        ]
      : [
          tryDo(`/ip hotspot user remove [find name="${input.username}"]`),
          tryDo(
            `/ip hotspot user add name=${input.username} password=${password} profile=yb-hotspot rate-limit=${rate}`,
          ),
        ];

  if (mac && input.serviceType === "hotspot") {
    lines.push(
      tryDo(`/ip hotspot ip-binding remove [find mac-address="${mac}"]`),
      tryDo(
        `/ip hotspot ip-binding add mac-address=${mac} type=bypassed server=yb-hotspot comment="yb-${input.username}"`,
      ),
      tryDo(`/ip hotspot cookie remove [find mac-address="${mac}"]`),
      tryDo(`/ip hotspot cookie add mac-address=${mac} user=${input.username}`),
      tryDo(
        `/ip hotspot active login user=${input.username} password=${password} mac-address=${mac}`,
      ),
      tryDo(`/ip hotspot host remove [find mac-address="${mac}"]`),
    );
  }

  return { expiresAt, script: lines.join("\n"), rate };
}

export function isExpired(expiresAt: Date, now: Date): boolean {
  return now.getTime() >= expiresAt.getTime();
}

export function kickScript(
  username: string,
  serviceType: ServiceType,
  macAddress?: string,
): string {
  if (serviceType === "pppoe") {
    return [
      tryDo(`/ppp active remove [find name="${username}"]`),
      tryDo(`/ppp secret disable [find name="${username}"]`),
    ].join("\n");
  }

  const lines = [
    tryDo(`/ip hotspot active remove [find user="${username}"]`),
    tryDo(`/ip hotspot user disable [find name="${username}"]`),
  ];
  const mac = normalizeMac(macAddress);
  if (mac) {
    lines.push(
      tryDo(`/ip hotspot ip-binding remove [find mac-address="${mac}"]`),
      tryDo(`/ip hotspot cookie remove [find mac-address="${mac}"]`),
      tryDo(`/ip hotspot host remove [find mac-address="${mac}"]`),
    );
  }
  return lines.join("\n");
}

export function randomHotspotUsername(): string {
  return `yb${randomBytes(5).toString("hex")}`;
}

export function usernameFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) {
    throw new Error("Phone number is required");
  }
  return digits;
}

export function normalizeMac(value?: string): string | undefined {
  const raw = (value ?? "").trim();
  if (!raw) {
    return undefined;
  }
  const hex = raw.toUpperCase().replace(/[^0-9A-F]/g, "");
  if (hex.length !== 12) {
    throw new Error("MAC address is invalid");
  }
  return hex.match(/.{2}/g)!.join(":");
}
