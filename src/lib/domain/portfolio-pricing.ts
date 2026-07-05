import type { AppSettings, CalculatorFilamentoInput, CalculatorExtraCost } from "./types";
import { DEFAULT_APP_SETTINGS } from "./types";

export const BAMBU_PRESETS = [
  { id: "A1", label: "Bambu Lab A1", watts: 150 },
] as const;

export type BambuPresetId = (typeof BAMBU_PRESETS)[number]["id"];
export type PortfolioCalculatorEntryMode = "slicer" | "unit";

export type PortfolioCalculatorInput = {
  custoRolo: number;
  pesoRolo: number;
  pesoEntrada: number;
  tempoEntradaMin: number;
  quantidade: number;
  precoVenda: number;
  perdaPercent: number;
  settings?: AppSettings;
  modeloPreset?: BambuPresetId;
  precoImpressora?: number;
  vidaUtilHoras?: number;
  margemPercent?: number;
  entryMode?: PortfolioCalculatorEntryMode;
  unidadesPorImpressao?: number;
};

export type PortfolioCalculatorResult = {
  custoUnidade: number;
  custoFilamento: number;
  custoEnergia: number;
  custoDepreciacao: number;
  custoFixo: number;
  custoPerda: number;
  custoLote: number;
  receitaTotal: number;
  lucroLiquido: number;
  precoSugerido: number;
  consumoKw: number;
  amortHora: number;
  pesoUnitario: number;
  tempoUnitario: number;
  impressoesLote: number;
  unidadesPorImpressao: number;
  // New fields for advanced calculator
  custoFilamentosDetalhado?: number;
  custoExtraTotal?: number;
  custoTrabalho?: number;
  taxaGatewayAplicada?: number;
  precoComTaxa?: number;
  custoBaseLote?: number;
};

function clampNumber(n: number) {
  return Number.isFinite(n) ? n : 0;
}

// ── Advanced input for multi-filament + extra costs ──
export type AdvancedPortfolioCalculatorInput = PortfolioCalculatorInput & {
  filamentos?: CalculatorFilamentoInput[];
  custosExtras?: CalculatorExtraCost[];
  taxaGateway?: number;
  custoTrabalhoHoras?: number;
  custoTrabalhoValorHora?: number;
  custoKwhOverride?: number;
  consumoKwOverride?: number;
};

function sumFilamentosCost(filamentos: CalculatorFilamentoInput[]): number {
  let total = 0;
  for (const f of filamentos) {
    if (f.pesoRolo > 0 && f.pesoUsado > 0) {
      total += (f.precoRolo / f.pesoRolo) * f.pesoUsado;
    }
  }
  return total;
}

function sumExtraCosts(custos: CalculatorExtraCost[]): number {
  let total = 0;
  for (const c of custos) {
    if (c.custo > 0 && c.quantidade > 0) {
      total += c.custo * c.quantidade;
    }
  }
  return total;
}

