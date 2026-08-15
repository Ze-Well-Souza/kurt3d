import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Filamento, FilamentoQualidade } from "../../domain/types";
import { computeReservedByFilament } from "../../domain/inventory";
import {
  filamentoInstallmentsRepo,
  filamentoPaymentsRepo,
  filamentosHistoryRepo,
  filamentosRepo,
  inventoryRepo,
  ordersRepo,
} from "../../server/repositories.server";
import { requireSession } from "../../server/require-session.server";
import { checkMutationRateLimit } from "../../server/mutation-guard.server";
import { buildFilamentoLabel } from "./shared";

export const listFilamentos = createServerFn({ method: "GET" }).handler(async () => {
  await requireSession();
  const [filamentos, inv, history] = await Promise.all([
    filamentosRepo(),
    inventoryRepo(),
    filamentosHistoryRepo(),
  ]);

  const reservedMap = computeReservedByFilament(inv.list);

  return {
    filamentos: filamentos.list.map((filamento) => ({
      ...filamento,
      reservedGrams: reservedMap[filamento.id] ?? 0,
      disponivelGrams: Math.max(0, filamento.pesoAtual - (reservedMap[filamento.id] ?? 0)),
      label: buildFilamentoLabel(filamento),
    })),
    filamentosHistory: history.list,
  };
});

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
      const inHistory = history.list.find(
        (filamento) => filamento.sku.trim().toLowerCase() === skuNorm,
      );
      if (inHistory) {
        throw new Error(`SKU "${data.sku}" já foi utilizado em um filamento arquivado.`);
      }
    }
    const nextPesoAtual =
      data.pesoAtual !== undefined
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
      dataEntrega:
        data.dataEntrega !== undefined ? data.dataEntrega : (existing?.dataEntrega ?? null),
      dataFim: existing?.dataFim ?? null,
      qualidade: data.qualidade !== undefined ? data.qualidade : (existing?.qualidade ?? null),
      observacao:
        data.observacao !== undefined
          ? data.observacao
          : (existing?.observacao ?? existing?.comentario ?? null),
      comentario: data.observacao !== undefined ? data.observacao : (existing?.comentario ?? null),
      linkProduto:
        data.linkProduto !== undefined ? data.linkProduto : (existing?.linkProduto ?? null),
      batchId: data.batchId ?? existing?.batchId ?? null,
      paymentId: data.paymentId ?? existing?.paymentId ?? null,
    };
    if (existing) await repo.update(filamento);
    else await repo.insert(filamento);
    return { ok: true, filamento };
  });

export const removeFilamento = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const [repo, inv, orders, history, payments, installments] = await Promise.all([
      filamentosRepo(),
      inventoryRepo(),
      ordersRepo(),
      filamentosHistoryRepo(),
      filamentoPaymentsRepo(),
      filamentoInstallmentsRepo(),
    ]);

    const alvo = repo.list.find((filamento) => filamento.id === data.id);

    // P1-9: nao ha FK de orders.filamento_id para filamentos, entao apagar um
    // rolo em uso deixava o pedido apontando para uma linha inexistente — e a
    // reserva de estoque orfa. Recusa com uma mensagem que diz o que fazer.
    const reservado = computeReservedByFilament(inv.list)[data.id] ?? 0;
    if (reservado > 0) {
      throw new Error(
        `Este rolo tem ${reservado.toFixed(0)}g reservados por pedidos em producao. ` +
          `Finalize ou cancele esses pedidos antes de remover.`,
      );
    }

    const pedidosVinculados = orders.list.filter(
      (order) =>
        order.filamentoId === data.id &&
        order.status !== "vendido" &&
        order.status !== "presente" &&
        order.status !== "falha",
    );
    if (pedidosVinculados.length > 0) {
      throw new Error(
        `Este rolo esta vinculado a ${pedidosVinculados.length} pedido(s) em aberto. ` +
          `Troque o filamento desses pedidos ou finalize-os antes de remover. ` +
          `Para tirar o rolo do estoque sem perder o historico, use Arquivar.`,
      );
    }

    await repo.remove(data.id);

    // Deduz do financeiro: se o rolo removido era o unico vinculado ao plano de
    // pagamento e nenhuma parcela foi paga, remove o plano e as parcelas. Se outro
    // rolo compartilhar o lote ou houver historico de pagamento, o plano e mantido
    // para nao apagar registro financeiro ja quitado.
    const paymentId = alvo?.paymentId;
    if (paymentId) {
      const aindaReferenciado =
        repo.list.some((f) => f.id !== data.id && f.paymentId === paymentId) ||
        history.list.some((f) => f.paymentId === paymentId);
      const temParcelaPaga = installments.list.some(
        (i) => i.paymentId === paymentId && ((i.valorPago ?? 0) > 0 || i.pago),
      );
      if (!aindaReferenciado && !temParcelaPaga) {
        await installments.deleteByPayment(paymentId);
        await payments.detach(paymentId);
        await payments.remove(paymentId);
      }
    }

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
      qualidade:
        data.qualidade !== undefined ? (data.qualidade as FilamentoQualidade) : filamento.qualidade,
      observacao:
        data.observacao !== undefined
          ? data.observacao
          : (filamento.observacao ?? filamento.comentario),
      comentario:
        data.observacao !== undefined
          ? data.observacao
          : (filamento.observacao ?? filamento.comentario),
    };

    await repo.update(updated);
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
    await repo.update(updated);
    return { ok: true as const };
  });

