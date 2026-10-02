export const HOTSPOT_GATEWAY = "10.10.0.1";

export function hotspotPapLoginUrl(username: string, password: string): string {
  return `http://${HOTSPOT_GATEWAY}/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
}