export function calcAdvancedPortfolioPricing(input: AdvancedPortfolioCalculatorInput): PortfolioCalculatorResult {
  const s = input.settings ?? DEFAULT_APP_SETTINGS;
  const preset = input.modeloPreset ? BAMBU_PRESETS.find((m) => m.id === input.modeloPreset) : undefined;
  const consumoKw = input.consumoKwOverride ?? (preset ? preset.watts / 1000 : s.consumoKw);
  const amortHoraCalc =
    input.precoImpressora && input.vidaUtilHoras && input.vidaUtilHoras > 0
      ? input.precoImpressora / input.vidaUtilHoras
      : s.depreciacaoHora;

  const entryMode = input.entryMode ?? "unit";
  const quantidade = Math.max(0, clampNumber(input.quantidade));
  const unidadesPorImpressao = Math.max(1, Math.round(clampNumber(input.unidadesPorImpressao || 1)));
  const pesoEntrada = Math.max(0, clampNumber(input.pesoEntrada));
  const tempoEntradaMin = Math.max(0, clampNumber(input.tempoEntradaMin));
  const pesoUnitario = entryMode === "slicer" ? pesoEntrada / unidadesPorImpressao : pesoEntrada;
  const tempoUnitario = entryMode === "slicer" ? tempoEntradaMin / unidadesPorImpressao : tempoEntradaMin;
  const impressoesLote = quantidade > 0 ? (entryMode === "slicer" ? Math.ceil(quantidade / unidadesPorImpressao) : quantidade) : 0;

  // Tarifa pode ser sobrescrita pelo projeto
  const tarifaKwh = input.custoKwhOverride ?? s.tarifaEnergiaKwh;

  // Filamento: multi-filamento ou fallback para o antigo
  let custoFilamentoLote = 0;
  if (input.filamentos && input.filamentos.length > 0) {
    custoFilamentoLote = sumFilamentosCost(input.filamentos);
  } else {
    const custoPorGrama = input.pesoRolo > 0 ? Math.max(0, clampNumber(input.custoRolo)) / Math.max(1, clampNumber(input.pesoRolo)) : 0;
    custoFilamentoLote = custoPorGrama * pesoUnitario * quantidade;
  }

  const custoEnergiaPorImpressao = (tempoEntradaMin / 60) * consumoKw * tarifaKwh;
  const custoDepreciacaoPorImpressao = (tempoEntradaMin / 60) * amortHoraCalc;
  const custoEnergiaLote = impressoesLote * custoEnergiaPorImpressao;
  const custoDepreciacaoLote = impressoesLote * custoDepreciacaoPorImpressao;
  const custoFixoLote = s.custoFixoUnidade * quantidade;

  // Extra costs
  const custoExtraTotal = input.custosExtras?.length ? sumExtraCosts(input.custosExtras) : 0;

  // Labor cost
  const custoTrabalho =
    (input.custoTrabalhoHoras && input.custoTrabalhoValorHora)
      ? input.custoTrabalhoHoras * input.custoTrabalhoValorHora
      : 0;

  const custoBaseLote = custoFilamentoLote + custoEnergiaLote + custoDepreciacaoLote + custoFixoLote + custoExtraTotal + custoTrabalho;
  const perdaPercent = Math.max(0, Math.min(100, clampNumber(input.perdaPercent ?? 0)));
  const custoPerda = custoBaseLote * (perdaPercent / 100);
  const custoLote = custoBaseLote + custoPerda;
  const custoUnidade = quantidade > 0 ? custoLote / quantidade : 0;
  const receitaTotal = Math.max(0, clampNumber(input.precoVenda)) * quantidade;
  const lucroLiquido = receitaTotal - custoLote;

  // Preço sugerido com margem e taxa do gateway
  const margem = Math.max(0, Math.min(1000, clampNumber(input.margemPercent ?? 0)));
  const taxaGateway = Math.max(0, Math.min(100, clampNumber(input.taxaGateway ?? 0)));
  const precoComMargem = custoUnidade * (1 + margem / 100);
  const precoSugerido = taxaGateway > 0
    ? precoComMargem / (1 - taxaGateway / 100)
    : precoComMargem;
  const taxaGatewayAplicada = precoSugerido - precoComMargem;

  return {
    custoUnidade,
    custoFilamento: quantidade > 0 ? custoFilamentoLote / quantidade : 0,
    custoEnergia: quantidade > 0 ? custoEnergiaLote / quantidade : 0,
    custoDepreciacao: quantidade > 0 ? custoDepreciacaoLote / quantidade : 0,
    custoFixo: s.custoFixoUnidade,
    custoPerda: quantidade > 0 ? custoPerda / quantidade : 0,
    custoLote,
    receitaTotal,
    lucroLiquido,
    precoSugerido,
    consumoKw,
    amortHora: amortHoraCalc,
    pesoUnitario,
    tempoUnitario,
    impressoesLote,
    unidadesPorImpressao,
    custoFilamentosDetalhado: custoFilamentoLote,
    custoExtraTotal,
    custoTrabalho,
    taxaGatewayAplicada: taxaGateway > 0 ? taxaGatewayAplicada : 0,
    precoComTaxa: precoSugerido,
    custoBaseLote,
  };
}

