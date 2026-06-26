import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Expense, Insumo } from "../../domain/types";
import { expensesRepo, insumosRepo } from "../../server/repositories.server";

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
      categoria: null,
    };
    await expRepo.save([expense, ...expRepo.list]);
    return { ok: true };
  });

export const removeInsumo = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const repo = await insumosRepo();
    await repo.save(repo.list.filter((insumo) => insumo.id !== data.id));
    const expRepo = await expensesRepo();
    await expRepo.save(expRepo.list.filter((expense) => !(expense.source === "insumo" && expense.refId === data.id)));
    return { ok: true };
  });

export const updateInsumo = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      nome: z.string().trim().min(1).max(200),
      dataCompra: z.string().min(1).max(30),
      quantidade: z.string().trim().min(1).max(100),
      precoTotal: z.number().min(0.01).max(1000000),
      linkProduto: z.string().url().max(500).nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const [repo, expRepo] = await Promise.all([insumosRepo(), expensesRepo()]);
    const existing = repo.list.find((insumo) => insumo.id === data.id);
    if (!existing) return { ok: false as const, reason: "not_found" as const };

    const updated: Insumo = {
      ...existing,
      nome: data.nome,
      dataCompra: data.dataCompra,
      quantidade: data.quantidade,
      precoTotal: data.precoTotal,
      linkProduto: data.linkProduto ?? null,
    };

    await repo.save(repo.list.map((insumo) => (insumo.id === data.id ? updated : insumo)));

    const linkedExpense = expRepo.list.find((expense) => expense.source === "insumo" && expense.refId === data.id);
    const nextExpense: Expense = {
      id: linkedExpense?.id ?? randomUUID(),
      source: "insumo",
      refId: data.id,
      valor: updated.precoTotal,
      data: updated.dataCompra,
      descricao: `Compra de insumo: ${updated.nome}`,
      categoria: linkedExpense?.categoria ?? null,
    };

    const nextExpenses = linkedExpense
      ? expRepo.list.map((expense) => (expense.id === linkedExpense.id ? nextExpense : expense))
      : [nextExpense, ...expRepo.list];
    await expRepo.save(nextExpenses);

    return { ok: true as const };
  });
