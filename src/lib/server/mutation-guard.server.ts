import { getRequest } from "@tanstack/react-start/server";
import { inspectLoginRateLimit, recordLoginFailure } from "./login-rate-limit.server";
import { getClientIp } from "./rate-limit.server";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Rate limit de mutações (P1-5)
 * ─────────────────────────────────────────────────────────────────────────────
 * A versão anterior usava um `Map` em memória do processo. Na Vercel cada
 * invocação pode cair numa instância nova, então o contador nascia zerado quase
 * sempre e o limite efetivamente não existia — deixando desprotegidos os dois
 * endpoints públicos: `submitLead`, que aceita 6 imagens de até 5 MB em base64
 * e grava no Storage, e `getPublicOrderTracking`.
 *
 * O projeto já tinha resolvido exatamente esse problema para o login com uma
 * tabela no Postgres (`login_rate_limits`). Aqui reaproveitamos esse mecanismo,
 * que sobrevive entre instâncias. Como lá, em erro de banco a checagem falha
 * aberta: indisponibilidade transitória não pode travar o sistema inteiro.
 */

const LIMITE_ADMIN = { limit: 60, windowMs: 60_000, blockMs: 60_000 } as const;

// Rota pública é bem mais restrita: não há sessão para responsabilizar, e o
// custo por requisição (upload, egress) é alto.
const LIMITE_PUBLICO = { limit: 10, windowMs: 60_000, blockMs: 5 * 60_000 } as const;

async function aplicarLimite(
  chave: string,
  regra: { limit: number; windowMs: number; blockMs: number },
) {
  const estado = await inspectLoginRateLimit({ key: chave });
  if (!estado.allowed) throw new Error("rate_limited");

  const resultado = await recordLoginFailure({
    key: chave,
    limit: regra.limit,
    windowMs: regra.windowMs,
    blockMs: regra.blockMs,
  });
  if (resultado.blocked) throw new Error("rate_limited");
}

/**
 * Limita mutações do painel por IP.
 * Chame no início de todo handler de mutação (POST).
 */
export async function checkMutationRateLimit(): Promise<void> {
  const ip = getClientIp(getRequest());
  await aplicarLimite(`mutation:${ip}`, LIMITE_ADMIN);
}

/**
 * Limite mais apertado para endpoints acessíveis sem sessão.
 * `escopo` separa os contadores por rota, para que abuso de uma não bloqueie a
 * outra.
 */
export async function checkPublicRateLimit(escopo: string): Promise<void> {
  const ip = getClientIp(getRequest());
  await aplicarLimite(`public:${escopo}:${ip}`, LIMITE_PUBLICO);
}
