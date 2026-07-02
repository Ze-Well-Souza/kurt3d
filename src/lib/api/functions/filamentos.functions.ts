import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Filamento, FilamentoQualidade } from "../../domain/types";
import { filamentosHistoryRepo, filamentosRepo } from "../../server/repositories.server";
import { requireSession } from "../../server/require-session.server";
import { checkMutationRateLimit } from "../../server/mutation-guard.server";

const filamentoQualidadeSchema = z.enum(["Ótimo", "bom", "médio", "ruim"]);

export const upsertFilamento = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1).optional(),
      sku: z.string().trim().min(1).max(50),
      marca: z.string().trim().min(1).max(100),
      cor: z.string().trim().min(1).max(100),
      material: z.string().trim().min(1).max(20),
      pesoInicial: z.number().min(1).max(100000),
      pesoAtual: z.number().min(0).max(100000).optional(),
      precoPago: z.number().min(0.01).max(100000),
      dataCompra: z.string().min(1).max(30),
      dataEntrega: z.string().min(1).max(30).nullable().optional(),
      qualidade: filamentoQualidadeSchema.nullable().optional(),
      observacao: z.string().max(500).nullable().optional(),
      linkProduto: z.string().url().max(500).nullable().optional(),
      batchId: z.string().min(1).optional(),
      paymentId: z.string().min(1).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await filamentosRepo();
    const id = data.id ?? randomUUID();
    const existing = repo.list.find((filamento) => filamento.id === id);
    const skuNorm = data.sku.trim().toLowerCase();
    const duplicate = repo.list.find(
      (filamento) => filamento.sku.trim().toLowerCase() === skuNorm && filamento.id !== id,
    );
    if (duplicate) {
      throw new Error(`SKU "${data.sku}" já está cadastrado em outro filamento ativo.`);
    }
    if (!existing) {
      const history = await filamentosHistoryRepo();
      const inHistory = history.list.find((filamento) => filamento.sku.trim().toLowerCase() === skuNorm);
      if (inHistory) {
        throw new Error(`SKU "${data.sku}" já foi utilizado em um filamento arquivado.`);
      }
    }
    const nextPesoAtual = data.pesoAtual !== undefined
      ? Math.min(data.pesoAtual, data.pesoInicial)
      : existing
        ? Math.min(existing.pesoAtual, data.pesoInicial)
        : data.pesoInicial;
    const filamento: Filamento = {
      id,
      sku: data.sku,
      marca: data.marca,
      cor: data.cor,
      material: data.material,
      pesoInicial: data.pesoInicial,
      pesoAtual: nextPesoAtual,
      precoPago: data.precoPago,
      dataCompra: data.dataCompra,
      dataEntrega: data.dataEntrega !== undefined ? data.dataEntrega : existing?.dataEntrega ?? null,
      dataFim: existing?.dataFim ?? null,
      qualidade: data.qualidade !== undefined ? data.qualidade : existing?.qualidade ?? null,
      observacao: data.observacao !== undefined ? data.observacao : existing?.observacao ?? existing?.comentario ?? null,
      comentario: data.observacao !== undefined ? data.observacao : existing?.comentario ?? null,
      linkProduto: data.linkProduto !== undefined ? data.linkProduto : existing?.linkProduto ?? null,
      batchId: data.batchId ?? existing?.batchId ?? null,
      paymentId: data.paymentId ?? existing?.paymentId ?? null,
    };
    const next = existing ? repo.list.map((item) => (item.id === id ? filamento : item)) : [...repo.list, filamento];
    await repo.save(next);
    return { ok: true, filamento };
  });

export const removeFilamento = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await filamentosRepo();
    await repo.save(repo.list.filter((filamento) => filamento.id !== data.id));
    return { ok: true };
  });

export const archiveFilamento = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      qualidade: filamentoQualidadeSchema.optional(),
      observacao: z.string().max(500).optional(),
      dataFim: z.string().min(1).max(30).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await filamentosRepo();
    const filamento = repo.list.find((item) => item.id === data.id);
    if (!filamento) return { ok: false as const, reason: "not_found" as const };

    const updatedFilamento: Filamento = {
      ...filamento,
      qualidade: (data.qualidade as FilamentoQualidade) ?? filamento.qualidade,
      observacao: data.observacao ?? filamento.observacao ?? filamento.comentario,
      comentario: data.observacao ?? filamento.observacao ?? filamento.comentario,
      dataFim: data.dataFim ?? new Date().toISOString().slice(0, 10),
    };

    const historyRepo = await filamentosHistoryRepo();
    await historyRepo.archive(updatedFilamento);
    return { ok: true as const };
  });

export const updateFilamentoQualidade = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      qualidade: filamentoQualidadeSchema.optional(),
      observacao: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await filamentosRepo();
    const filamento = repo.list.find((item) => item.id === data.id);
    if (!filamento) return { ok: false as const, reason: "not_found" as const };

    const updated: Filamento = {
      ...filamento,
      qualidade: data.qualidade !== undefined ? (data.qualidade as FilamentoQualidade) : filamento.qualidade,
      observacao: data.observacao !== undefined ? data.observacao : filamento.observacao ?? filamento.comentario,
      comentario: data.observacao !== undefined ? data.observacao : filamento.observacao ?? filamento.comentario,
    };

    await repo.save(repo.list.map((item) => (item.id === data.id ? updated : item)));
    return { ok: true as const };
  });

export const updateFilamentoPeso = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      pesoAtual: z.number().min(0).max(50000),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await filamentosRepo();
    const filamento = repo.list.find((item) => item.id === data.id);
    if (!filamento) return { ok: false as const, reason: "not_found" as const };

    const updated: Filamento = { ...filamento, pesoAtual: data.pesoAtual };
    await repo.save(repo.list.map((item) => (item.id === filamento.id ? updated : item)));
    return { ok: true as const };
  });
