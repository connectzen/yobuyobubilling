export type ServiceType = "hotspot" | "pppoe";

export type GrantAccessInput = {
  now: Date;
  durationMinutes: number;
  downloadKbps: number;
  uploadKbps: number;
  serviceType: ServiceType;
  username: string;
  password?: string;
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

  const script =
    input.serviceType === "pppoe"
      ? [
          `/ppp secret remove [find name="${input.username}"]`,
          `/ppp secret add name=${input.username} password=${password} service=pppoe profile=yb-pppoe`,
        ].join("\n")
      : [
          `/ip hotspot user remove [find name="${input.username}"]`,
          `/ip hotspot user add name=${input.username} password=${password} profile=yb-hotspot rate-limit=${rate}`,
        ].join("\n");

  return { expiresAt, script, rate };
}

export function isExpired(expiresAt: Date, now: Date): boolean {
  return now.getTime() >= expiresAt.getTime();
}

export function kickScript(username: string, serviceType: ServiceType): string {
  if (serviceType === "pppoe") {
    return [
      `/ppp active remove [find name="${username}"]`,
      `/ppp secret disable [find name="${username}"]`,
    ].join("\n");
  }

  return [
    `/ip hotspot active remove [find user="${username}"]`,
    `/ip hotspot user disable [find name="${username}"]`,
  ].join("\n");
}
