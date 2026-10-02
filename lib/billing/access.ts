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

export function grantAccess(input: GrantAccessInput) {
  if (input.durationMinutes <= 0) {
    throw new Error("Duration must be greater than zero");
  }

  const expiresAt = new Date(
    input.now.getTime() + input.durationMinutes * 60_000,
  );
  const rate = `${input.downloadKbps}k/${input.uploadKbps}k`;
  const password = input.password ?? input.username;

  const mac = normalizeMac(input.macAddress);
  const lines =
    input.serviceType === "pppoe"
      ? [
          `/ppp secret remove [find name="${input.username}"]`,
          `/ppp secret add name=${input.username} password=${password} service=pppoe profile=yb-pppoe`,
        ]
      : [
          `/ip hotspot user remove [find name="${input.username}"]`,
          `/ip hotspot user add name=${input.username} password=${password} profile=yb-hotspot rate-limit=${rate}`,
        ];

  if (mac && input.serviceType === "hotspot") {
    lines.push(
      `/ip hotspot ip-binding remove [find mac-address="${mac}"]`,
      `/ip hotspot ip-binding add mac-address=${mac} type=bypassed comment="yb-${input.username}"`,
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
      `/ppp active remove [find name="${username}"]`,
      `/ppp secret disable [find name="${username}"]`,
    ].join("\n");
  }

  const lines = [
    `/ip hotspot active remove [find user="${username}"]`,
    `/ip hotspot user disable [find name="${username}"]`,
  ];
  const mac = normalizeMac(macAddress);
  if (mac) {
    lines.push(`/ip hotspot ip-binding remove [find mac-address="${mac}"]`);
  }
  return lines.join("\n");
}

export function usernameFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) {
    throw new Error("Phone number is required");
  }
  return digits;
}

export function normalizeMac(value?: string): string | undefined {
  const mac = (value ?? "").trim().toUpperCase();
  if (!mac) {
    return undefined;
  }
  if (!/^([0-9A-F]{2}[:-]){5}[0-9A-F]{2}$/.test(mac)) {
    throw new Error("MAC address is invalid");
  }
  return mac.replace(/-/g, ":");
}
