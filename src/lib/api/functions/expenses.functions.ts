import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Expense } from "../../domain/types";
import { expensesRepo } from "../../server/repositories.server";

export const addManualExpense = createServerFn({ method: "POST" })
  .validator(
    z.object({
      descricao: z.string().trim().min(1, "Descrição obrigatória").max(300),
      valor: z.number().min(0.01),
      data: z.string().max(30),
      categoria: z.string().trim().max(100).nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const repo = await expensesRepo();
    const expense: Expense = {
      id: randomUUID(),
      source: "manual",
      refId: randomUUID(),
      valor: data.valor,
      data: data.data,
      descricao: data.descricao,
      categoria: data.categoria ?? null,
    };
    await repo.save([expense, ...repo.list]);
    return { ok: true };
  });

export const removeExpense = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const repo = await expensesRepo();
    await repo.save(repo.list.filter((expense) => expense.id !== data.id));
    return { ok: true };
  });
