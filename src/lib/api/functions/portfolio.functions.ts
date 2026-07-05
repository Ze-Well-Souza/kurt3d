import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Order, PortfolioProject } from "../../domain/types";
import { clientsRepo, ordersRepo, portfolioRepo } from "../../server/repositories.server";
import { nowIso } from "../../server/db.server";
import { requireSession } from "../../server/require-session.server";
import { assertExplicitClientIdExists, resolveClientId } from "./shared";
import { checkMutationRateLimit } from "../../server/mutation-guard.server";

export const listPortfolio = createServerFn({ method: "GET" }).handler(async () => {
  const repo = await portfolioRepo();
  return repo.list;
});

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

export const addPortfolioProject = createServerFn({ method: "POST" })
  .validator(
    z.object({
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
      // New multi-filament + cost fields
      filamentos: z.array(calculatorFilamentoItemSchema).optional(),
      custosExtras: z.array(calculatorExtraCostSchema).optional(),
      custoKwh: z.number().min(0).nullable().optional(),
      custoKwOverride: z.number().min(0).nullable().optional(),
      custoTrabalhoHoras: z.number().min(0).nullable().optional(),
      custoTrabalhoValorHora: z.number().min(0).nullable().optional(),
      taxaGateway: z.number().min(0).max(100).nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await portfolioRepo();
    const now = nowIso();
    const project: PortfolioProject = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      perdaPercent: data.perdaPercent ?? 0,
      nome: data.nome,
      categoria: data.categoria,
      linkModelo: data.linkModelo,
      filamentoId: data.filamentoId,
      custoRolo: data.custoRolo,
      pesoRolo: data.pesoRolo,
      pesoPeca: data.pesoPeca,
      tempoMin: data.tempoMin,
      quantidade: data.quantidade,
      precoVenda: data.precoVenda,
      filamentos: data.filamentos,
      custosExtras: data.custosExtras,
      custoKwh: data.custoKwh ?? null,
      custoKwOverride: data.custoKwOverride ?? null,
      custoTrabalhoHoras: data.custoTrabalhoHoras ?? null,
      custoTrabalhoValorHora: data.custoTrabalhoValorHora ?? null,
      taxaGateway: data.taxaGateway ?? null,
    };
    await repo.save([project, ...repo.list]);
    return { ok: true };
  });

export const removePortfolioProject = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await portfolioRepo();
    await repo.save(repo.list.filter((project) => project.id !== data.id));
    return { ok: true };
  });

export const updatePortfolioProject = createServerFn({ method: "POST" })
  .validator(
    z.object({
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
      // New multi-filament + cost fields
      filamentos: z.array(calculatorFilamentoItemSchema).optional(),
      custosExtras: z.array(calculatorExtraCostSchema).optional(),
      custoKwh: z.number().min(0).nullable().optional(),
      custoKwOverride: z.number().min(0).nullable().optional(),
      custoTrabalhoHoras: z.number().min(0).nullable().optional(),
      custoTrabalhoValorHora: z.number().min(0).nullable().optional(),
      taxaGateway: z.number().min(0).max(100).nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const portfolio = await portfolioRepo();
    const project = portfolio.list.find((item) => item.id === data.id);
    if (!project) return { ok: false as const, reason: "not_found" as const };

    const updated: PortfolioProject = {
      ...project,
      nome: data.nome,
      categoria: data.categoria,
      linkModelo: data.linkModelo ?? undefined,
      filamentoId: data.filamentoId ?? undefined,
      custoRolo: data.custoRolo,
      pesoRolo: data.pesoRolo,
      pesoPeca: data.pesoPeca,
      tempoMin: data.tempoMin,
      quantidade: data.quantidade,
      precoVenda: data.precoVenda,
      perdaPercent: data.perdaPercent ?? 0,
      filamentos: data.filamentos,
      custosExtras: data.custosExtras,
      custoKwh: data.custoKwh ?? null,
      custoKwOverride: data.custoKwOverride ?? null,
      custoTrabalhoHoras: data.custoTrabalhoHoras ?? null,
      custoTrabalhoValorHora: data.custoTrabalhoValorHora ?? null,
      taxaGateway: data.taxaGateway ?? null,
      updatedAt: nowIso(),
    };
    await portfolio.save(portfolio.list.map((item) => (item.id === project.id ? updated : item)));
    return { ok: true as const };
  });

export const createOrderFromPortfolio = createServerFn({ method: "POST" })
  .validator(
    z.object({
      portfolioProjectId: z.string().min(1),
      client: z.string().trim().min(1).max(120),
      clientId: z.string().min(1).optional(),
      quantity: z.number().int().min(1).max(100000),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const [orders, portfolio, clientsData] = await Promise.all([ordersRepo(), portfolioRepo(), clientsRepo()]);
    const project = portfolio.list.find((item) => item.id === data.portfolioProjectId);
    if (!project) return { ok: false as const };
    assertExplicitClientIdExists(clientsData.list, data.clientId);
    const now = nowIso();
    const order: Order = {
      id: randomUUID(),
      client: data.client,
      projectName: project.nome,
      quantity: data.quantity,
      timeMinutes: project.tempoMin,
      status: "todo",
      createdAt: now,
      updatedAt: now,
      portfolioProjectId: project.id,
      filamentoId: project.filamentoId,
      gramsPerUnit: project.pesoPeca,
      precoVenda: project.precoVenda,
      linkProjeto: project.linkModelo ?? null,
      clientId: resolveClientId(clientsData.list, data.client, data.clientId),
    };
    await orders.save([order, ...orders.list]);
    return { ok: true as const };
  });
