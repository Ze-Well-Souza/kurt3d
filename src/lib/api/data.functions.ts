import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { calcOrderCostHybrid, estimateOrderMaterialGrams } from "../domain/cost";
import type { Expense, Filamento, FilamentoQualidade, Insumo, Order, OrderDestino, PortfolioProject, Status, Venda } from "../domain/types";
import { clampGrams, computeReservedByFilament } from "../domain/inventory";
import { nowIso } from "../server/db.server";
import { expensesRepo, filamentosHistoryRepo, filamentosRepo, insumosRepo, inventoryRepo, ordersRepo, portfolioRepo, vendasRepo } from "../server/repositories.server";

function buildFilamentoLabel(f: Filamento) {
  return `[${f.sku}] ${f.marca} ${f.cor}`;
}

function allowedStatusTransition(from: Status, to: Status) {
  const allowed: Record<Status, Status[]> = {
    todo: ["printing"],
    printing: ["todo", "done"],
    done: [],
    vendido: [],
    presente: [],
    falha: [],
  };
  return allowed[from].includes(to);
}

function computeOrderReservedGrams(txns: { orderId: string; filamentId: string; type: string; grams: number }[], orderId: string, filamentId: string) {
  let grams = 0;
  for (const t of txns) {
    if (t.orderId !== orderId) continue;
    if (t.filamentId !== filamentId) continue;
    if (t.type === "reserve") grams += t.grams;
    if (t.type === "release") grams -= t.grams;
    if (t.type === "consume") grams -= t.grams;
  }
  return Math.max(0, grams);
}

export const listSnapshot = createServerFn({ method: "GET" }).handler(async () => {
  const [orders, filamentos, filamentosHistory, portfolio, insumos, vendas, inv, expenses] = await Promise.all([
    ordersRepo(),
    filamentosRepo(),
    filamentosHistoryRepo(),
    portfolioRepo(),
    insumosRepo(),
    vendasRepo(),
    inventoryRepo(),
    expensesRepo(),
  ]);

  const reservedMap = computeReservedByFilament(inv.list);
  const filamentosView = filamentos.list.map((f) => ({
    ...f,
    reservedGrams: reservedMap[f.id] ?? 0,
    disponivelGrams: Math.max(0, f.pesoAtual - (reservedMap[f.id] ?? 0)),
    label: buildFilamentoLabel(f),
  }));

  return {
    orders: orders.list,
    filamentos: filamentosView,
    filamentosHistory: filamentosHistory.list,
    portfolio: portfolio.list,
    insumos: insumos.list,
    vendas: vendas.list,
    expenses: expenses.list,
  };
});

export const upsertFilamento = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1).optional(),
      sku: z.string().trim().min(1).max(50),
      marca: z.string().trim().min(1).max(100),
      cor: z.string().trim().min(1).max(100),
      material: z.string().trim().min(1).max(20),
      pesoInicial: z.number().min(1).max(100000),
      precoPago: z.number().min(0.01).max(100000),
      dataCompra: z.string().min(1).max(30),
      linkProduto: z.string().url().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const repo = await filamentosRepo();
    const id = data.id ?? randomUUID();
    const existing = repo.list.find((f) => f.id === id);
    const filamento: Filamento = {
      id,
      sku: data.sku,
      marca: data.marca,
      cor: data.cor,
      material: data.material,
      pesoInicial: data.pesoInicial,
      pesoAtual: existing ? existing.pesoAtual : data.pesoInicial,
      precoPago: data.precoPago,
      dataCompra: data.dataCompra,
      dataFim: existing?.dataFim ?? null,
      qualidade: existing?.qualidade ?? null,
      comentario: existing?.comentario ?? null,
      linkProduto: data.linkProduto ?? existing?.linkProduto ?? null,
    };
    const next = existing ? repo.list.map((f) => (f.id === id ? filamento : f)) : [...repo.list, filamento];
    await repo.save(next);
    return { ok: true };
  });

export const removeFilamento = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const repo = await filamentosRepo();
    await repo.save(repo.list.filter((f) => f.id !== data.id));
    return { ok: true };
  });

