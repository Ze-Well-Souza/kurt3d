import { getRequest, useSession } from "@tanstack/react-start/server";
import { ensureSessionPassword, isUserActive } from "./auth.server";
import { isSecureRequest } from "./request-security.server";

export type SessionData = { userId?: string; username?: string };

/**
 * Sessão do admin (cookie httpOnly assinado).
 *
 * Fonte única da configuração do cookie. Antes existiam duas cópias desta
 * função — aqui e em `lib/api/auth.functions.ts` — e ajustar `maxAge`,
 * `sameSite` ou a checagem de conta ativa em apenas uma delas abria uma brecha
 * assimétrica difícil de enxergar.
 */
export async function getSession() {
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
 * Lança "unauthorized" se não houver sessão de admin válida.
 * Chame no início de todo handler de server function que exija autenticação.
 *
 * A conta é revalidada a cada requisição: sessão de usuário desativado (ou
 * removido) é rejeitada e o cookie, limpo. Sem isso, "desativar usuário" não
 * revogava acesso nenhum — o cookie continuava valendo por até 30 dias.
 */
export async function requireSession(): Promise<string> {
  const session = await getSession();
  const userId = session.data.userId;
  if (!userId) throw new Error("unauthorized");

  if (!(await isUserActive(userId))) {
    await session.clear();
    throw new Error("unauthorized");
  }

  return userId;
}
