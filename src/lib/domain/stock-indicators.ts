import type { Filamento, FilamentoHistory, FilamentoQualidade } from "./types";

/**
 * Indicadores do estoque de filamento, calculados sobre rolos ativos +
 * arquivados. So depende do que ja esta cadastrado: cor, marca, material,
 * preco, peso e qualidade.
 *
 * Todas as medias de custo por grama sao ponderadas (total investido / total de
 * gramas), nao media das razoes: um rolo de 250g e um de 1kg nao podem pesar
 * igual no resultado.
 */

/** Nota numerica da qualidade, para poder tirar media por marca. */
const PESO_QUALIDADE: Record<FilamentoQualidade, number> = {
  Ótimo: 4,
  bom: 3,
  médio: 2,
  ruim: 1,
};

export const QUALIDADE_MAXIMA = 4;

export type FilamentoIndicavel = Filamento | FilamentoHistory;

export type IndicadorCor = {
  cor: string;
  rolos: number;
  investido: number;
  gramasIniciais: number;
  gramasConsumidas: number;
  /** Investido / gramas iniciais. */
  custoPorGrama: number;
};

export type IndicadorMarca = {
  marca: string;
  rolos: number;
  investido: number;
  custoPorGrama: number;
  /** Media de 1 (ruim) a 4 (otimo). Null quando nenhum rolo da marca foi avaliado. */
  qualidadeMedia: number | null;
  avaliados: number;
  ruins: number;
};

export type IndicadorSimples = {
  chave: string;
  rolos: number;
  investido: number;
  custoPorGrama: number;
};

export type ResumoEstoque = {
  rolos: number;
  investido: number;
  gramasIniciais: number;
  gramasConsumidas: number;
  /** Investido / gramas iniciais de toda a base. */
  custoPorGrama: number;
  custoMedioPorRolo: number;
  /** Valor ja transformado em peca, ao custo por grama de cada rolo. */
  valorConsumido: number;
};

function consumo(f: FilamentoIndicavel): number {
  return Math.max(0, f.pesoInicial - f.pesoAtual);
}

function dividir(numerador: number, denominador: number): number {
  return denominador > 0 ? numerador / denominador : 0;
}

/** Agrupa por uma chave qualquer do rolo, ignorando os que nao a preenchem. */
function agruparSimples(
  lista: FilamentoIndicavel[],
  chaveDe: (f: FilamentoIndicavel) => string | null | undefined,
): IndicadorSimples[] {
  const mapa = new Map<string, { rolos: number; investido: number; gramas: number }>();
  for (const f of lista) {
    const chave = chaveDe(f)?.trim();
    if (!chave) continue;
    const atual = mapa.get(chave) ?? { rolos: 0, investido: 0, gramas: 0 };
    atual.rolos += 1;
    atual.investido += f.precoPago;
    atual.gramas += f.pesoInicial;
    mapa.set(chave, atual);
  }
  return [...mapa.entries()]
    .map(([chave, v]) => ({
      chave,
      rolos: v.rolos,
      investido: v.investido,
      custoPorGrama: dividir(v.investido, v.gramas),
    }))
    .sort((a, b) => b.rolos - a.rolos || a.chave.localeCompare(b.chave, "pt-BR"));
}

export function indicadoresPorCor(lista: FilamentoIndicavel[]): IndicadorCor[] {
  const mapa = new Map<string, IndicadorCor>();
  for (const f of lista) {
    const cor = f.cor?.trim() || "Outro";
    const atual =
      mapa.get(cor) ??
      ({
        cor,
        rolos: 0,
        investido: 0,
        gramasIniciais: 0,
        gramasConsumidas: 0,
        custoPorGrama: 0,
      } satisfies IndicadorCor);
    atual.rolos += 1;
    atual.investido += f.precoPago;
    atual.gramasIniciais += f.pesoInicial;
    atual.gramasConsumidas += consumo(f);
    mapa.set(cor, atual);
  }
  return [...mapa.values()]
    .map((c) => ({ ...c, custoPorGrama: dividir(c.investido, c.gramasIniciais) }))
    .sort((a, b) => b.rolos - a.rolos || a.cor.localeCompare(b.cor, "pt-BR"));
}

export function indicadoresPorMarca(lista: FilamentoIndicavel[]): IndicadorMarca[] {
  const mapa = new Map<
    string,
    {
      rolos: number;
      investido: number;
      gramas: number;
      soma: number;
      avaliados: number;
      ruins: number;
    }
  >();
  for (const f of lista) {
    const marca = f.marca?.trim();
    if (!marca) continue;
    const atual = mapa.get(marca) ?? {
      rolos: 0,
      investido: 0,
      gramas: 0,
      soma: 0,
      avaliados: 0,
      ruins: 0,
    };
    atual.rolos += 1;
    atual.investido += f.precoPago;
    atual.gramas += f.pesoInicial;
    if (f.qualidade && f.qualidade in PESO_QUALIDADE) {
      atual.soma += PESO_QUALIDADE[f.qualidade];
      atual.avaliados += 1;
      if (f.qualidade === "ruim") atual.ruins += 1;
    }
    mapa.set(marca, atual);
  }
  return [...mapa.entries()]
    .map(([marca, v]) => ({
      marca,
      rolos: v.rolos,
      investido: v.investido,
      custoPorGrama: dividir(v.investido, v.gramas),
      qualidadeMedia: v.avaliados > 0 ? v.soma / v.avaliados : null,
      avaliados: v.avaliados,
      ruins: v.ruins,
    }))
    .sort((a, b) => b.rolos - a.rolos || a.marca.localeCompare(b.marca, "pt-BR"));
}

export function indicadoresPorMaterial(lista: FilamentoIndicavel[]): IndicadorSimples[] {
  return agruparSimples(lista, (f) => f.material);
}

export function indicadoresPorOrigem(lista: FilamentoIndicavel[]): IndicadorSimples[] {
  return agruparSimples(lista, (f) => f.ondeComprou);
}

export function resumoEstoque(lista: FilamentoIndicavel[]): ResumoEstoque {
  let investido = 0;
  let gramasIniciais = 0;
  let gramasConsumidas = 0;
  let valorConsumido = 0;
  for (const f of lista) {
    investido += f.precoPago;
    gramasIniciais += f.pesoInicial;
    const usadas = consumo(f);
    gramasConsumidas += usadas;
    valorConsumido += usadas * dividir(f.precoPago, f.pesoInicial);
  }
  return {
    rolos: lista.length,
    investido,
    gramasIniciais,
    gramasConsumidas,
    custoPorGrama: dividir(investido, gramasIniciais),
    custoMedioPorRolo: dividir(investido, lista.length),
    valorConsumido,
  };
}
