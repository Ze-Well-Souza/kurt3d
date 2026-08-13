import type { QueryClient } from "@tanstack/react-query";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Chaves de cache e efeitos colaterais das mutações (P1-2)
 * ─────────────────────────────────────────────────────────────────────────────
 * As chaves viviam como strings soltas espalhadas por hooks e componentes, e
 * cada tela invalidava só a própria. O resultado era tela mostrando o estado
 * anterior à ação:
 *
 *  - `addInsumo` / `updateInsumo` / `removeInsumo` criam, alteram e apagam
 *    linhas de `expenses`, mas a UI invalidava só ["insumos"] — a aba Despesas
 *    seguia exibindo a despesa de um insumo já excluído.
 *  - `finalizarDestino` grava uma venda (e, em falha, uma despesa) e ["vendas"]
 *    não era invalidada em lugar nenhum do sistema.
 *  - `registerOrderPayment` / `removeOrderPayment` não atualizavam a aba Caixa.
 *
 * Aqui cada operação de negócio declara TODAS as chaves que ela afeta, uma vez
 * só. Quem chama não precisa lembrar dos efeitos colaterais.
 */

export const queryKeys = {
  orders: ["orders"],
  orderPayments: ["order-payments"],
  cashFlow: ["cash-flow"],
  vendas: ["vendas"],
  expenses: ["expenses"],
  insumos: ["insumos"],
  insumoPayments: ["insumo-payments"],
  insumoPaymentEvents: ["insumo-payment-events"],
  filamentos: ["filamentos"],
  filamentoPayments: ["filamento-payments"],
  filamentoPaymentEvents: ["filamento-payment-events"],
  portfolio: ["portfolio"],
  publicSnapshot: ["public-snapshot"],
  snapshot: ["snapshot"],
  clients: ["clients"],
  leads: ["leads"],
  settings: ["settings"],
  siteContent: ["siteContent"],
  adminUsers: ["adminUsers"],
  authRole: ["authRole"],
  calendarEvents: ["calendar-events"],
  budgetQuotes: ["budget-quotes"],
} as const;

type QueryKeyName = keyof typeof queryKeys;

/**
 * O que cada operação de negócio invalida. Mudou um efeito colateral no
 * servidor? Atualize aqui, não em cada componente.
 */
export const efeitosDaMutacao = {
  // ── Pedidos ──
  criarPedido: ["orders", "snapshot"],
  editarPedido: ["orders", "snapshot"],
  removerPedido: ["orders", "orderPayments", "cashFlow", "snapshot"],
  // Muda status pode consumir filamento (baixa de estoque).
  mudarStatusPedido: ["orders", "filamentos", "snapshot"],
  // Finaliza destino: grava venda, ou despesa de falha, e baixa estoque.
  finalizarPedido: ["orders", "vendas", "expenses", "filamentos", "snapshot"],

  // ── Caixa ──
  registrarPagamentoPedido: ["orderPayments", "cashFlow", "snapshot"],
  removerPagamentoPedido: ["orderPayments", "cashFlow", "snapshot"],

  // ── Estoque ──
  salvarFilamento: ["filamentos", "snapshot"],
  arquivarFilamento: ["filamentos", "snapshot"],
  restaurarFilamento: ["filamentos", "snapshot"],
  removerFilamento: ["filamentos", "snapshot"],
  // Insumo espelha uma despesa: sem `expenses` a aba Despesas fica defasada.
  salvarInsumo: ["insumos", "expenses", "insumoPayments", "snapshot"],
  removerInsumo: ["insumos", "expenses", "insumoPayments", "insumoPaymentEvents", "snapshot"],

  // ── Parcelas ──
  pagamentoFilamento: ["filamentoPayments", "filamentoPaymentEvents", "filamentos", "snapshot"],
  pagamentoInsumo: ["insumoPayments", "insumoPaymentEvents", "insumos", "snapshot"],
  reagendarParcelas: [
    "filamentoPayments",
    "filamentoPaymentEvents",
    "insumoPayments",
    "insumoPaymentEvents",
    "snapshot",
  ],

  // ── Despesas ──
  despesaManual: ["expenses", "snapshot"],

  // ── Cadastros ──
  salvarCliente: ["clients", "orders", "snapshot"],
  removerCliente: ["clients", "orders", "snapshot"],
  converterLead: ["leads", "clients", "orders", "snapshot"],
  // Portfólio alimenta a landing pública.
  salvarProjeto: ["portfolio", "publicSnapshot", "snapshot"],
  removerProjeto: ["portfolio", "publicSnapshot", "snapshot"],

  // ── Configuração ──
  salvarSettings: ["settings", "snapshot"],
  salvarConteudoSite: ["siteContent", "publicSnapshot"],
  gerenciarUsuarios: ["adminUsers", "authRole"],

  // Limpeza de storage apaga imagens antigas e limpa a referencia nos leads.
  limpezaStorage: ["leads"],

  // ── Extras ──
  calendario: ["calendarEvents", "snapshot"],
  orcamento: ["budgetQuotes", "orders", "snapshot"],
} as const satisfies Record<string, readonly QueryKeyName[]>;

export type OperacaoDeNegocio = keyof typeof efeitosDaMutacao;

/** Invalida todas as chaves afetadas por uma operação de negócio. */
export function invalidarPor(qc: QueryClient, operacao: OperacaoDeNegocio) {
  for (const nome of efeitosDaMutacao[operacao]) {
    void qc.invalidateQueries({ queryKey: queryKeys[nome] });
  }
}
