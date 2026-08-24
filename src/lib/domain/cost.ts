import type { Filamento, Order, PortfolioProject, AppSettings } from "./types";
import { DEFAULT_APP_SETTINGS } from "./types";
import { clampNumber } from "../utils";

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

/**
 * Peso e tempo efetivos de um pedido (P2-2).
 *
 * O valor gravado no próprio pedido tem precedência sobre o do projeto de
 * portfólio de origem. Um pedido criado a partir de um projeto herda
 * `pesoPeca`/`tempoMin` no momento da criação, mas o pedido é o registro do
 * que realmente aconteceu — se o operador editar o pedido depois, ou o
 * projeto-molde mudar mais tarde, é o valor do pedido que deve valer.
 *
 * Antes desta função existir, `estimateOrderMaterialGrams` (usada para
 * reservar e baixar do estoque) e `calcOrderCostHybrid` (usada para custear a
 * venda) tinham a MESMA decisão implementada com precedência OPOSTA — a
 * primeira dava preferência ao pedido, a segunda ao portfólio. Quando os dois
 * valores divergiam, o que saía do rolo físico não era o que entrava no custo
 * da venda. As duas agora chamam este resolver único.
 */
export function resolveOrderPricingInputs(order: Order, portfolio?: PortfolioProject) {
  return {
    pesoPeca: order.gramsPerUnit ?? portfolio?.pesoPeca ?? 0,
    tempoMin: order.timeMinutes ?? portfolio?.tempoMin ?? 0,
  };
}

export function estimateOrderMaterialGrams(
  order: Order,
  portfolio?: PortfolioProject,
): number | null {
  const { pesoPeca: gramsPerUnit } = resolveOrderPricingInputs(order, portfolio);
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
  const { pesoPeca, tempoMin } = resolveOrderPricingInputs(order, portfolio);
  const quantidade = order.quantity;
  const precoVenda = input.precoVendaUnit ?? 0;

  const cpf = costPerGramFromFilamento(filamento);
  const custoFilamento = cpf
    ? cpf * pesoPeca
    : calcCostFromInputs({
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
