import { describe, expect, it } from "vitest";
import { siteContentSchema, siteTestimonialSchema, heroStatSchema, featureSchema } from "./site-content-schema";

describe("siteTestimonialSchema", () => {
  it("aceita depoimento valido", () => {
    const result = siteTestimonialSchema.safeParse({
      nome: "Maria",
      cargo: "Cliente",
      texto: "Servico excelente!",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita nome vazio", () => {
    const result = siteTestimonialSchema.safeParse({ nome: "", cargo: "Cliente", texto: "Bom" });
    expect(result.success).toBe(false);
  });

  it("rejeita texto muito longo (>2000 chars)", () => {
    const result = siteTestimonialSchema.safeParse({
      nome: "Joao",
      cargo: "Cliente",
      texto: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

describe("heroStatSchema", () => {
  it("aceita estatistica valida", () => {
    const result = heroStatSchema.safeParse({ valor: "500+", label: "Projetos" });
    expect(result.success).toBe(true);
  });

  it("rejeita label vazio", () => {
    const result = heroStatSchema.safeParse({ valor: "100", label: "" });
    expect(result.success).toBe(false);
  });
});

describe("featureSchema", () => {
  it("aceita feature valida", () => {
    const result = featureSchema.safeParse({
      titulo: "Alta Precisao",
      descricao: "Impressao com tolerância de 0.1mm",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita titulo vazio", () => {
    const result = featureSchema.safeParse({ titulo: "", descricao: "Descricao" });
    expect(result.success).toBe(false);
  });
});

describe("siteContentSchema", () => {
  const validContent = {
    heroTitulo: "Impressao 3D Profissional",
    heroSubtitulo: "Transforme suas ideias em realidade",
    heroStats: [{ valor: "500+", label: "Projetos" }],
    features: [{ titulo: "Qualidade", descricao: "Alta precisao" }],
    instagramUrl: "https://instagram.com/kurt3d",
    youtubeUrl: "https://youtube.com/@kurt3d",
    testimonials: [{ nome: "Joao", cargo: "Cliente", texto: "Otimo servico!" }],
  };

  it("aceita conteudo valido completo", () => {
    const result = siteContentSchema.safeParse(validContent);
    expect(result.success).toBe(true);
  });

  it("rejeita heroTitulo vazio", () => {
    const result = siteContentSchema.safeParse({ ...validContent, heroTitulo: "" });
    expect(result.success).toBe(false);
  });

  it("rejeita instagramUrl invalida", () => {
    const result = siteContentSchema.safeParse({ ...validContent, instagramUrl: "nao-e-url" });
    expect(result.success).toBe(false);
  });

  it("rejeita youtubeUrl invalida", () => {
    const result = siteContentSchema.safeParse({ ...validContent, youtubeUrl: "invalida" });
    expect(result.success).toBe(false);
  });

  it("aceita testimonials vazio", () => {
    const result = siteContentSchema.safeParse({ ...validContent, testimonials: [] });
    expect(result.success).toBe(true);
  });

  it("rejeita heroStats vazio (< min)", () => {
    const result = siteContentSchema.safeParse({ ...validContent, heroStats: [] });
    expect(result.success).toBe(false);
  });

  it("rejeita features vazio (< min)", () => {
    const result = siteContentSchema.safeParse({ ...validContent, features: [] });
    expect(result.success).toBe(false);
  });

  it("rejeita depoimento com nome muito longo (>200 chars)", () => {
    const result = siteContentSchema.safeParse({
      ...validContent,
      testimonials: [{ nome: "x".repeat(201), cargo: "C", texto: "T" }],
    });
    expect(result.success).toBe(false);
  });
});
