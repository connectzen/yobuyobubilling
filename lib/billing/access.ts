import { randomBytes } from "node:crypto";
import { normalizeMac } from "./mac.ts";

export { normalizeMac };

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
  ipAddress?: string;
  sharedUsers?: number;
};

function tryDo(command: string): string {
  return `:do { ${command} } on-error={}`;
}

function rosLimitUptime(minutes: number): string {
  if (minutes % 1440 === 0) {
    return `${minutes / 1440}d`;
  }
  if (minutes % 60 === 0) {
    return `${minutes / 60}h`;
  }
  return `${minutes}m`;
}

function rosQuoted(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function rosValue(value: string): string {
  if (/^[A-Za-z0-9._:-]+$/.test(value)) {
    return value;
  }
  return rosQuoted(value);
}

function hotspotProfile(input: {
  uploadKbps: number;
  downloadKbps: number;
  sharedUsers: number;
}) {
  const sharedUsers = Math.max(1, Math.floor(input.sharedUsers));
  return {
    name: `yb-u${input.uploadKbps}-d${input.downloadKbps}-s${sharedUsers}`,
    rate: rosValue(`${input.uploadKbps}k/${input.downloadKbps}k`),
    sharedUsers,
  };
}

function normalizeClientIp(value?: string): string | undefined {
  const raw = (value ?? "").trim();
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(raw)) {
    return undefined;
  }
  return raw;
}

export function grantAccess(input: GrantAccessInput) {
  if (input.durationMinutes <= 0) {
    throw new Error("Duration must be greater than zero");
  }

  const expiresAt = new Date(input.now.getTime() + input.durationMinutes * 60_000);
  const password = input.password ?? input.username;
  const mac = normalizeMac(input.macAddress);
  const ip = normalizeClientIp(input.ipAddress);
  const uptime = rosLimitUptime(input.durationMinutes);
  const profile = hotspotProfile({
    uploadKbps: input.uploadKbps,
    downloadKbps: input.downloadKbps,
    sharedUsers: input.sharedUsers ?? 1,
  });

  const lines =
    input.serviceType === "pppoe"
      ? [
          tryDo(`/ppp secret remove [find name=${rosQuoted(input.username)}]`),
          `/ppp secret add name=${rosQuoted(input.username)} password=${rosQuoted(password)} service=pppoe profile=yb-pppoe limit-uptime=${uptime}`,
        ]
      : [
          `/log warning "yobuyobu paid ${input.username} ${uptime} ${mac ?? "nomac"} ${ip ?? "noip"}"`,
          tryDo(
            `/ip hotspot user profile add name=${profile.name} rate-limit=${profile.rate} shared-users=${profile.sharedUsers}`,
          ),
          tryDo(
            `/ip hotspot user profile set [find name=${rosQuoted(profile.name)}] rate-limit=${profile.rate} shared-users=${profile.sharedUsers}`,
          ),
          tryDo(`/ip hotspot user remove [find name=${rosQuoted(input.username)}]`),
          `/ip hotspot user add name=${rosQuoted(input.username)} password=${rosQuoted(password)} profile=${profile.name} limit-uptime=${uptime}${mac ? ` mac-address=${rosQuoted(mac)}` : ""} disabled=no`,
        ];

  if (mac && input.serviceType === "hotspot") {
    lines.push(
      tryDo(
        `/ip hotspot profile set [find name="yb-hotspot"] login-by="http-pap,mac-cookie,http-chap,mac"`,
      ),
      tryDo(`/ip hotspot ip-binding remove [find mac-address=${rosQuoted(mac)}]`),
      tryDo(`/ip hotspot cookie remove [find mac-address=${rosQuoted(mac)}]`),
    );
    if (ip) {
      lines.push(
        tryDo(
          `/ip hotspot active login user=${rosQuoted(input.username)} password=${rosQuoted(password)} mac-address=${rosQuoted(mac)} ip=${ip}`,
        ),
      );
    }
  }

  return { expiresAt, script: lines.join("\n"), rate: profile.rate };
}

export function paymentAlreadyProvisioned(payment: {
  status: string;
  subscriber_id: string | null;
}): boolean {
  return payment.status === "success" && Boolean(payment.subscriber_id);
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

export function resumeScript(
  username: string,
  serviceType: ServiceType,
  macAddress?: string,
): string {
  if (serviceType === "pppoe") {
    return tryDo(`/ppp secret enable [find name="${username}"]`);
  }

  const lines = [tryDo(`/ip hotspot user enable [find name="${username}"]`)];
  const mac = normalizeMac(macAddress);
  if (mac) {
    lines.push(
      tryDo(
        `/ip hotspot profile set [find name="yb-hotspot"] login-by="http-pap,mac-cookie,http-chap,mac"`,
      ),
      tryDo(`/ip hotspot ip-binding remove [find mac-address="${mac}"]`),
      tryDo(`/ip hotspot cookie remove [find mac-address="${mac}"]`),
    );
  }
  return lines.join("\n");
}

export function removeAccessScript(
  username: string,
  serviceType: ServiceType,
  macAddress?: string,
): string {
  if (serviceType === "pppoe") {
    return [
      tryDo(`/ppp active remove [find name="${username}"]`),
      tryDo(`/ppp secret remove [find name="${username}"]`),
    ].join("\n");
  }

  const lines = [
    tryDo(`/ip hotspot active remove [find user="${username}"]`),
    tryDo(`/ip hotspot user remove [find name="${username}"]`),
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
