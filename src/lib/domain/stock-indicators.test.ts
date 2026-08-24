import { describe, expect, it } from "vitest";
import {
  indicadoresPorCor,
  indicadoresPorMarca,
  indicadoresPorMaterial,
  indicadoresPorOrigem,
  resumoEstoque,
  type FilamentoIndicavel,
} from "./stock-indicators";

function rolo(over: Partial<FilamentoIndicavel> = {}): FilamentoIndicavel {
  return {
    id: crypto.randomUUID(),
    sku: "FIL-001",
    marca: "Creality",
    cor: "Preto",
    material: "PLA",
    pesoInicial: 1000,
    pesoAtual: 1000,
    precoPago: 80,
    dataCompra: "2026-01-01",
    ...over,
  } as FilamentoIndicavel;
}

describe("indicadoresPorCor", () => {
  it("agrupa por cor e soma rolos, investido e consumo", () => {
    const r = indicadoresPorCor([
      rolo({ cor: "Preto", precoPago: 80, pesoAtual: 600 }),
      rolo({ cor: "Preto", precoPago: 100, pesoAtual: 1000 }),
      rolo({ cor: "Azul", precoPago: 90, pesoAtual: 900 }),
    ]);
    expect(r[0]).toMatchObject({ cor: "Preto", rolos: 2, investido: 180, gramasConsumidas: 400 });
    expect(r[1]).toMatchObject({ cor: "Azul", rolos: 1, gramasConsumidas: 100 });
  });

  it("pondera o custo por grama pelo peso, nao pela media das razoes", () => {
    // 250g a R$ 50 (R$ 0,20/g) + 1000g a R$ 80 (R$ 0,08/g).
    // Media das razoes daria R$ 0,14/g; o certo e 130 / 1250 = R$ 0,104/g.
    const [preto] = indicadoresPorCor([
      rolo({ cor: "Preto", pesoInicial: 250, precoPago: 50, pesoAtual: 250 }),
      rolo({ cor: "Preto", pesoInicial: 1000, precoPago: 80, pesoAtual: 1000 }),
    ]);
    expect(preto.custoPorGrama).toBeCloseTo(0.104, 5);
  });

  it("ordena do mais numeroso para o menos", () => {
    const r = indicadoresPorCor([
      rolo({ cor: "Azul" }),
      rolo({ cor: "Preto" }),
      rolo({ cor: "Preto" }),
    ]);
    expect(r.map((x) => x.cor)).toEqual(["Preto", "Azul"]);
  });

  it("cai em 'Outro' quando a cor esta vazia", () => {
    expect(indicadoresPorCor([rolo({ cor: "  " })])[0].cor).toBe("Outro");
  });
});

describe("indicadoresPorMarca", () => {
  it("tira media de qualidade so entre os rolos avaliados", () => {
    const [marca] = indicadoresPorMarca([
      rolo({ marca: "SUNLU", qualidade: "Ótimo" }), // 4
      rolo({ marca: "SUNLU", qualidade: "ruim" }), // 1
      rolo({ marca: "SUNLU" }), // sem avaliacao, fica de fora da media
    ]);
    expect(marca.rolos).toBe(3);
    expect(marca.avaliados).toBe(2);
    expect(marca.qualidadeMedia).toBeCloseTo(2.5, 5);
    expect(marca.ruins).toBe(1);
  });

  it("deixa a qualidade nula quando nenhum rolo da marca foi avaliado", () => {
    const [marca] = indicadoresPorMarca([rolo({ marca: "F3d" })]);
    expect(marca.qualidadeMedia).toBeNull();
    expect(marca.avaliados).toBe(0);
  });
});

describe("agrupamentos simples", () => {
  it("agrupa por material", () => {
    const r = indicadoresPorMaterial([
      rolo({ material: "PLA" }),
      rolo({ material: "PETG" }),
      rolo({ material: "PLA" }),
    ]);
    expect(r.map((x) => [x.chave, x.rolos])).toEqual([
      ["PLA", 2],
      ["PETG", 1],
    ]);
  });

  it("ignora rolos sem loja de origem em vez de criar um grupo vazio", () => {
    const r = indicadoresPorOrigem([
      rolo({ ondeComprou: "Shopee" }),
      rolo({ ondeComprou: null }),
      rolo({ ondeComprou: "  " }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ chave: "Shopee", rolos: 1 });
  });
});

describe("resumoEstoque", () => {
  it("soma a base e valoriza o consumo pelo custo de cada rolo", () => {
    const r = resumoEstoque([
      rolo({ pesoInicial: 1000, pesoAtual: 500, precoPago: 80 }), // 500g a 0,08 = 40
      rolo({ pesoInicial: 250, pesoAtual: 250, precoPago: 50 }), // nada consumido
    ]);
    expect(r.rolos).toBe(2);
    expect(r.investido).toBe(130);
    expect(r.gramasConsumidas).toBe(500);
    expect(r.valorConsumido).toBeCloseTo(40, 5);
    expect(r.custoMedioPorRolo).toBe(65);
    expect(r.custoPorGrama).toBeCloseTo(130 / 1250, 5);
  });

  it("nao divide por zero com a base vazia", () => {
    const r = resumoEstoque([]);
    expect(r.custoPorGrama).toBe(0);
    expect(r.custoMedioPorRolo).toBe(0);
  });
});
