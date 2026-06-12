import type { Filamento, Order, PortfolioProject } from "./types";

export type CostBreakdown = {
  custoFilamento: number;
  custoEnergia: number;
  custoDepreciacao: number;
  custoFixo: number;
  custoUnidade: number;
  custoLote: number;
  receitaTotal: number;
  lucroLiquido: number;
};

const CONSUMO_A1_KW = 0.095;
const TARIFA_ENERGIA = 0.75;
const DEPRECIACAO_HORA = 0.7;
const CUSTO_FIXO_UNIDADE = 0.2;

function clampNumber(n: number) {
  return Number.isFinite(n) ? n : 0;
}

function costPerGramFromFilamento(f?: Filamento): number | null {
  if (!f) return null;
  if (f.pesoInicial <= 0) return null;
  return f.precoPago / f.pesoInicial;
}

export function calcCostFromInputs(input: {
  custoRolo: number;
  pesoRolo: number;
  pesoPeca: number;
  tempoMin: number;
  quantidade: number;
  precoVenda: number;
}): CostBreakdown {
  const custoRolo = clampNumber(input.custoRolo);
  const pesoRolo = clampNumber(input.pesoRolo);
  const pesoPeca = clampNumber(input.pesoPeca);
  const tempoMin = clampNumber(input.tempoMin);
  const quantidade = clampNumber(input.quantidade);
  const precoVenda = clampNumber(input.precoVenda);

  const custoFilamento = pesoRolo > 0 ? (custoRolo / pesoRolo) * pesoPeca : 0;
  const custoEnergia = (tempoMin / 60) * CONSUMO_A1_KW * TARIFA_ENERGIA;
  const custoDepreciacao = (tempoMin / 60) * DEPRECIACAO_HORA;
  const custoFixo = CUSTO_FIXO_UNIDADE;

  const custoUnidade = custoFilamento + custoEnergia + custoDepreciacao + custoFixo;
  const custoLote = custoUnidade * quantidade;
  const receitaTotal = precoVenda * quantidade;
  const lucroLiquido = receitaTotal - custoLote;

  return {
    custoFilamento,
    custoEnergia,
    custoDepreciacao,
    custoFixo,
    custoUnidade,
    custoLote,
    receitaTotal,
    lucroLiquido,
  };
}

export function estimateOrderMaterialGrams(order: Order, portfolio?: PortfolioProject): number | null {
  const gramsPerUnit = order.gramsPerUnit ?? (portfolio?.pesoPeca ?? null);
  if (gramsPerUnit === null || gramsPerUnit === undefined) return null;
  if (!Number.isFinite(gramsPerUnit) || gramsPerUnit <= 0) return null;
  return gramsPerUnit * order.quantity;
}

export function calcOrderCostHybrid(input: {
  order: Order;
  portfolio?: PortfolioProject;
  filamento?: Filamento;
  precoVendaUnit?: number;
}): {
  breakdown: CostBreakdown;
  depreciacao: number;
  total: number;
} {
  const { order, portfolio, filamento } = input;
  const tempoMin = portfolio?.tempoMin ?? order.timeMinutes;
  const pesoPeca = portfolio?.pesoPeca ?? order.gramsPerUnit ?? 0;
  const quantidade = order.quantity;
  const precoVenda = input.precoVendaUnit ?? 0;

  const cpf = costPerGramFromFilamento(filamento);
  const custoFilamento = cpf ? cpf * pesoPeca : calcCostFromInputs({
    custoRolo: portfolio?.custoRolo ?? 120,
    pesoRolo: portfolio?.pesoRolo ?? 1000,
    pesoPeca,
    tempoMin: 0,
    quantidade: 1,
    precoVenda: 0,
  }).custoFilamento;

  const custoEnergia = (tempoMin / 60) * CONSUMO_A1_KW * TARIFA_ENERGIA;
  const custoDepreciacao = (tempoMin / 60) * DEPRECIACAO_HORA;
  const custoFixo = CUSTO_FIXO_UNIDADE;

  const custoUnidade = custoFilamento + custoEnergia + custoDepreciacao + custoFixo;
  const custoLote = custoUnidade * quantidade;
  const receitaTotal = precoVenda * quantidade;
  const lucroLiquido = receitaTotal - custoLote;

  const breakdown: CostBreakdown = {
    custoFilamento,
    custoEnergia,
    custoDepreciacao,
    custoFixo,
    custoUnidade,
    custoLote,
    receitaTotal,
    lucroLiquido,
  };

  return { breakdown, depreciacao: custoDepreciacao * quantidade, total: custoLote };
}

