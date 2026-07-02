import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { calcOrderCostHybrid, estimateOrderMaterialGrams } from "../../domain/cost";
import { isValidOrderProjectReference } from "../../domain/order-asset";
import { computeOrderTotalsFromParts, normalizeOrderParts } from "../../domain/order-parts";
import { clampGrams } from "../../domain/inventory";
import { getOrderTrackingSummary, matchesOrderTrackingCode } from "../../domain/order-tracking";
import type { Expense, Order, OrderDestino, OrderPart, Status, Venda } from "../../domain/types";
import { nowIso } from "../../server/db.server";
import { createOrderAssetSignedUrl, uploadOrderAssetToStorage } from "../../server/order-assets.server";
import { notifyOrderStatusChange } from "../../server/order-notifications.server";
import {
  clientsRepo,
  expensesRepo,
  filamentosRepo,
  inventoryRepo,
  orderPartsRepo,
  ordersRepo,
  portfolioRepo,
  vendasRepo,
} from "../../server/repositories.server";`nimport { requireSession } from "../../server/require-session.server";
import { normalizePhone } from "../../utils/normalization";
import {
  allowedStatusTransition,
  assertExplicitClientIdExists,
  computeOrderReservedGrams,
  resolveClientId,
} from "./shared";

const orderPartInputSchema = z.object({
  nome: z.string().trim().min(1).max(140),
  quantity: z.number().int().min(1).max(999),
  timeMinutes: z.number().min(0.1).max(100000),
  gramsPerUnit: z.number().min(0.01).max(50000),
  linkProjeto: z.string().trim().max(500).optional().refine(isValidOrderProjectReference, {
    message: "Referencia da parte invalida.",
  }),
  notes: z.string().trim().max(500).optional(),
});

export const addOrder = createServerFn({ method: "POST" })
  .validator(
    z.object({
      client: z.string().trim().min(1).max(120),
      projectName: z.string().trim().min(1).max(140),
      quantity: z.number().int().min(1).max(100000),
      timeMinutes: z.number().min(1).max(100000),
      filamentoId: z.string().min(1).optional(),
      gramsPerUnit: z.number().min(0.1).max(100000).optional(),
      linkProjeto: z.string().trim().max(500).optional().refine(isValidOrderProjectReference, {
        message: "Referencia do projeto invalida.",
      }),
      multiPart: z.boolean().optional(),
      precoVenda: z.number().min(0).max(1000000).optional(),
      formaPagamento: z.string().trim().max(100).optional(),
      dataPagamento: z.string().max(30).optional(),
      clientId: z.string().min(1).optional(),
      parts: z.array(orderPartInputSchema).max(50).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const [repo, clientsData, partsRepo] = await Promise.all([ordersRepo(), clientsRepo(), orderPartsRepo()]);
    assertExplicitClientIdExists(clientsData.list, data.clientId);
    const now = nowIso();
    const orderId = randomUUID();
    const normalizedParts: OrderPart[] = normalizeOrderParts(
      (data.parts ?? []).map((part, index) => ({
        id: randomUUID(),
        orderId,
        nome: part.nome,
        position: index,
        quantity: part.quantity,
        timeMinutes: part.timeMinutes,
        gramsPerUnit: part.gramsPerUnit,
        status: "todo",
        linkProjeto: part.linkProjeto ?? null,
        notes: part.notes ?? null,
        createdAt: now,
        updatedAt: now,
      })),
    );
    const aggregated = normalizedParts.length > 0 ? computeOrderTotalsFromParts(normalizedParts) : null;
    const order: Order = {
      id: orderId,
      status: "todo",
      createdAt: now,
      updatedAt: now,
      client: data.client,
      projectName: data.projectName,
      quantity: data.quantity,
      timeMinutes: aggregated?.timeMinutes ?? data.timeMinutes,
      filamentoId: data.filamentoId,
      gramsPerUnit: aggregated?.gramsPerUnit ?? data.gramsPerUnit,
      linkProjeto: data.linkProjeto ?? null,
      multiPart: normalizedParts.length > 0 ? true : (data.multiPart ?? false),
      precoVenda: data.precoVenda ?? null,
      formaPagamento: data.formaPagamento ?? null,
      dataPagamento: data.dataPagamento ?? null,
      clientId: resolveClientId(clientsData.list, data.client, data.clientId),
      parts: normalizedParts,
    };
    await repo.save([order, ...repo.list]);
    if (normalizedParts.length > 0) {
      await partsRepo.saveForOrder(orderId, normalizedParts);
    }
    return { ok: true };
  });

export const removeOrder = createServerFn({ method: "POST" })
  .validator(z.object({ orderId: z.string().min(1), reason: z.string().trim().min(1, "Informe o motivo").max(500) }))
  .handler(async ({ data }) => {
    const repo = await ordersRepo();
    const order = repo.list.find((item) => item.id === data.orderId);

    if (order && order.status === "printing") {
      const filamentId = order.filamentoId ?? null;
      if (filamentId) {
        const [portfolio, inv] = await Promise.all([portfolioRepo(), inventoryRepo()]);
        const project = order.portfolioProjectId
          ? portfolio.list.find((item) => item.id === order.portfolioProjectId)
          : undefined;
        const gramsTotal = estimateOrderMaterialGrams(order, project);
        if (gramsTotal) {
          const grams = clampGrams(gramsTotal);
          const reserved = computeOrderReservedGrams(inv.list, order.id, filamentId);
          const toRelease = Math.min(reserved, grams);
          if (toRelease > 0) {
            await inv.append({ orderId: order.id, filamentId, type: "release", grams: toRelease });
          }
        }
      }
    }

    await repo.save(repo.list.filter((item) => item.id !== data.orderId));
    return { ok: true };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .validator(z.object({ orderId: z.string().min(1), status: z.enum(["todo", "printing", "done"]) }))
  .handler(async ({ data }) => {
    const [orders, filamentos, portfolio, inv] = await Promise.all([
      ordersRepo(),
      filamentosRepo(),
      portfolioRepo(),
      inventoryRepo(),
    ]);
    const order = orders.list.find((item) => item.id === data.orderId);
    if (!order) return { ok: false as const, reason: "not_found" as const };
    if (!allowedStatusTransition(order.status, data.status)) {
      return { ok: false as const, reason: "invalid_transition" as const };
    }

    const now = nowIso();
    const nextOrder: Order = { ...order, status: data.status, updatedAt: now };
    const project = order.portfolioProjectId ? portfolio.list.find((item) => item.id === order.portfolioProjectId) : undefined;
    const gramsTotal = estimateOrderMaterialGrams(order, project);
    const filamentId = order.filamentoId ?? project?.filamentoId ?? null;

    if (filamentId && gramsTotal) {
      const grams = clampGrams(gramsTotal);
      const currentReserved = computeOrderReservedGrams(inv.list, order.id, filamentId);

      if (order.status === "todo" && data.status === "printing") {
        await inv.append({ orderId: order.id, filamentId, type: "reserve", grams });
      }

      if (order.status === "printing" && data.status === "todo") {
        const toRelease = Math.min(currentReserved, grams);
        if (toRelease > 0) {
          await inv.append({ orderId: order.id, filamentId, type: "release", grams: toRelease });
        }
      }

      if (order.status === "printing" && data.status === "done") {
        const toConsume = Math.min(currentReserved, grams);
        if (toConsume > 0) {
          const filamento = filamentos.list.find((item) => item.id === filamentId);
          if (filamento) {
            const updatedFilamentos = filamentos.list.map((item) =>
              item.id === filamento.id ? { ...item, pesoAtual: Math.max(0, item.pesoAtual - toConsume) } : item,
            );
            await filamentos.save(updatedFilamentos);
          }
          await inv.append({ orderId: order.id, filamentId, type: "consume", grams: toConsume });
        }
      }
    }

    await orders.save(orders.list.map((item) => (item.id === order.id ? nextOrder : item)));
    await notifyOrderStatusChange({
      order: nextOrder,
      previousStatus: order.status,
      nextStatus: data.status,
    });
    return { ok: true as const };
  });

export const finalizarDestino = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orderId: z.string().min(1),
      destino: z.enum(["Kurtido e Vendido", "Dado de Presente", "Falha de Impressão"]),
      valorRecebido: z.number().min(0).optional(),
      formaPagamento: z.string().trim().max(100).optional(),
      dataPagamento: z.string().max(30).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const destino = data.destino as OrderDestino;
    const [orders, vendas, portfolio, filamentos, expenses] = await Promise.all([
      ordersRepo(),
      vendasRepo(),
      portfolioRepo(),
      filamentosRepo(),
      expensesRepo(),
    ]);
    const order = orders.list.find((item) => item.id === data.orderId);
    if (!order) return { ok: false as const, reason: "not_found" as const };
    if (order.status !== "done") return { ok: false as const, reason: "invalid_state" as const };

    const statusMap: Record<OrderDestino, Status> = {
      "Kurtido e Vendido": "vendido",
      "Dado de Presente": "presente",
      "Falha de Impressão": "falha",
    };

    const now = nowIso();
    const updatedOrder: Order = {
      ...order,
      destino,
      valorRecebido: data.valorRecebido,
      formaPagamento: data.formaPagamento ?? order.formaPagamento ?? null,
      dataPagamento: data.dataPagamento ?? order.dataPagamento ?? null,
      status: statusMap[destino],
      updatedAt: now,
    };
    await orders.save(orders.list.map((item) => (item.id === order.id ? updatedOrder : item)));
    await notifyOrderStatusChange({
      order: updatedOrder,
      previousStatus: order.status,
      nextStatus: updatedOrder.status,
    });

    if (destino === "Kurtido e Vendido" && typeof data.valorRecebido === "number" && data.valorRecebido > 0) {
      const project = order.portfolioProjectId ? portfolio.list.find((item) => item.id === order.portfolioProjectId) : undefined;
      const filamentoId = order.filamentoId ?? project?.filamentoId ?? null;
      const filamento = filamentoId ? filamentos.list.find((item) => item.id === filamentoId) : undefined;
      const precoVendaUnit = data.valorRecebido / Math.max(1, order.quantity);
      const cost = calcOrderCostHybrid({ order, portfolio: project, filamento, precoVendaUnit });
      const venda: Venda = {
        id: randomUUID(),
        orderId: order.id,
        projectName: order.projectName,
        client: order.client,
        valor: data.valorRecebido,
        custo: cost.total,
        depreciacao: cost.depreciacao,
        data: now,
      };
      await vendas.save([venda, ...vendas.list]);
    }

    if (destino === "Falha de Impressão") {
      const project = order.portfolioProjectId ? portfolio.list.find((item) => item.id === order.portfolioProjectId) : undefined;
      const filamentoId = order.filamentoId ?? project?.filamentoId ?? null;
      const filamento = filamentoId ? filamentos.list.find((item) => item.id === filamentoId) : undefined;
      const custoFilamento = project && filamento
        ? (filamento.precoPago / filamento.pesoInicial) * (order.gramsPerUnit ?? project.pesoPeca) * order.quantity
        : 0;
      if (custoFilamento > 0) {
        const expense: Expense = {
          id: randomUUID(),
          source: "falha",
          refId: order.id,
          valor: custoFilamento,
          data: now,
          descricao: `Falha: ${order.projectName} (${order.quantity}x)`,
          categoria: "Perda de Material",
        };
        await expenses.save([expense, ...expenses.list]);
      }
    }

    return { ok: true as const };
  });

export const getPublicOrderTracking = createServerFn({ method: "POST" })
  .validator(
    z.object({
      code: z.string().trim().min(6).max(20),
      phone: z.string().trim().min(8).max(30),
    }),
  )
  .handler(async ({ data }) => {
    const [orders, clientsData] = await Promise.all([ordersRepo(), clientsRepo()]);
    const order = orders.list.find((item) => matchesOrderTrackingCode(item.id, data.code));
    if (!order) {
      return { ok: false as const, reason: "not_found" as const };
    }
    if (!phoneMatchesClient(order, clientsData.list, data.phone)) {
      return { ok: false as const, reason: "not_found" as const };
    }

    const tracking = getOrderTrackingSummary(order);

    return {
      ok: true as const,
      order: {
        trackingCode: tracking.trackingCode,
        projectName: order.projectName,
        quantity: order.quantity,
        status: order.status,
        statusLabel: tracking.statusLabel,
        statusDescription: tracking.statusDescription,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        estimatedDeliveryAt: tracking.estimatedDeliveryAt,
        step: tracking.step,
        multiPart: order.multiPart ?? false,
      },
    };
  });

export const uploadOrderAsset = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fileName: z.string().trim().min(1).max(255),
      contentType: z.string().trim().max(120),
      dataBase64: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const reference = await uploadOrderAssetToStorage(data);
    return { ok: true as const, reference };
  });

export const resolveOrderAssetUrl = createServerFn({ method: "POST" })
  .validator(z.object({ reference: z.string().trim().min(1).max(1000) }))
  .handler(async ({ data }) => {
    const url = await createOrderAssetSignedUrl(data.reference);
    return { ok: true as const, url };
  });

function phoneMatchesClient(order: Order, clients: Awaited<ReturnType<typeof clientsRepo>>["list"], phone: string) {
  const normalizedInput = normalizePhone(phone);
  if (!normalizedInput) return false;
  const client = order.clientId ? clients.find((item) => item.id === order.clientId) : null;
  const normalizedStored = normalizePhone(client?.whatsapp);
  if (!normalizedStored || normalizedInput.length < 8) return false;
  return normalizedStored === normalizedInput
    || normalizedStored.endsWith(normalizedInput)
    || normalizedInput.endsWith(normalizedStored);
}

export const updateOrder = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orderId: z.string().min(1),
      client: z.string().trim().max(200),
      projectName: z.string().trim().min(1).max(200),
      quantity: z.number().int().min(1).max(9999),
      timeMinutes: z.number().min(0.1).max(100000),
      filamentoId: z.string().min(1).nullable(),
      gramsPerUnit: z.number().min(0.01).max(50000).nullable(),
      precoVenda: z.number().min(0).max(1000000).nullable(),
      linkProjeto: z.string().max(2000).nullable().refine(isValidOrderProjectReference, {
        message: "Referencia do projeto invalida.",
      }),
      multiPart: z.boolean().nullable(),
      formaPagamento: z.string().max(100).nullable(),
      dataPagamento: z.string().max(30).nullable(),
      clientId: z.string().min(1).nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const [orders, clientsData, partsRepo] = await Promise.all([ordersRepo(), clientsRepo(), orderPartsRepo()]);
    const order = orders.list.find((item) => item.id === data.orderId);
    if (!order) return { ok: false as const, reason: "not_found" as const };
    if (order.status === "vendido" || order.status === "presente" || order.status === "falha") {
      return { ok: false as const, reason: "terminal_state" as const };
    }
    assertExplicitClientIdExists(clientsData.list, data.clientId);

    const existingParts = partsRepo.list.filter((part) => part.orderId === order.id);
    const aggregated = existingParts.length > 0 ? computeOrderTotalsFromParts(existingParts) : null;

    const updated: Order = {
      ...order,
      client: data.client,
      projectName: data.projectName,
      quantity: data.quantity,
      timeMinutes: aggregated?.timeMinutes ?? data.timeMinutes,
      filamentoId: data.filamentoId ?? undefined,
      gramsPerUnit: aggregated?.gramsPerUnit ?? (data.gramsPerUnit ?? undefined),
      precoVenda: data.precoVenda ?? null,
      linkProjeto: data.linkProjeto ?? null,
      multiPart: existingParts.length > 0 ? true : (data.multiPart ?? order.multiPart ?? false),
      formaPagamento: data.formaPagamento ?? null,
      dataPagamento: data.dataPagamento ?? null,
      clientId: resolveClientId(clientsData.list, data.client, data.clientId),
      updatedAt: nowIso(),
    };
    await orders.save(orders.list.map((item) => (item.id === order.id ? updated : item)));
    return { ok: true as const };
  });

export const updateOrderPartStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orderId: z.string().min(1),
      partId: z.string().min(1),
      status: z.enum(["todo", "printing", "done", "falha"]),
    }),
  )
  .handler(async ({ data }) => {
    const [orders, partsRepo] = await Promise.all([ordersRepo(), orderPartsRepo()]);
    const order = orders.list.find((item) => item.id === data.orderId);
    if (!order) return { ok: false as const, reason: "not_found" as const };
    const part = partsRepo.list.find((item) => item.id === data.partId && item.orderId === data.orderId);
    if (!part) return { ok: false as const, reason: "part_not_found" as const };

    const now = nowIso();
    const nextParts = partsRepo.list
      .filter((item) => item.orderId === data.orderId)
      .map((item) => (item.id === data.partId ? { ...item, status: data.status, updatedAt: now } : item));

    await partsRepo.saveForOrder(data.orderId, nextParts);
    await orders.save(orders.list.map((item) => (item.id === order.id ? { ...item, updatedAt: now } : item)));
    return { ok: true as const };
  });
