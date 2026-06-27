function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function appendVaryHeader(headers: Headers, value: string) {
  const current = headers.get("Vary");
  if (!current) {
    headers.set("Vary", value);
    return;
  }

  const entries = current.split(",").map((item) => item.trim().toLowerCase());
  if (!entries.includes(value.toLowerCase())) {
    headers.set("Vary", `${current}, ${value}`);
  }
}

function isSameOriginCorsRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(request.url).origin;
}

function buildContentSecurityPolicy(request: Request) {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline' https:",
    "script-src 'self' 'unsafe-inline'",
    "connect-src 'self' https: wss:",
  ];

  if (!isLocalHostname(new URL(request.url).hostname) && isSecureRequest(request)) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
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

export function isCorsPreflightRequest(request: Request) {
  return request.method === "OPTIONS"
    && request.headers.has("origin")
    && request.headers.has("access-control-request-method");
}

export function createCorsPreflightResponse(request: Request) {
  const headers = new Headers();
  appendVaryHeader(headers, "Origin");
  appendVaryHeader(headers, "Access-Control-Request-Method");
  appendVaryHeader(headers, "Access-Control-Request-Headers");

  if (!isSameOriginCorsRequest(request)) {
    return new Response(null, { status: 403, headers });
  }

  const origin = request.headers.get("origin");
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    request.headers.get("access-control-request-headers") ?? "Content-Type, Authorization",
  );
  headers.set("Access-Control-Max-Age", "600");

  return new Response(null, { status: 204, headers });
}

export function applySecurityHeaders(request: Request, response: Response) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Content-Security-Policy", buildContentSecurityPolicy(request));
  headers.set(
    "Permissions-Policy",
    "accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()",
  );

  appendVaryHeader(headers, "Origin");
  if (isSameOriginCorsRequest(request)) {
    headers.set("Access-Control-Allow-Origin", new URL(request.url).origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

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
