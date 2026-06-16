import type { Filamento, Order, PortfolioProject, AppSettings } from "./types";
import { DEFAULT_APP_SETTINGS } from "./types";

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

const CONSUMO_A1_KW = DEFAULT_APP_SETTINGS.consumoKw;
const TARIFA_ENERGIA = DEFAULT_APP_SETTINGS.tarifaEnergiaKwh;
const DEPRECIACAO_HORA = DEFAULT_APP_SETTINGS.depreciacaoHora;
const CUSTO_FIXO_UNIDADE = DEFAULT_APP_SETTINGS.custoFixoUnidade;

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
  settings?: AppSettings;
}): CostBreakdown {
  const s = input.settings ?? DEFAULT_APP_SETTINGS;
  const custoRolo = clampNumber(input.custoRolo);
  const pesoRolo = clampNumber(input.pesoRolo);
  const pesoPeca = clampNumber(input.pesoPeca);
  const tempoMin = clampNumber(input.tempoMin);
  const quantidade = clampNumber(input.quantidade);
  const precoVenda = clampNumber(input.precoVenda);

  const custoFilamento = pesoRolo > 0 ? (custoRolo / pesoRolo) * pesoPeca : 0;
  const custoEnergia = (tempoMin / 60) * s.consumoKw * s.tarifaEnergiaKwh;
  const custoDepreciacao = (tempoMin / 60) * s.depreciacaoHora;
  const custoFixo = s.custoFixoUnidade;

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
  settings?: AppSettings;
}): {
  breakdown: CostBreakdown;
  depreciacao: number;
  total: number;
} {
  const s = input.settings ?? DEFAULT_APP_SETTINGS;
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
    settings: s,
  }).custoFilamento;

  const custoEnergia = (tempoMin / 60) * s.consumoKw * s.tarifaEnergiaKwh;
  const custoDepreciacao = (tempoMin / 60) * s.depreciacaoHora;
  const custoFixo = s.custoFixoUnidade;

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