export const archiveFilamento = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      qualidade: z.enum(["bom", "medio", "ruim"]).optional(),
      comentario: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const repo = await filamentosRepo();
    const filamento = repo.list.find((f) => f.id === data.id);
    if (!filamento) return { ok: false as const, reason: "not_found" as const };

    const updatedFilamento: Filamento = {
      ...filamento,
      qualidade: (data.qualidade as FilamentoQualidade) ?? filamento.qualidade,
      comentario: data.comentario ?? filamento.comentario,
      dataFim: new Date().toISOString().slice(0, 10),
    };

    const historyRepo = await filamentosHistoryRepo();
    await historyRepo.archive(updatedFilamento);
    return { ok: true as const };
  });

export const updateFilamentoQualidade = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      qualidade: z.enum(["bom", "medio", "ruim"]).optional(),
      comentario: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const repo = await filamentosRepo();
    const filamento = repo.list.find((f) => f.id === data.id);
    if (!filamento) return { ok: false as const, reason: "not_found" as const };

    const updated: Filamento = {
      ...filamento,
      qualidade: data.qualidade !== undefined ? (data.qualidade as FilamentoQualidade) : filamento.qualidade,
      comentario: data.comentario !== undefined ? data.comentario : filamento.comentario,
    };

    await repo.save(repo.list.map((f) => (f.id === data.id ? updated : f)));
    return { ok: true as const };
  });

export const addInsumo = createServerFn({ method: "POST" })
  .validator(
    z.object({
      nome: z.string().trim().min(1).max(200),
      dataCompra: z.string().min(1).max(30),
      quantidade: z.string().trim().min(1).max(100),
      precoTotal: z.number().min(0.01).max(1000000),
      linkProduto: z.string().url().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const repo = await insumosRepo();
    const insumo: Insumo = {
      id: randomUUID(),
      nome: data.nome,
      dataCompra: data.dataCompra,
      quantidade: data.quantidade,
      precoTotal: data.precoTotal,
      linkProduto: data.linkProduto ?? null,
    };
    await repo.save([insumo, ...repo.list]);

    const expRepo = await expensesRepo();
    const expense: Expense = {
      id: randomUUID(),
      source: "insumo",
      refId: insumo.id,
      valor: insumo.precoTotal,
      data: insumo.dataCompra,
      descricao: `Compra de insumo: ${insumo.nome}`,
    };
    await expRepo.save([expense, ...expRepo.list]);
    return { ok: true };
  });

export const removeInsumo = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const repo = await insumosRepo();
    await repo.save(repo.list.filter((i) => i.id !== data.id));
    const expRepo = await expensesRepo();
    await expRepo.save(expRepo.list.filter((e) => !(e.source === "insumo" && e.refId === data.id)));
    return { ok: true };
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
    }),
  )
  .handler(async ({ data }) => {
    const repo = await portfolioRepo();
    const now = nowIso();
    const p: PortfolioProject = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...data,
    };
    await repo.save([p, ...repo.list]);
    return { ok: true };
  });

export const removePortfolioProject = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const repo = await portfolioRepo();
    await repo.save(repo.list.filter((p) => p.id !== data.id));
    return { ok: true };
  });

