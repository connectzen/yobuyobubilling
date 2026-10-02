export type RouterPort = {
  name: string;
  type: string;
};

function requireText(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }
  return trimmed;
}

function escapeRouterOs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function fetchMode(appUrl: string): "http" | "https" {
  return appUrl.startsWith("https://") ? "https" : "http";
}

function fetchFlags(appUrl: string): string {
  // RouterOS treats mode=https plus url="https://..." as a conflict.
  // check-certificate=yes fails on boxes without trusted CAs (common on 7.19).
  return fetchMode(appUrl) === "https" ? " check-certificate=no" : "";
}

export function buildProvisionOneLiner(input: {
  appUrl: string;
  token: string;
}): string {
  const appUrl = requireText(input.appUrl, "App URL").replace(/\/$/, "");
  const token = requireText(input.token, "Token");
  const url = `${appUrl}/provision/${encodeURIComponent(token)}`;
  return `{/tool fetch${fetchFlags(appUrl)} url="${url}" dst-path=yobuyobu.rsc; :delay 2s; /import yobuyobu.rsc;}`;
}

export function buildBootstrapScript(input: {
  appUrl: string;
  token: string;
  routerName: string;
}): string {
  const appUrl = requireText(input.appUrl, "App URL").replace(/\/$/, "");
  const token = requireText(input.token, "Token");
  const routerName = escapeRouterOs(requireText(input.routerName, "Router name"));
  const syncUrl = `${appUrl}/api/agent/${token}/sync`;

  return `
# Yobuyobu agent bootstrap
/system identity set name="${routerName}"
/system script remove [find name="yobuyobu-agent"]
/system scheduler remove [find name="yobuyobu-agent"]
/system script add name=yobuyobu-agent policy=read,write,policy,test,sensitive,ftp source={
  :local names ""
  :foreach i in=[/interface find] do={
    :set names ($names . [/interface get $i name] . ":" . [/interface get $i type] . ",")
  }
  :local id [/system identity get name]
  :local ver [/system resource get version]
  :local board [/system resource get board-name]
  /tool fetch${fetchFlags(appUrl)} http-method=post http-header-field="content-type: application/json" url="${syncUrl}" http-data=("{\\"identity\\":\\"" . $id . "\\",\\"version\\":\\"" . $ver . "\\",\\"board\\":\\"" . $board . "\\",\\"interfaces\\":\\"" . $names . "\\"}") dst-path=yobuyobu-cmd.rsc
  :delay 1s
  :local ybcmd ""
  :do { :set ybcmd [/file get yobuyobu-cmd.rsc contents] } on-error={}
  :if ([:len $ybcmd] < 20) do={ :return }
  :if ([:pick $ybcmd 0 16] = "# yobuyobu idle") do={ :return }
  /log info "yobuyobu applying queued commands"
  :do { /system script remove [find name="yobuyobu-run"] } on-error={}
  /system script add name=yobuyobu-run policy=read,write,policy,test,sensitive,ftp source=$ybcmd
  /system script run yobuyobu-run
  :do { /system script remove [find name="yobuyobu-run"] } on-error={}
}
/system scheduler add name=yobuyobu-agent interval=3s on-event=yobuyobu-agent policy=read,write,policy,test,sensitive,ftp
/system script run yobuyobu-agent
`.trim();
}

export function parseInterfaceReport(report: string): RouterPort[] {
  return report
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, type] = entry.split(":");
      return { name: name ?? "", type: type || "unknown" };
    })
    .filter((port) => port.name.length > 0);
}

export function idleAgentScript(): string {
  return "# yobuyobu idle\n";
}
