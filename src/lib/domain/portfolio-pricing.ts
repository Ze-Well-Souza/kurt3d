import type { AppSettings } from "./types";
import { DEFAULT_APP_SETTINGS } from "./types";

export const BAMBU_PRESETS = [
  { id: "X1C", label: "X1-Carbon", watts: 350 },
  { id: "X1E", label: "X1E", watts: 350 },
  { id: "P1S", label: "P1S", watts: 190 },
  { id: "P1P", label: "P1P", watts: 190 },
  { id: "A1", label: "A1", watts: 150 },
  { id: "A1Mini", label: "A1 Mini", watts: 60 },
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
};

function clampNumber(n: number) {
  return Number.isFinite(n) ? n : 0;
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

  const custoPorGrama = input.pesoRolo > 0 ? input.custoRolo / input.pesoRolo : 0;
  const custoFilamentoLote = custoPorGrama * pesoUnitario * quantidade;
  const custoEnergiaPorImpressao = (tempoEntradaMin / 60) * consumoKw * s.tarifaEnergiaKwh;
  const custoDepreciacaoPorImpressao = (tempoEntradaMin / 60) * amortHoraCalc;
  const custoEnergiaLote = impressoesLote * custoEnergiaPorImpressao;
  const custoDepreciacaoLote = impressoesLote * custoDepreciacaoPorImpressao;
  const custoFixoLote = s.custoFixoUnidade * quantidade;
  const custoBaseLote = custoFilamentoLote + custoEnergiaLote + custoDepreciacaoLote + custoFixoLote;
  const custoPerda = custoBaseLote * ((input.perdaPercent || 0) / 100);
  const custoLote = custoBaseLote + custoPerda;
  const custoUnidade = quantidade > 0 ? custoLote / quantidade : 0;
  const receitaTotal = Math.max(0, clampNumber(input.precoVenda)) * quantidade;
  const lucroLiquido = receitaTotal - custoLote;
  const margem = Math.max(0, clampNumber(input.margemPercent ?? 0));
  const precoSugerido = custoUnidade * (1 + margem / 100);

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