export function calcPortfolioPricing(input: PortfolioCalculatorInput): PortfolioCalculatorResult {
  const s = input.settings ?? DEFAULT_APP_SETTINGS;
  const preset = input.modeloPreset ? BAMBU_PRESETS.find((m) => m.id === input.modeloPreset) : undefined;
  const consumoKw = preset ? preset.watts / 1000 : s.consumoKw;
  const amortHoraCalc =
    input.precoImpressora && input.vidaUtilHoras && input.vidaUtilHoras > 0
      ? input.precoImpressora / input.vidaUtilHoras
      : s.depreciacaoHora;

  const entryMode = input.entryMode ?? "unit";
  const quantidade = Math.max(0, clampNumber(input.quantidade));
  const unidadesPorImpressao = Math.max(1, Math.round(clampNumber(input.unidadesPorImpressao || 1)));
  const pesoEntrada = Math.max(0, clampNumber(input.pesoEntrada));
  const tempoEntradaMin = Math.max(0, clampNumber(input.tempoEntradaMin));
  const pesoUnitario = entryMode === "slicer" ? pesoEntrada / unidadesPorImpressao : pesoEntrada;
  const tempoUnitario = entryMode === "slicer" ? tempoEntradaMin / unidadesPorImpressao : tempoEntradaMin;
  const impressoesLote = quantidade > 0 ? (entryMode === "slicer" ? Math.ceil(quantidade / unidadesPorImpressao) : quantidade) : 0;

  const custoPorGrama = input.pesoRolo > 0 ? Math.max(0, clampNumber(input.custoRolo)) / Math.max(1, clampNumber(input.pesoRolo)) : 0;
  const custoFilamentoLote = custoPorGrama * pesoUnitario * quantidade;
  const custoEnergiaPorImpressao = (tempoEntradaMin / 60) * consumoKw * s.tarifaEnergiaKwh;
  const custoDepreciacaoPorImpressao = (tempoEntradaMin / 60) * amortHoraCalc;
  const custoEnergiaLote = impressoesLote * custoEnergiaPorImpressao;
  const custoDepreciacaoLote = impressoesLote * custoDepreciacaoPorImpressao;
  const custoFixoLote = s.custoFixoUnidade * quantidade;
  const custoBaseLote = custoFilamentoLote + custoEnergiaLote + custoDepreciacaoLote + custoFixoLote;
  const perdaPercent = Math.max(0, Math.min(100, clampNumber(input.perdaPercent ?? 0)));
  const custoPerda = custoBaseLote * (perdaPercent / 100);
  const custoLote = custoBaseLote + custoPerda;
  const custoUnidade = quantidade > 0 ? custoLote / quantidade : 0;
  const receitaTotal = Math.max(0, clampNumber(input.precoVenda)) * quantidade;
  const lucroLiquido = receitaTotal - custoLote;
  const precoSugerido = custoUnidade * (1 + Math.max(0, Math.min(1000, clampNumber(input.margemPercent ?? 0))) / 100);

  return {
    custoUnidade,
    custoFilamento: quantidade > 0 ? custoFilamentoLote / quantidade : 0,
    custoEnergia: quantidade > 0 ? custoEnergiaLote / quantidade : 0,
    custoDepreciacao: quantidade > 0 ? custoDepreciacaoLote / quantidade : 0,
    custoFixo: s.custoFixoUnidade,
    custoPerda: quantidade > 0 ? custoPerda / quantidade : 0,
    custoLote,
    receitaTotal,
    lucroLiquido,
    precoSugerido,
    consumoKw,
    amortHora: amortHoraCalc,
    pesoUnitario,
    tempoUnitario,
    impressoesLote,
    unidadesPorImpressao,
  };
}
