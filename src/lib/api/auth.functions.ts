import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { ensureSessionPassword, getAuthSetupState, setupAdminUser, validateLogin } from "../server/auth.server";

type SessionData = { userId?: string; username?: string };

async function getSession() {
  return useSession<SessionData>({
    password: await ensureSessionPassword(),
    maxAge: 60 * 60 * 24 * 30,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    },
  });
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
  .validator(z.object({ username: z.string().min(1).max(50), password: z.string().min(8).max(200) }))
  .handler(async ({ data }) => {
    const created = await setupAdminUser(data);
    const session = await getSession();
    await session.update({ userId: created.id, username: created.username });
    return { ok: true };
  });

export const login = createServerFn({ method: "POST" })
  .validator(z.object({ username: z.string().min(1).max(50), password: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    const user = await validateLogin(data);
    if (!user) {
      return { ok: false as const };
    }
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

