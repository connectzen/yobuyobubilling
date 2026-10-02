import { getAppUrl } from "@/lib/env";
import { buildHotspotHtml, isHotspotHtmlFile } from "@/lib/mikrotik/hotspot-html";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { token: string; file: string } },
) {
  const token = params.token.trim();
  if (!token || !isHotspotHtmlFile(params.file)) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(buildHotspotHtml(params.file, { appUrl: getAppUrl(), token }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
