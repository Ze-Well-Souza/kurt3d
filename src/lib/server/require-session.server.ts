import { getRequest, useSession } from "@tanstack/react-start/server";
import { ensureSessionPassword } from "./auth.server";
import { isSecureRequest } from "./request-security.server";

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

/**
 * Throws "unauthorized" if no valid admin session exists.
 * Call at the start of any server function handler that requires authentication.
 */
export async function requireSession(): Promise<string> {
  const session = await getSession();
  if (!session.data.userId) throw new Error("unauthorized");
  return session.data.userId;
}