export const updateArchivedFilamento = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      sku: z.string().trim().min(1).max(50),
      marca: z.string().trim().min(1).max(100),
      cor: z.string().trim().min(1).max(100),
      material: z.string().trim().min(1).max(20),
      pesoInicial: z.number().min(1).max(100000),
      pesoAtual: z.number().min(0).max(100000).optional(),
      precoPago: z.number().min(0.01).max(100000),
      dataCompra: z.string().min(1).max(30),
      dataEntrega: z.string().min(1).max(30).nullable().optional(),
      dataFim: z.string().min(1).max(30).nullable().optional(),
      qualidade: filamentoQualidadeSchema.nullable().optional(),
      observacao: z.string().max(500).nullable().optional(),
      linkProduto: z.string().url().max(500).nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const historyRepo = await filamentosHistoryRepo();
    const existing = historyRepo.list.find((item) => item.id === data.id);
    if (!existing) return { ok: false as const, reason: "not_found" as const };

    const skuNorm = data.sku.trim().toLowerCase();
    const activeRepo = await filamentosRepo();
    const duplicateActive = activeRepo.list.find(
      (filamento) => filamento.sku.trim().toLowerCase() === skuNorm,
    );
    if (duplicateActive) {
      throw new Error(`SKU "${data.sku}" já está cadastrado em um filamento ativo.`);
    }
    const duplicateArchived = historyRepo.list.find(
      (item) => item.sku.trim().toLowerCase() === skuNorm && item.id !== data.id,
    );
    if (duplicateArchived) {
      throw new Error(`SKU "${data.sku}" já está em uso por outro filamento arquivado.`);
    }

    const nextPesoInicial = data.pesoInicial;
    const nextPesoAtual =
      data.pesoAtual !== undefined
        ? Math.min(data.pesoAtual, nextPesoInicial)
        : Math.min(existing.pesoAtual, nextPesoInicial);
    const updated = {
      ...existing,
      sku: data.sku,
      marca: data.marca,
      cor: data.cor,
      material: data.material,
      pesoInicial: nextPesoInicial,
      pesoAtual: nextPesoAtual,
      precoPago: data.precoPago,
      dataCompra: data.dataCompra,
      dataEntrega: data.dataEntrega !== undefined ? data.dataEntrega : existing.dataEntrega,
      dataFim: data.dataFim !== undefined ? data.dataFim : existing.dataFim,
      qualidade:
        data.qualidade !== undefined ? (data.qualidade as FilamentoQualidade) : existing.qualidade,
      observacao:
        data.observacao !== undefined
          ? data.observacao
          : (existing.observacao ?? existing.comentario),
      comentario:
        data.observacao !== undefined
          ? data.observacao
          : (existing.observacao ?? existing.comentario),
      linkProduto: data.linkProduto !== undefined ? data.linkProduto : existing.linkProduto,
    };
    await historyRepo.update(updated);
    return { ok: true as const, filamento: updated };
  });

export const restoreFilamento = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const historyRepo = await filamentosHistoryRepo();
    const archived = historyRepo.list.find((item) => item.id === data.id);
    if (!archived) return { ok: false as const, reason: "not_found" as const };

    const activeRepo = await filamentosRepo();
    const skuNorm = archived.sku.trim().toLowerCase();
    const duplicateActive = activeRepo.list.find(
      (filamento) => filamento.sku.trim().toLowerCase() === skuNorm,
    );
    if (duplicateActive) {
      throw new Error(
        `Não é possível reativar: o SKU "${archived.sku}" já está em uso por um filamento ativo.`,
      );
    }

    // Mantem o peso arquivado (editavel depois) e os vinculos de lote/pagamento.
    const restored: Filamento = {
      id: archived.id,
      sku: archived.sku,
      marca: archived.marca,
      cor: archived.cor,
      material: archived.material,
      pesoInicial: archived.pesoInicial,
      pesoAtual: archived.pesoAtual,
      precoPago: archived.precoPago,
      dataCompra: archived.dataCompra,
      dataEntrega: archived.dataEntrega,
      dataFim: archived.dataFim ?? null,
      qualidade: archived.qualidade,
      observacao: archived.observacao ?? archived.comentario,
      comentario: archived.comentario,
      linkProduto: archived.linkProduto,
      batchId: archived.batchId,
      paymentId: archived.paymentId,
    };
    // Mesma ordem deliberada de archive(): grava no destino antes de remover da
    // origem, para que uma falha no meio deixe duplicata visivel em vez de
    // sumir com o rolo das duas tabelas.
    await activeRepo.insert(restored);
    await historyRepo.remove(data.id);
    return { ok: true as const, filamento: restored };
  });