export const createOrderFromPortfolio = createServerFn({ method: "POST" })
  .validator(
    z.object({
      portfolioProjectId: z.string().min(1),
      client: z.string().trim().min(1).max(120),
      quantity: z.number().int().min(1).max(100000),
    }),
  )
  .handler(async ({ data }) => {
    const [orders, portfolio] = await Promise.all([ordersRepo(), portfolioRepo()]);
    const proj = portfolio.list.find((p) => p.id === data.portfolioProjectId);
    if (!proj) return { ok: false as const };
    const now = nowIso();
    const order: Order = {
      id: randomUUID(),
      client: data.client,
      projectName: proj.nome,
      quantity: data.quantity,
      timeMinutes: proj.tempoMin,
      status: "todo",
      createdAt: now,
      updatedAt: now,
      portfolioProjectId: proj.id,
      filamentoId: proj.filamentoId,
      gramsPerUnit: proj.pesoPeca,
    };
    await orders.save([order, ...orders.list]);
    return { ok: true as const };
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
    }),
  )
  .handler(async ({ data }) => {
    const repo = await ordersRepo();
    const now = nowIso();
    const order: Order = {
      id: randomUUID(),
      status: "todo",
      createdAt: now,
      updatedAt: now,
      ...data,
    };
    await repo.save([order, ...repo.list]);
    return { ok: true };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .validator(z.object({ orderId: z.string().min(1), status: z.enum(["todo", "printing", "done"]) }))
  .handler(async ({ data }) => {
    const [orders, filamentos, portfolio, inv] = await Promise.all([ordersRepo(), filamentosRepo(), portfolioRepo(), inventoryRepo()]);
    const order = orders.list.find((o) => o.id === data.orderId);
    if (!order) return { ok: false as const, reason: "not_found" as const };
    if (!allowedStatusTransition(order.status, data.status)) return { ok: false as const, reason: "invalid_transition" as const };

    const now = nowIso();
    const nextOrder: Order = { ...order, status: data.status, updatedAt: now };

    const proj = order.portfolioProjectId ? portfolio.list.find((p) => p.id === order.portfolioProjectId) : undefined;
    const gramsTotal = estimateOrderMaterialGrams(order, proj);
    const filamentId = order.filamentoId ?? proj?.filamentoId ?? null;

    if (filamentId && gramsTotal) {
      const grams = clampGrams(gramsTotal);
      const txns = inv.list;
      const currentReserved = computeOrderReservedGrams(txns, order.id, filamentId);

      if (order.status === "todo" && data.status === "printing") {
        await inv.append({ orderId: order.id, filamentId, type: "reserve", grams });
      }

      if (order.status === "printing" && data.status === "todo") {
        const toRelease = Math.min(currentReserved, grams);
        if (toRelease > 0) await inv.append({ orderId: order.id, filamentId, type: "release", grams: toRelease });
      }

      if (order.status === "printing" && data.status === "done") {
        const toConsume = Math.min(currentReserved, grams);
        if (toConsume > 0) {
          const f = filamentos.list.find((x) => x.id === filamentId);
          if (f) {
            const updatedFilamentos = filamentos.list.map((x) =>
              x.id === f.id ? { ...x, pesoAtual: Math.max(0, x.pesoAtual - toConsume) } : x,
            );
            await filamentos.save(updatedFilamentos);
          }
          await inv.append({ orderId: order.id, filamentId, type: "consume", grams: toConsume });
        }
      }
    }

    await orders.save(orders.list.map((o) => (o.id === order.id ? nextOrder : o)));
    return { ok: true as const };
  });

export const finalizarDestino = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orderId: z.string().min(1),
      destino: z.enum(["Kurtido e Vendido", "Dado de Presente", "Falha de Impressão"]),
      valorRecebido: z.number().min(0).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const destino = data.destino as OrderDestino;
    const [orders, vendas, portfolio, filamentos] = await Promise.all([ordersRepo(), vendasRepo(), portfolioRepo(), filamentosRepo()]);
    const order = orders.list.find((o) => o.id === data.orderId);
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
      status: statusMap[destino],
      updatedAt: now,
    };
    await orders.save(orders.list.map((o) => (o.id === order.id ? updatedOrder : o)));

    if (destino === "Kurtido e Vendido" && typeof data.valorRecebido === "number" && data.valorRecebido > 0) {
      const proj = order.portfolioProjectId ? portfolio.list.find((p) => p.id === order.portfolioProjectId) : undefined;
      const filamentoId = order.filamentoId ?? proj?.filamentoId ?? null;
      const filamento = filamentoId ? filamentos.list.find((f) => f.id === filamentoId) : undefined;
      const precoVendaUnit = data.valorRecebido / Math.max(1, order.quantity);
      const cost = calcOrderCostHybrid({ order, portfolio: proj, filamento, precoVendaUnit });
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

    return { ok: true as const };
  });

