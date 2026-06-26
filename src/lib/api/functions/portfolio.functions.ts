import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Order, PortfolioProject } from "../../domain/types";
import { clientsRepo, ordersRepo, portfolioRepo } from "../../server/repositories.server";
import { nowIso } from "../../server/db.server";
import { resolveClientId } from "./shared";

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
    }),
  )
  .handler(async ({ data }) => {
    const repo = await portfolioRepo();
    const now = nowIso();
    const project: PortfolioProject = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      perdaPercent: data.perdaPercent ?? 0,
      ...data,
    };
    await repo.save([project, ...repo.list]);
    return { ok: true };
  });

export const removePortfolioProject = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
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
    }),
  )
  .handler(async ({ data }) => {
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
    const [orders, portfolio, clientsData] = await Promise.all([ordersRepo(), portfolioRepo(), clientsRepo()]);
    const project = portfolio.list.find((item) => item.id === data.portfolioProjectId);
    if (!project) return { ok: false as const };
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
