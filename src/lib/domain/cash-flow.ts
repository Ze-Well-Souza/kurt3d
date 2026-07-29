/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FLUXO DE CAIXA — Módulo de domínio puro (sem rede, 100% testável)
 * ─────────────────────────────────────────────────────────────────────────────
 * Agrega os pagamentos recebidos de clientes (order_payments) e as despesas
 * (expenses) em resumos diários e semanais para auditoria entre os sócios.
 *
 * Regras:
 * - Receita = soma dos pagamentos recebidos no período (regime de caixa).
 * - Despesas de material = despesas com source "insumo" ou "falha".
 * - Outras despesas = despesas manuais (aluguel, internet, etc.).
 * - Lucro líquido = receita − despesas totais do período.
 */
import { formatDateToIsoLocal, parseIsoDateLocal, todayIso } from "./installments";
import type { Expense, OrderPayment } from "./types";

/** Arredonda para centavos (half-up), evitando ruído de ponto flutuante. */
function arredondar(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/** Normaliza qualquer data (YYYY-MM-DD ou timestamp ISO) para YYYY-MM-DD. */
export function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

/** Retorna a segunda-feira da semana da data informada (YYYY-MM-DD). */
export function startOfWeekIso(dateIso: string): string {
  const date = parseIsoDateLocal(toDateOnly(dateIso));
  const diasDesdeSegunda = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - diasDesdeSegunda);
  return formatDateToIsoLocal(date);
}

/** Soma `days` dias a uma data YYYY-MM-DD. */
export function addDaysIso(dateIso: string, days: number): string {
  const date = parseIsoDateLocal(toDateOnly(dateIso));
  date.setDate(date.getDate() + days);
  return formatDateToIsoLocal(date);
}

export type CashFlowSummary = {
  /** Receita total recebida no período (R$). */
  totalRecebido: number;
  /** Despesas de material no período: insumos + falhas de impressão (R$). */
  despesasMaterial: number;
  /** Demais despesas do período: manuais (aluguel, internet, etc.) (R$). */
  despesasOutras: number;
  /** Total de despesas do período (R$). */
  despesasTotal: number;
  /** Lucro líquido do período: receita − despesas totais (R$). */
  lucroLiquido: number;
  /** Quantidade de pagamentos registrados no período. */
  qtdPagamentos: number;
};

/** Compara datas YYYY-MM-DD por ordem lexicográfica (válido para ISO). */
function dentroDoPeriodo(dataIso: string, inicioIso: string, fimIso: string): boolean {
  const data = toDateOnly(dataIso);
  return data >= inicioIso && data <= fimIso;
}

/**
 * Resume o fluxo de caixa de um período fechado [inicioIso, fimIso]
 * (ambas as pontas inclusivas, formato YYYY-MM-DD).
 */
export function resumirFluxoCaixa(
  payments: OrderPayment[],
  expenses: Expense[],
  inicioIso: string,
  fimIso: string,
): CashFlowSummary {
  const pagamentos = payments.filter((p) => dentroDoPeriodo(p.data, inicioIso, fimIso));
  const despesas = expenses.filter((e) => dentroDoPeriodo(e.data, inicioIso, fimIso));

  const totalRecebido = pagamentos.reduce((soma, p) => soma + p.valor, 0);
  const despesasMaterial = despesas
    .filter((e) => e.source === "insumo" || e.source === "falha")
    .reduce((soma, e) => soma + e.valor, 0);
  const despesasOutras = despesas
    .filter((e) => e.source === "manual")
    .reduce((soma, e) => soma + e.valor, 0);
  const despesasTotal = despesasMaterial + despesasOutras;

  return {
    totalRecebido: arredondar(totalRecebido),
    despesasMaterial: arredondar(despesasMaterial),
    despesasOutras: arredondar(despesasOutras),
    despesasTotal: arredondar(despesasTotal),
    lucroLiquido: arredondar(totalRecebido - despesasTotal),
    qtdPagamentos: pagamentos.length,
  };
}

export type WeeklyCashFlow = CashFlowSummary & {
  /** Segunda-feira da semana (YYYY-MM-DD). */
  inicioSemana: string;
  /** Domingo da semana (YYYY-MM-DD). */
  fimSemana: string;
};

/**
 * Resumo semanal do fluxo de caixa: retorna as últimas `semanas` semanas
 * (segunda a domingo), da mais recente para a mais antiga.
 */
export function resumoSemanalFluxoCaixa(
  payments: OrderPayment[],
  expenses: Expense[],
  opcoes: { semanas?: number; referenciaIso?: string } = {},
): WeeklyCashFlow[] {
  const semanas = Math.max(1, Math.min(opcoes.semanas ?? 4, 26));
  const referencia = opcoes.referenciaIso ?? todayIso();

  const resultado: WeeklyCashFlow[] = [];
  let inicioSemana = startOfWeekIso(referencia);
  for (let i = 0; i < semanas; i++) {
    const fimSemana = addDaysIso(inicioSemana, 6);
    resultado.push({
      inicioSemana,
      fimSemana,
      ...resumirFluxoCaixa(payments, expenses, inicioSemana, fimSemana),
    });
    inicioSemana = addDaysIso(inicioSemana, -7);
  }
  return resultado;
}

export type DailyCashFlow = CashFlowSummary & {
  /** Dia do resumo (YYYY-MM-DD). */
  data: string;
  /** Pagamentos do dia, para conferência rápida entre os sócios. */
  pagamentos: OrderPayment[];
};

/** Resumo diário do fluxo de caixa (padrão: hoje), com a lista de pagamentos do dia. */
export function resumoDiarioFluxoCaixa(
  payments: OrderPayment[],
  expenses: Expense[],
  dataIso: string = todayIso(),
): DailyCashFlow {
  const dia = toDateOnly(dataIso);
  return {
    data: dia,
    pagamentos: payments.filter((p) => toDateOnly(p.data) === dia),
    ...resumirFluxoCaixa(payments, expenses, dia, dia),
  };
}
