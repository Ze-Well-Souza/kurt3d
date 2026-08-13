import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getSupabaseAdminClient } from "../../server/supabase.server";
import { logger } from "../../server/logger.server";

// Keep-alive: uma consulta mínima ao Supabase mantém o projeto ativo, pois o
// plano gratuito pausa o banco após ~7 dias sem atividade externa. Disparado por
// um Cron da Vercel. Em erro de banco falha aberto (nunca derruba a rota).
// Aproveita a execução periódica para apagar buckets antigos de rate limit de
// login — sem isso, chaves de tentativas falhas acumulariam para sempre.

const RATE_LIMIT_RETENTION_DAYS = 7;

export const pingKeepAlive = createServerFn({ method: "GET" }).handler(async () => {
  // Se CRON_SECRET estiver configurado na Vercel, a plataforma envia o header
  // "Authorization: Bearer <segredo>" nas chamadas do Cron. Quando o segredo
  // existe e não confere, respondemos sem tocar no banco — evita que visitantes
  // anônimos consultem o Supabase repetidamente por esta rota pública.
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret) {
    const authorization = getRequest().headers.get("authorization");
    if (authorization !== `Bearer ${expectedSecret}`) {
      return { ok: true as const, checked: false as const, at: new Date().toISOString() };
    }
  }

  try {
    const supabase = getSupabaseAdminClient();
    // Apenas contagem (head: true, sem retornar linhas) para gerar tráfego real
    // na API do Supabase e reiniciar o contador de inatividade com custo mínimo.
    const { error } = await supabase
      .from("login_rate_limits")
      .select("key", { count: "exact", head: true });
    if (error) throw new Error(error.message);

    // Retenção: buckets sem atualização há mais de 7 dias já expiraram (janela e
    // bloqueio duram minutos) e são só lixo histórico. Falha aqui não derruba o ping.
    const cutoff = new Date(
      Date.now() - RATE_LIMIT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { error: cleanupError } = await supabase
      .from("login_rate_limits")
      .delete()
      .lt("updated_at", cutoff);
    if (cleanupError) {
      logger.warn("keep_alive.rate_limit_cleanup_failed", { error: cleanupError.message });
    }

    return { ok: true as const, checked: true as const, at: new Date().toISOString() };
  } catch (error) {
    logger.warn("keep_alive.ping_failed", { error: String(error) });
    return { ok: false as const, checked: false as const, at: new Date().toISOString() };
  }
});
