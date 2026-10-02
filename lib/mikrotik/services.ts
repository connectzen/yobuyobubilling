export type ServiceConfigInput = {
  wanInterface: string;
  lanInterface: string;
  hotspot: boolean;
  pppoe: boolean;
  antiShare: boolean;
  buyHost?: string;
};

function requirePort(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }
  return trimmed;
}

export function buildServiceConfigScript(input: ServiceConfigInput): string {
  const wan = requirePort(input.wanInterface, "WAN interface");
  const lan = requirePort(input.lanInterface, "LAN interface");
  if (wan === lan) {
    throw new Error("WAN and LAN must be different ports");
  }
  if (!input.hotspot && !input.pppoe) {
    throw new Error("Choose hotspot or PPPoE");
  }

  const lines = [
    `/ip firewall nat remove [find comment="yobuyobu-masquerade"]`,
    `/ip firewall nat add chain=srcnat out-interface=${wan} action=masquerade comment=yobuyobu-masquerade`,
  ];

  if (input.hotspot) {
    lines.push(
      `/ip pool remove [find name="yb-hotspot"]`,
      `/ip pool add name=yb-hotspot ranges=10.10.0.10-10.10.0.254`,
      `/ip address remove [find comment="yobuyobu-hotspot"]`,
      `/ip address add address=10.10.0.1/24 interface=${lan} comment=yobuyobu-hotspot`,
      `/ip hotspot profile remove [find name="yb-hotspot"]`,
      `/ip hotspot profile add name=yb-hotspot hotspot-address=10.10.0.1 dns-name=hotspot.yobuyobu login-by=http-chap,http-pap,mac-cookie`,
      `/ip hotspot user profile remove [find name="yb-hotspot"]`,
      `/ip hotspot user profile add name=yb-hotspot shared-users=${input.antiShare ? "1" : "2"} rate-limit=10M/2M`,
      `/ip hotspot remove [find name="yb-hotspot"]`,
      `/ip hotspot add name=yb-hotspot interface=${lan} address-pool=yb-hotspot profile=yb-hotspot`,
    );
    if (input.buyHost) {
      lines.push(
        `/ip hotspot walled-garden remove [find comment="yobuyobu-buy"]`,
        `/ip hotspot walled-garden add dst-host=${input.buyHost} comment=yobuyobu-buy`,
      );
    }
  }

  if (input.pppoe) {
    lines.push(
      `/ip pool remove [find name="yb-pppoe"]`,
      `/ip pool add name=yb-pppoe ranges=10.20.0.10-10.20.0.254`,
      `/ppp profile remove [find name="yb-pppoe"]`,
      `/ppp profile add name=yb-pppoe local-address=10.20.0.1 remote-address=yb-pppoe rate-limit=10M/2M only-one=${input.antiShare ? "yes" : "no"}`,
      `/interface pppoe-server server remove [find service-name="yb-pppoe"]`,
      `/interface pppoe-server server add service-name=yb-pppoe interface=${lan} default-profile=yb-pppoe authentication=pap,chap,mschap2`,
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
