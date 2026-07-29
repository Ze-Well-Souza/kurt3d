/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CALCULADORA DE PRECIFICAÇÃO DE IMPRESSÃO 3D — Kurti 3D
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Módulo puro (sem dependência de rede/banco): você busca o filamento no
 * Supabase pelo ID e passa o objeto `Filamento` para a função. Assim o cálculo
 * é 100% testável, determinístico e reutilizável no client ou no server.
 *
 * FÓRMULA DE PRECIFICAÇÃO:
 *
 *   1. Custo do Filamento  = (preçoPago ÷ pesoInicial) × gramasUsadas
 *   2. Custo de Máquina    = horasImpressão × (depreciação/h + kW × tarifa kWh)
 *   3. Custo de Mão de Obra = (minSetup + minAcabamento) ÷ 60 × valorHora
 *   ─────────────────────────────────────────────────────
 *   Custo Base             = 1 + 2 + 3
 *   4. Margem de Falha     = Custo Base × (% falha ÷ 100)      [ex.: 5–10%]
 *   Custo Total            = Custo Base + Margem de Falha
 *   5. Margem de Lucro     = Custo Total × (% lucro ÷ 100)     [ex.: 30–50%]
 *   ─────────────────────────────────────────────────────
 *   PREÇO FINAL            = Custo Total + Margem de Lucro
 */

import { z } from "zod";
import type { Filamento, AppSettings } from "./types";
import { DEFAULT_APP_SETTINGS } from "./types";

// ─── Validação de entrada (Zod) ──────────────────────────────────────────────

/** Schema de validação: rejeita valores negativos, NaN e percentuais absurdos. */
export const pricingInputSchema = z.object({
  /** Peso da peça em gramas (do fatiador). */
  pesoGramas: z.number().min(0.1, "Peso deve ser maior que 0g").max(50_000),
  /** Tempo de impressão em minutos (do fatiador). */
  tempoImpressaoMin: z.number().min(1, "Tempo deve ser de ao menos 1 minuto").max(100_000),
  /** Tempo de preparação (setup da impressora, fatiamento, troca de filamento) em minutos. */
  tempoSetupMin: z.number().min(0).max(10_000).default(0),
  /** Tempo de pós-processamento (remoção de suportes, lixamento, pintura) em minutos. */
  tempoAcabamentoMin: z.number().min(0).max(10_000).default(0),
  /** Valor da sua hora de trabalho em R$ (mão de obra). */
  valorHoraTrabalho: z.number().min(0).max(10_000).default(0),
  /** Margem de falha em % (cobre impressões perdidas). Recomendado: 5 a 10. */
  margemFalhaPercent: z.number().min(0).max(100).default(5),
  /** Margem de lucro em %. Recomendado: 30 a 50. */
  margemLucroPercent: z.number().min(0).max(1000).default(30),
});

export type PricingInput = z.input<typeof pricingInputSchema>;

// ─── Resultado detalhado ─────────────────────────────────────────────────────

export type PricingResult = {
  /** Custo do material: (preço pago no rolo ÷ peso inicial) × gramas usadas. */
  custoFilamento: number;
  /** Custo de energia elétrica: horas × kW × tarifa kWh. */
  custoEnergia: number;
  /** Custo de depreciação da impressora: horas × depreciação/hora. */
  custoDepreciacao: number;
  /** Custo de mão de obra: (setup + acabamento) × valor/hora. */
  custoMaoDeObra: number;
  /** Soma dos custos diretos (antes da margem de falha). */
  custoBase: number;
  /** Valor adicionado pela margem de falha. */
  valorMargemFalha: number;
  /** Custo total = custo base + margem de falha. */
  custoTotal: number;
  /** Valor adicionado pela margem de lucro. */
  valorMargemLucro: number;
  /** Preço final sugerido ao cliente. */
  precoFinal: number;
  /** Custo por grama do filamento selecionado (útil para exibir na UI). */
  custoPorGrama: number;
};

// ─── Função principal ────────────────────────────────────────────────────────

/**
 * Calcula o preço de venda de uma peça impressa em 3D.
 *
 * @param filamento  Registro do filamento buscado no banco pelo ID selecionado.
 *                   O custo por grama é derivado dinamicamente de
 *                   `precoPago / pesoInicial`.
 * @param input      Parâmetros da impressão (peso, tempo, mão de obra, margens).
 * @param settings   Configurações do estúdio (tarifa de energia, consumo em kW,
 *                   depreciação/hora). Usa `DEFAULT_APP_SETTINGS` se omitido.
 * @throws ZodError  Se algum parâmetro de entrada for inválido.
 * @throws Error     Se o filamento tiver peso inicial inválido (divisão por zero).
 */
export function calcularPrecoImpressao3D(
  filamento: Pick<Filamento, "precoPago" | "pesoInicial">,
  input: PricingInput,
  settings?: AppSettings,
): PricingResult {
  // 1. Validação — falha cedo com mensagem clara em vez de retornar NaN.
  const dados = pricingInputSchema.parse(input);
  const s = settings ?? DEFAULT_APP_SETTINGS;

  if (!Number.isFinite(filamento.pesoInicial) || filamento.pesoInicial <= 0) {
    throw new Error("Filamento inválido: peso inicial deve ser maior que zero.");
  }
  if (!Number.isFinite(filamento.precoPago) || filamento.precoPago < 0) {
    throw new Error("Filamento inválido: preço pago não pode ser negativo.");
  }

  // 2. Custo do filamento — derivado dinamicamente do registro do banco.
  const custoPorGrama = filamento.precoPago / filamento.pesoInicial;
  const custoFilamento = custoPorGrama * dados.pesoGramas;

  // 3. Custo de máquina — energia + depreciação, proporcional às horas de impressão.
  const horasImpressao = dados.tempoImpressaoMin / 60;
  const custoEnergia = horasImpressao * s.consumoKw * s.tarifaEnergiaKwh;
  const custoDepreciacao = horasImpressao * s.depreciacaoHora;

  // 4. Custo de mão de obra — setup + pós-processamento.
  const horasTrabalho = (dados.tempoSetupMin + dados.tempoAcabamentoMin) / 60;
  const custoMaoDeObra = horasTrabalho * dados.valorHoraTrabalho;

  // 5. Margens — falha aplicada sobre o custo base; lucro sobre o custo total.
  const custoBase = custoFilamento + custoEnergia + custoDepreciacao + custoMaoDeObra;
  const valorMargemFalha = custoBase * (dados.margemFalhaPercent / 100);
  const custoTotal = custoBase + valorMargemFalha;
  const valorMargemLucro = custoTotal * (dados.margemLucroPercent / 100);
  const precoFinal = custoTotal + valorMargemLucro;

  // 6. Arredonda tudo para 2 casas decimais (centavos) apenas na saída,
  //    preservando a precisão nos cálculos intermediários.
  return {
    custoFilamento: arredondar(custoFilamento),
    custoEnergia: arredondar(custoEnergia),
    custoDepreciacao: arredondar(custoDepreciacao),
    custoMaoDeObra: arredondar(custoMaoDeObra),
    custoBase: arredondar(custoBase),
    valorMargemFalha: arredondar(valorMargemFalha),
    custoTotal: arredondar(custoTotal),
    valorMargemLucro: arredondar(valorMargemLucro),
    precoFinal: arredondar(precoFinal),
    custoPorGrama: arredondar(custoPorGrama, 4),
  };
}

/** Arredondamento half-up seguro para valores monetários. */
function arredondar(valor: number, casas = 2): number {
  const fator = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * fator) / fator;
}
