export const UPLOAD_SUCCESS_MESSAGE =
  "Configuration queued. The MikroTik will apply it within about 3 seconds.";

export type UploadBlockedInput = {
  connected: boolean;
  wan: string;
  customerPortCount: number;
  hotspot: boolean;
  pppoe: boolean;
};

export type ConfigureApiResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export function uploadBlockedReason(input: UploadBlockedInput): string {
  if (!input.connected) {
    return "Waiting for this MikroTik to report its ports.";
  }
  if (!input.wan.trim()) {
    return "Pick the WAN port first.";
  }
  if (input.customerPortCount === 0) {
    return "No remaining customer ports. Pick a different WAN.";
  }
  if (!input.hotspot && !input.pppoe) {
    return "Turn on Hotspot or PPPoE.";
  }
  return "";
}

export function readConfigureApiResult(status: number, bodyText: string): ConfigureApiResult {
  const trimmed = bodyText.trim();
  if (!trimmed) {
    return { ok: false, message: `Could not queue configuration (HTTP ${status})` };
  }
  try {
    const payload = JSON.parse(trimmed) as { success?: boolean; error?: string | null };
    if (payload.success) {
      return { ok: true, message: UPLOAD_SUCCESS_MESSAGE };
    }
    return { ok: false, message: payload.error || "Could not queue configuration" };
  } catch {
    return { ok: false, message: `Could not queue configuration (HTTP ${status})` };
  }
}
