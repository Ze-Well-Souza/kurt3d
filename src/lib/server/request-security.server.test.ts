import { describe, expect, it } from "vitest";
import {
  applySecurityHeaders,
  createCorsPreflightResponse,
  isCorsPreflightRequest,
  isSecureRequest,
  shouldRedirectToHttps,
} from "./request-security.server";

describe("request security", () => {
  it("nao redireciona localhost para https", () => {
    const request = new Request("http://localhost:3000/admin");
    expect(shouldRedirectToHttps(request)).toBe(false);
  });

  it("reconhece request segura por proxy header", () => {
    const request = new Request("http://example.com/admin", {
      headers: { "x-forwarded-proto": "https" },
    });
    expect(isSecureRequest(request)).toBe(true);
    expect(shouldRedirectToHttps(request)).toBe(false);
  });

  it("aplica CSP, permissions policy e CORS same-origin", () => {
    const request = new Request("https://kurt3d.com/admin", {
      headers: { origin: "https://kurt3d.com" },
    });

    const response = applySecurityHeaders(request, new Response("ok", { status: 200 }));

    expect(response.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(response.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("Permissions-Policy")).toContain("camera=()");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://kurt3d.com");
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect(response.headers.get("Strict-Transport-Security")).toContain("max-age=31536000");
  });

  it("nao libera CORS para origem externa", () => {
    const request = new Request("https://kurt3d.com/admin", {
      headers: { origin: "https://evil.example" },
    });

    const response = applySecurityHeaders(request, new Response("ok", { status: 200 }));

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(response.headers.get("Vary")).toContain("Origin");
  });

  it("responde preflight same-origin com 204", () => {
    const request = new Request("https://kurt3d.com/api", {
      method: "OPTIONS",
      headers: {
        origin: "https://kurt3d.com",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    });

    expect(isCorsPreflightRequest(request)).toBe(true);
    const response = createCorsPreflightResponse(request);
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://kurt3d.com");
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe("content-type");
  });

  it("nega preflight cross-origin", () => {
    const request = new Request("https://kurt3d.com/api", {
      method: "OPTIONS",
      headers: {
        origin: "https://evil.example",
        "access-control-request-method": "POST",
      },
    });

    const response = createCorsPreflightResponse(request);
    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
