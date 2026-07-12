import { describe, it, expect } from "vitest";
import { z } from "zod";

// ── Replicate the schemas from portfolio.functions.ts for testing ──

const calculatorFilamentoItemSchema = z.object({
  id: z.string().min(1),
  source: z.enum(["stock", "manual"]),
  filamentoId: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  marca: z.string().nullable().optional(),
  cor: z.string().nullable().optional(),
  precoRolo: z.number().min(0),
  pesoRolo: z.number().min(0),
  pesoUsado: z.number().min(0),
});

const calculatorExtraCostSchema = z.object({
  id: z.string().min(1),
  nome: z.string().min(1),
  custo: z.number().min(0),
  quantidade: z.number().min(0),
});

const addPortfolioProjectSchema = z.object({
  nome: z.string().trim().min(1).max(100),
  categoria: z.string().trim().min(1).max(50),
  linkModelo: z.string().url().optional(),
  filamentoId: z.string().min(1).optional(),
  custoRolo: z.number().min(0.01).max(100000),
  pesoRolo: z.number().min(1).max(100000),
  pesoPeca: z.number().min(0.1).max(100000),
  tempoMin: z.number().min(0).max(100000),
  quantidade: z.number().int().min(1).max(100000),
  precoVenda: z.number().min(0).max(1000000),
  perdaPercent: z.number().min(0).max(100).optional(),
  isPublic: z.boolean().default(false),
  filamentos: z.array(calculatorFilamentoItemSchema).optional(),
  custosExtras: z.array(calculatorExtraCostSchema).optional(),
  custoKwh: z.number().min(0).nullable().optional(),
  custoKwOverride: z.number().min(0).nullable().optional(),
  custoTrabalhoHoras: z.number().min(0).nullable().optional(),
  custoTrabalhoValorHora: z.number().min(0).nullable().optional(),
  taxaGateway: z.number().min(0).max(100).nullable().optional(),
});

const updatePortfolioProjectSchema = z.object({
  id: z.string().min(1),
  nome: z.string().trim().min(1).max(200),
  categoria: z.string().trim().min(1).max(200),
  linkModelo: z.string().max(2000).nullable(),
  filamentoId: z.string().min(1).nullable(),
  custoRolo: z.number().min(0.01),
  pesoRolo: z.number().min(1),
  pesoPeca: z.number().min(0.01),
  tempoMin: z.number().min(0.1),
  quantidade: z.number().int().min(1),
  precoVenda: z.number().min(0.01),
  perdaPercent: z.number().min(0).max(100).nullable(),
  isPublic: z.boolean(),
  filamentos: z.array(calculatorFilamentoItemSchema).optional(),
  custosExtras: z.array(calculatorExtraCostSchema).optional(),
  custoKwh: z.number().min(0).nullable().optional(),
  custoKwOverride: z.number().min(0).nullable().optional(),
  custoTrabalhoHoras: z.number().min(0).nullable().optional(),
  custoTrabalhoValorHora: z.number().min(0).nullable().optional(),
  taxaGateway: z.number().min(0).max(100).nullable().optional(),
});

// ── Test data factory ──

function validAddProject(overrides = {}) {
  return {
    nome: "Test Project",
    categoria: "Decoração",
    custoRolo: 120,
    pesoRolo: 1000,
    pesoPeca: 50,
    tempoMin: 180,
    quantidade: 10,
    precoVenda: 35,
    ...overrides,
  };
}

function validUpdateProject(overrides = {}) {
  return {
    id: "proj-001",
    nome: "Updated Project",
    categoria: "Decoração",
    linkModelo: null,
    filamentoId: null,
    custoRolo: 120,
    pesoRolo: 1000,
    pesoPeca: 50,
    tempoMin: 180,
    quantidade: 10,
    precoVenda: 35,
    perdaPercent: null,
    isPublic: false,
    ...overrides,
  };
}

// ── Tests ──

describe("addPortfolioProject schema", () => {
  it("accepts valid project data", () => {
    const result = addPortfolioProjectSchema.safeParse(validAddProject());
    expect(result.success).toBe(true);
  });

  it("accepts project with isPublic = true", () => {
    const result = addPortfolioProjectSchema.safeParse(validAddProject({ isPublic: true }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isPublic).toBe(true);
  });

  it("defaults isPublic to false when not provided", () => {
    const data = validAddProject();
    delete (data as any).isPublic;
    const result = addPortfolioProjectSchema.safeParse(data);
    if (result.success) expect(result.data.isPublic).toBe(false);
  });

  it("rejects empty nome", () => {
    const result = addPortfolioProjectSchema.safeParse(validAddProject({ nome: "" }));
    expect(result.success).toBe(false);
  });

  it("rejects negative tempoMin", () => {
    const result = addPortfolioProjectSchema.safeParse(validAddProject({ tempoMin: -1 }));
    expect(result.success).toBe(false);
  });

  it("rejects invalid linkModelo URL", () => {
    const result = addPortfolioProjectSchema.safeParse(
      validAddProject({ linkModelo: "not-a-url" }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts valid linkModelo URL", () => {
    const result = addPortfolioProjectSchema.safeParse(
      validAddProject({ linkModelo: "https://example.com/model" }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects perdaPercent > 100", () => {
    const result = addPortfolioProjectSchema.safeParse(validAddProject({ perdaPercent: 150 }));
    expect(result.success).toBe(false);
  });

  it("rejects quantidade = 0", () => {
    const result = addPortfolioProjectSchema.safeParse(validAddProject({ quantidade: 0 }));
    expect(result.success).toBe(false);
  });

  it("accepts optional filamentos array", () => {
    const result = addPortfolioProjectSchema.safeParse(
      validAddProject({
        filamentos: [
          { id: "f1", source: "stock", precoRolo: 100, pesoRolo: 1000, pesoUsado: 50 },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts optional custosExtras array", () => {
    const result = addPortfolioProjectSchema.safeParse(
      validAddProject({
        custosExtras: [{ id: "e1", nome: "Packaging", custo: 5, quantidade: 1 }],
      }),
    );
    expect(result.success).toBe(true);
  });
});

describe("updatePortfolioProject schema", () => {
  it("accepts valid update data", () => {
    const result = updatePortfolioProjectSchema.safeParse(validUpdateProject());
    expect(result.success).toBe(true);
  });

  it("requires isPublic field", () => {
    const data = validUpdateProject();
    delete (data as any).isPublic;
    const result = updatePortfolioProjectSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects empty nome", () => {
    const result = updatePortfolioProjectSchema.safeParse(validUpdateProject({ nome: "" }));
    expect(result.success).toBe(false);
  });

  it("accepts nullable fields", () => {
    const result = updatePortfolioProjectSchema.safeParse(
      validUpdateProject({
        linkModelo: null,
        filamentoId: null,
        perdaPercent: null,
        custoKwh: null,
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects quantidade = 0", () => {
    const result = updatePortfolioProjectSchema.safeParse(validUpdateProject({ quantidade: 0 }));
    expect(result.success).toBe(false);
  });

  it("rejects invalid id (empty)", () => {
    const result = updatePortfolioProjectSchema.safeParse(validUpdateProject({ id: "" }));
    expect(result.success).toBe(false);
  });
});
