export function ok<T>(data: T, status = 200) {
  return Response.json({ success: true, data, error: null }, { status });
}

export function fail(message: string, status = 400) {
  return Response.json({ success: false, data: null, error: message }, { status });
}

export function rsc(body: string) {
  const text = body.endsWith("\n") ? body : `${body}\n`;
  return new Response(text, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "content-length": String(Buffer.byteLength(text)),
    },
  });
}
