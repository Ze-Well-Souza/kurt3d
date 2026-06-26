import { describe, expect, it } from "vitest";
import { extractQuantityNumber, getFilamentoAlertLevel, getInsumoAlertLevel } from "./stock-alert";

describe("stock alerts", () => {
  it("classifica filamento com pouca disponibilidade como baixo estoque", () => {
    expect(getFilamentoAlertLevel({
      pesoInicial: 1000,
      pesoAtual: 350,
      disponivelGrams: 180,
    })).toBe("low");
  });

  it("classifica filamento intermediario como alerta medio", () => {
    expect(getFilamentoAlertLevel({
      pesoInicial: 1000,
      pesoAtual: 380,
      disponivelGrams: 380,
    })).toBe("medium");
  });

  it("extrai quantidade numerica de insumo textual", () => {
    expect(extractQuantityNumber("2 un.")).toBe(2);
    expect(extractQuantityNumber("500ml")).toBe(500);
    expect(extractQuantityNumber("sem controle")).toBeNull();
  });

  it("sinaliza insumo baixo quando quantidade numerica e pequena", () => {
    expect(getInsumoAlertLevel({ quantidade: "3 un." })).toBe("low");
    expect(getInsumoAlertLevel({ quantidade: "8 un." })).toBe("ok");
    expect(getInsumoAlertLevel({ quantidade: "frasco aberto" })).toBe("unknown");
  });
});
