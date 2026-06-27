import { createServerFn } from "@tanstack/react-start";
import { getRequest, useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { getPasswordPolicyMessage } from "../domain/password-policy";
import {
  changeUserPassword,
  createAdminUser,
  deleteAdminUser,
  ensureSessionPassword,
  getAuthSetupState,
  listAdminUsers,
  setupAdminUser,
  validateLogin,
} from "../server/auth.server";
import { logger } from "../server/logger.server";
import { clearRateLimit, getClientIp, inspectRateLimit, recordRateLimitFailure } from "../server/rate-limit.server";
import { isSecureRequest } from "../server/request-security.server";
import { siteContentRepo } from "../server/repositories.server";
import type { SiteContent } from "../domain/types";
import { normalizePhone, normalizeText } from "../utils/normalization";

type SessionData = { userId?: string; username?: string };

async function getSession() {
  const request = getRequest();
  return useSession<SessionData>({
    password: await ensureSessionPassword(),
    maxAge: 60 * 60 * 24 * 30,
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      secure: request ? isSecureRequest(request) : false,
    },
  });
}

function buildLoginRateLimitKey(phone: string) {
  const request = getRequest();
  const ip = getClientIp(request);
  const normalizedPhone = normalizePhone(phone);
  return `login:${ip}:${normalizedPhone || normalizeText(phone)}`;
}

function assertPasswordPolicy(password: string) {
  const message = getPasswordPolicyMessage(password);
  if (message) throw new Error(message);
}

async function requireSession() {
  const session = await getSession();
  if (!session.data.userId) throw new Error("unauthorized");
  return session.data.userId;
}

export const authStatus = createServerFn({ method: "GET" }).handler(async () => {
  const setup = await getAuthSetupState();
  const session = await getSession();
  return {
    setupRequired: !setup.hasAdmin,
    loggedIn: !!session.data.userId,
    username: session.data.username ?? null,
  };
});

export const setupAdmin = createServerFn({ method: "POST" })
  .validator(
    z.object({
      username: z.string().min(1).max(50),
      password: z.string().min(8).max(200),
      phone: z.string().optional(),
      nome: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    assertPasswordPolicy(data.password);
    const created = await setupAdminUser(data);
    const session = await getSession();
    await session.update({ userId: created.id, username: created.username });
    return { ok: true };
  });

export const login = createServerFn({ method: "POST" })
  .validator(z.object({ phone: z.string().min(1).max(20), password: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    const rateLimitKey = buildLoginRateLimitKey(data.phone);
    const rateLimitState = inspectRateLimit({
      key: rateLimitKey,
      limit: 5,
      windowMs: 15 * 60 * 1000,
      blockMs: 15 * 60 * 1000,
    });
    if (!rateLimitState.allowed) {
      logger.warn("auth.login.rate_limited", { ip: getClientIp(getRequest()), retryAfterMs: rateLimitState.retryAfterMs });
      return { ok: false as const, reason: "rate_limited" as const };
    }

    const user = await validateLogin(data);
    if (!user) {
      const failureState = recordRateLimitFailure({
        key: rateLimitKey,
        limit: 5,
        windowMs: 15 * 60 * 1000,
        blockMs: 15 * 60 * 1000,
      });
      if (failureState.blocked) {
        logger.warn("auth.login.blocked_after_failures", { ip: getClientIp(getRequest()) });
        return { ok: false as const, reason: "rate_limited" as const };
      }
      return { ok: false as const, reason: "invalid_credentials" as const };
    }

    clearRateLimit(rateLimitKey);
    const session = await getSession();
    await session.update({ userId: user.id, username: user.username });
    return { ok: true as const };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getSession();
  await session.clear();
  return { ok: true };
});

export const requireAuth = createServerFn({ method: "GET" }).handler(async () => {
  const setup = await getAuthSetupState();
  const session = await getSession();
  return {
    setupRequired: !setup.hasAdmin,
    userId: session.data.userId ?? null,
    username: session.data.username ?? null,
  };
});

export const changePassword = createServerFn({ method: "POST" })
  .validator(z.object({ newPassword: z.string().min(8).max(200) }))
  .handler(async ({ data }) => {
    const userId = await requireSession();
    assertPasswordPolicy(data.newPassword);
    await changeUserPassword(userId, data.newPassword);
    return { ok: true };
  });

export const listUsers = createServerFn({ method: "GET" }).handler(async () => {
  await requireSession();
  return listAdminUsers();
});

export const createUser = createServerFn({ method: "POST" })
  .validator(
    z.object({
      username: z.string().min(1).max(50),
      password: z.string().min(8).max(200),
      phone: z.string().optional(),
      nome: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireSession();
    assertPasswordPolicy(data.password);
    const created = await createAdminUser(data);
    return { ok: true, id: created.id };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const userId = await requireSession();
    if (data.userId === userId) throw new Error("cannot_delete_self");
    await deleteAdminUser(data.userId);
    return { ok: true };
  });

export const getSiteContent = createServerFn({ method: "GET" }).handler(async (): Promise<SiteContent> => {
  const repo = await siteContentRepo();
  return repo.content;
});

export const saveSiteContent = createServerFn({ method: "POST" })
  .validator(z.any())
  .handler(async ({ data }) => {
    await requireSession();
    const repo = await siteContentRepo();
    await repo.save(data as SiteContent);
    return { ok: true };
  });


