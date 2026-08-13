import { MutationCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * QueryClient da aplicação (P1-1)
 * ─────────────────────────────────────────────────────────────────────────────
 * 41 das 67 mutações do painel não tinham `onError`, e o QueryClient era criado
 * sem tratamento global. O resultado era falha silenciosa: o servidor recusava
 * a gravação com "SKU já está cadastrado em outro filamento ativo", o diálogo
 * fechava, nenhum aviso aparecia e o usuário seguia achando que salvou.
 *
 * O `onError` do MutationCache cobre TODAS as mutações de uma vez. Handlers
 * específicos declarados em cada `useMutation` continuam valendo — o React
 * Query executa os dois, e o específico roda depois.
 */

/** Erros que o servidor devolve como código técnico, traduzidos para o operador. */
const MENSAGENS_TECNICAS: Record<string, string> = {
  unauthorized: "Sua sessão expirou ou o acesso foi revogado. Entre novamente.",
  forbidden: "Seu perfil não tem permissão para esta ação.",
  rate_limited: "Muitas operações seguidas. Aguarde alguns instantes e tente de novo.",
  client_not_found: "Cliente não encontrado. Atualize a página e tente de novo.",
  not_found: "Registro não encontrado. Ele pode ter sido removido por outro usuário.",
  cannot_delete_self: "Você não pode remover a própria conta.",
  cannot_delete_last_user: "O sistema precisa de pelo menos um usuário.",
  cannot_delete_super_admin: "O super admin não pode ser removido.",
  cannot_deactivate_super_admin: "O super admin não pode ser desativado.",
  username_exists: "Já existe um usuário com esse nome de acesso.",
  phone_exists: "Já existe um usuário com esse telefone.",
  user_not_found: "Usuário não encontrado.",
  setup_already_done: "O primeiro administrador já foi criado.",
  terminal_state: "Este pedido já foi finalizado e não pode mais ser alterado.",
  invalid_state: "O pedido não está no estado necessário para esta ação.",
  invalid_transition: "Essa mudança de status não é permitida.",
  part_not_found: "Parte do pedido não encontrada.",
};

export function mensagemDeErro(error: unknown): string {
  const bruta = error instanceof Error ? error.message : String(error ?? "");
  const traduzida = MENSAGENS_TECNICAS[bruta.trim()];
  if (traduzida) return traduzida;

  // Mensagens do domínio já vêm escritas para o operador ("SKU ... já está
  // cadastrado", "O valor informado é maior que o saldo..."). Repassa direto.
  if (bruta && bruta.length < 300 && !bruta.startsWith("[")) return bruta;

  return "Não foi possível concluir a operação. Tente novamente.";
}

export function createQueryClient() {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error) => {
        // Roda no cliente e no SSR; o toast só existe no navegador.
        if (typeof window === "undefined") return;
        toast.error(mensagemDeErro(error));
      },
    }),
    defaultOptions: {
      queries: {
        // Erro de autorização não melhora com retentativa.
        retry: (failureCount, error) => {
          const mensagem = error instanceof Error ? error.message : "";
          if (mensagem === "unauthorized" || mensagem === "forbidden") return false;
          return failureCount < 2;
        },
      },
      mutations: {
        // Mutação repetida pode duplicar lançamento financeiro. Nunca reenviar.
        retry: false,
      },
    },
  });
}
