import type { Expense, Insumo, InsumoPayment, Venda } from "./types";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Totais financeiros — regra única de receita, custo, despesa e lucro (P1-6)
 * ─────────────────────────────────────────────────────────────────────────────
 * Esta regra vivia dentro de `use-finance-page-state.ts`, ou seja, dentro da
 * tela. O Painel (`admin.index.tsx`) tinha a própria versão, mais simples, que
 * somava TODAS as despesas — e as duas telas, abertas lado a lado, mostravam
 * lucros diferentes para o mesmo mês, sem nada indicando qual estava certa.
 *
 * Duas exclusões dão a diferença, e ambas existem por um motivo:
 *
 *  1. Investimento / imobilizado (uma impressora nova) não é despesa
 *     operacional do mês: entra no caixa, não no resultado.
 *  2. Insumo com parcelamento próprio já é contado pelas parcelas. Somar
 *     também a despesa espelhada contaria a mesma compra duas vezes.
 */

export type ClassificacaoFinanceira = "operacional" | "investimento";

export type DespesaClassificada = Expense & { financialClass: ClassificacaoFinanceira };

export const CATEGORIA_INVESTIMENTO = "Investimento / Imobilizado";

/** Marca cada despesa como operacional ou investimento. */
export function classificarDespesas(expenses: Expense[], insumos: Insumo[]): DespesaClassificada[] {
  const insumoPorId = new Map(insumos.map((item) => [item.id, item]));

  return expenses.map((expense) => {
    const insumoVinculado = expense.source === "insumo" ? insumoPorId.get(expense.refId) : null;
    const ehInvestimento =
      insumoVinculado?.classificacaoFinanceira === "investimento" ||
      expense.categoria === CATEGORIA_INVESTIMENTO;

    return { ...expense, financialClass: ehInvestimento ? "investimento" : "operacional" };
  });
}

/**
 * Despesa entra no resultado operacional?
 *
 * Insumo que tem plano de pagamento próprio fica de fora: a saída de caixa já
 * é contabilizada pelas parcelas, e somar os dois contaria a compra em dobro.
 */
export function ehDespesaOperacional(
  despesa: DespesaClassificada,
  insumoIdsComParcelamento: ReadonlySet<string>,
): boolean {
  if (despesa.financialClass !== "operacional") return false;
  if (despesa.source === "insumo" && insumoIdsComParcelamento.has(despesa.refId)) return false;
  return true;
}

export type TotaisFinanceiros = {
  receita: number;
  custo: number;
  despesasOperacionais: number;
  investimentos: number;
  /** Receita − custo de produção − despesas operacionais. */
  lucro: number;
};

/**
 * Totais de um conjunto já filtrado por período.
 *
 * Passe aqui as vendas e despesas do período desejado; a função não filtra
 * datas — a regra de período é de quem chama.
 */
export function calcularTotaisFinanceiros(input: {
  vendas: Venda[];
  despesasClassificadas: DespesaClassificada[];
  insumoPayments: InsumoPayment[];
}): TotaisFinanceiros {
  const insumoIdsComParcelamento = new Set(input.insumoPayments.map((p) => p.insumoId));

  const receita = input.vendas.reduce((soma, v) => soma + v.valor, 0);
  const custo = input.vendas.reduce((soma, v) => soma + v.custo, 0);

  const despesasOperacionais = input.despesasClassificadas
    .filter((despesa) => ehDespesaOperacional(despesa, insumoIdsComParcelamento))
    .reduce((soma, despesa) => soma + despesa.valor, 0);

  const investimentos = input.despesasClassificadas
    .filter((despesa) => despesa.financialClass === "investimento")
    .reduce((soma, despesa) => soma + despesa.valor, 0);

  return {
    receita,
    custo,
    despesasOperacionais,
    investimentos,
    lucro: receita - custo - despesasOperacionais,
  };
}
