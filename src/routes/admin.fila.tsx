import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * A fila de impressão foi unificada na aba "Pedidos" de Calculadora e Pedidos
 * (/admin/portfolio?aba=orders), que concentra o kanban de produção e o painel
 * de impressoras. Esta rota existe apenas para redirecionar links antigos.
 */
export const Route = createFileRoute("/admin/fila")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/portfolio", search: { aba: "orders" } });
  },
});
