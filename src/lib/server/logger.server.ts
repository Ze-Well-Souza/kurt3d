type LogLevel = "error" | "warn" | "info" | "debug";

const levelWeight: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const redactedKeys = new Set([
  "password",
  "newPassword",
  "token",
  "authorization",
  "cookie",
  "supabaseServiceRoleKey",
  "appSessionSecret",
  "phone",
  "whatsapp",
  "nome",
  "client",
]);

function getMinLevel(): LogLevel {
  const candidate = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  return candidate === "error" || candidate === "warn" || candidate === "debug" ? candidate : "info";
}

function shouldLog(level: LogLevel) {
  return levelWeight[level] <= levelWeight[getMinLevel()];
}

function sanitizeText(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [redacted]")
    .replace(/sb_secret_[A-Za-z0-9_-]+/g, "[redacted-secret]")
    .replace(/\b\d{8,15}\b/g, "[redacted-phone]");
}

function redactValue(value: unknown, key?: string): unknown {
  if (key && redactedKeys.has(key)) return "[redacted]";
  if (typeof value === "string") return sanitizeText(value);
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeText(value.message),
      stack: value.stack ? sanitizeText(value.stack) : undefined,
      cause: "cause" in value ? redactValue((value as Error & { cause?: unknown }).cause) : undefined,
    };
  }
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
        entryKey,
        redactValue(entryValue, entryKey),
      ]),
    );
  }
  return value;
}

function write(level: LogLevel, event: string, context?: Record<string, unknown>) {
  if (!shouldLog(level)) return;

  const payload = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...(redactValue(context ?? {}) as Record<string, unknown>),
  });

  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}

export const logger = {
  error(event: string, context?: Record<string, unknown>) {
    write("error", event, context);
  },
  warn(event: string, context?: Record<string, unknown>) {
    write("warn", event, context);
  },
  info(event: string, context?: Record<string, unknown>) {
    write("info", event, context);
  },
  debug(event: string, context?: Record<string, unknown>) {
    write("debug", event, context);
  },
};
