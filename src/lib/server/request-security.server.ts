function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function isSecureRequest(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto?.includes("https")) return true;

  const cfVisitor = request.headers.get("cf-visitor");
  if (cfVisitor?.includes('"scheme":"https"')) return true;

  return new URL(request.url).protocol === "https:";
}

export function shouldRedirectToHttps(request: Request) {
  const url = new URL(request.url);
  if (isLocalHostname(url.hostname)) return false;
  return !isSecureRequest(request);
}

export function createHttpsRedirect(request: Request) {
  const url = new URL(request.url);
  url.protocol = "https:";
  return Response.redirect(url.toString(), 301);
}

export function applySecurityHeaders(request: Request, response: Response) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");

  const url = new URL(request.url);
  if (!isLocalHostname(url.hostname) && isSecureRequest(request)) {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
