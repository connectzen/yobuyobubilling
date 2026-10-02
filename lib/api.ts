export function ok<T>(data: T, status = 200) {
  return Response.json({ success: true, data, error: null }, { status });
}

export function fail(message: string, status = 400) {
  return Response.json({ success: false, data: null, error: message }, { status });
}

export function rsc(body: string) {
  return new Response(body.endsWith("\n") ? body : `${body}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
