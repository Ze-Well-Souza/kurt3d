import { useQuery, type QueryKey } from "@tanstack/react-query";

/**
 * Política de atualização das listas do painel (P2-3).
 *
 * Estas opções estavam copiadas em 18 arquivos de hook, idênticas. Mudar a
 * cadência de atualização exigia editar os 18 e torcer para não esquecer
 * nenhum. Agora vive num lugar só.
 *
 * `refetchIntervalInBackground: false` é deliberado: com dois sócios usando o
 * sistema ao mesmo tempo, os dados precisam chegar rápido na aba ativa, mas
 * abas esquecidas em segundo plano não devem consumir requisição do Supabase.
 */
export const ADMIN_QUERY_OPTIONS = {
  staleTime: 30_000,
  refetchInterval: 60_000,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
} as const;

/** Cria um hook de listagem do painel com a política padrão. */
export function createAdminQuery<T>(queryKey: QueryKey, queryFn: () => Promise<T>) {
  return function useAdminQuery() {
    return useQuery({ queryKey, queryFn, ...ADMIN_QUERY_OPTIONS });
  };
}
