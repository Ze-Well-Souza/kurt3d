import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { addCalendarMonthsIso } from "../../domain/installments";
import type { Expense, FormaPagamento, Insumo, InsumoClassificacaoFinanceira, InsumoPayment, InsumoPaymentInstallment } from "../../domain/types";
import { nowIso } from "../../server/db.server";
import { expensesRepo, insumoInstallmentsRepo, insumoPaymentsRepo, insumosRepo } from "../../server/repositories.server";
import { requireSession } from "../../server/require-session.server";
import { checkMutationRateLimit } from "../../server/mutation-guard.server";

const paymentFields = {
  formaPagamento: z.enum(["a_vista", "parcelado"]).optional(),
  parcelas: z.number().int().min(1).max(48).optional(),
  dataParaPagamento: z.string().min(1).max(30).optional(),
};

function buildInsumoExpenseCategory(classificacaoFinanceira: InsumoClassificacaoFinanceira): string {
  return classificacaoFinanceira === "investimento" ? "Investimento / Imobilizado" : "Despesa Operacional";
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

async function createOrUpdateInsumoPayment(input: {
  insumoId: string;
  paymentId?: string | null;
  formaPagamento?: FormaPagamento;
  custoTotal: number;
  parcelas?: number;
  dataParaPagamento?: string;
}) {
  if (!input.formaPagamento || !input.dataParaPagamento) {
    return { paymentId: input.paymentId ?? null };
  }

  const paymentsRepo = await insumoPaymentsRepo();
  const installmentsRepo = await insumoInstallmentsRepo();
  const parcelas = input.formaPagamento === "parcelado" ? Math.max(1, input.parcelas ?? 1) : 1;

  if (!input.paymentId) {
    const paymentId = randomUUID();
    const payment: InsumoPayment = {
      id: paymentId,
      insumoId: input.insumoId,
      formaPagamento: input.formaPagamento,
      custoTotal: input.custoTotal,
      parcelas,
      dataParaPagamento: input.dataParaPagamento,
      createdAt: nowIso(),
    };
    await paymentsRepo.insert(payment);

    const perParcel = Math.round((input.custoTotal / parcelas) * 100) / 100;
    const lastParcelDiff = +(input.custoTotal - perParcel * parcelas).toFixed(2);
    const items: InsumoPaymentInstallment[] = [];
    for (let i = 0; i < parcelas; i++) {
      const valor = i === parcelas - 1 ? Math.round((perParcel + lastParcelDiff) * 100) / 100 : perParcel;
      items.push({
        id: randomUUID(),
        paymentId,
        numero: i + 1,
        valor,
        vencimento: addCalendarMonthsIso(input.dataParaPagamento, i),
        pago: false,
        dataPagamento: null,
        valorPago: null,
        observacao: null,
      });
    }
    await installmentsRepo.insertMany(items);
    await paymentsRepo.attachToInsumo(input.insumoId, paymentId);
    return { paymentId };
  }

  const existing = paymentsRepo.list.find((payment) => payment.id === input.paymentId);
  if (!existing) {
    throw new Error("Plano de pagamento do insumo não encontrado.");
  }

  const updated: InsumoPayment = {
    ...existing,
    formaPagamento: input.formaPagamento,
    custoTotal: input.custoTotal,
    parcelas,
    dataParaPagamento: input.dataParaPagamento,
  };
  await paymentsRepo.update(updated);

  const existingInstallments = installmentsRepo.list.filter((installment) => installment.paymentId === input.paymentId);
  const progressed = existingInstallments.filter(
    (installment) => installment.paymentId === input.paymentId && ((installment.valorPago ?? 0) > 0 || installment.pago),
  );

  const perParcel = Math.round((input.custoTotal / parcelas) * 100) / 100;
  const lastParcelDiff = +(input.custoTotal - perParcel * parcelas).toFixed(2);
  const newItems: InsumoPaymentInstallment[] = [];
  for (let i = 0; i < parcelas; i++) {
    const numero = i + 1;
    const valor = i === parcelas - 1 ? Math.round((perParcel + lastParcelDiff) * 100) / 100 : perParcel;
    const existingProgressed = progressed.find((installment) => installment.numero === numero);
    if (existingProgressed) {
      const paidAmount = Math.min(roundMoney(existingProgressed.valorPago ?? 0), valor);
      newItems.push({
        ...existingProgressed,
        valor,
        vencimento: addCalendarMonthsIso(input.dataParaPagamento, i),
        pago: paidAmount >= valor,
        valorPago: paidAmount > 0 ? paidAmount : null,
        dataPagamento: paidAmount > 0 ? existingProgressed.dataPagamento : null,
      });
      continue;
    }
    newItems.push({
      id: randomUUID(),
      paymentId: input.paymentId,
      numero,
      valor,
      vencimento: addCalendarMonthsIso(input.dataParaPagamento, i),
      pago: false,
      dataPagamento: null,
      valorPago: null,
      observacao: null,
    });
  }
  const existingById = new Map(existingInstallments.map((installment) => [installment.id, installment]));
  const itemsToUpdate = newItems.filter((item) => existingById.has(item.id));
  const itemsToInsert = newItems.filter((item) => !existingById.has(item.id));
  const nextIds = new Set(newItems.map((item) => item.id));
  const progressedToRemove = existingInstallments.filter(
    (item) => !nextIds.has(item.id) && (item.valorPago ?? 0) > 0,
  );
  if (progressedToRemove.length > 0) {
    throw new Error("Nao e possivel reduzir parcelas que ja possuem historico de pagamento.");
  }
  const idsToRemove = existingInstallments
    .filter((item) => !nextIds.has(item.id) && (item.valorPago ?? 0) === 0)
    .map((item) => item.id);

  for (const item of itemsToUpdate) {
    await installmentsRepo.update(item);
  }
  await installmentsRepo.insertMany(itemsToInsert);
  await installmentsRepo.removeMany(idsToRemove);
  return { paymentId: input.paymentId };
}

export const addInsumo = createServerFn({ method: "POST" })
  .validator(
    z.object({
      nome: z.string().trim().min(1).max(200),
      dataCompra: z.string().min(1).max(30),
      quantidade: z.string().trim().min(1).max(100),
      precoTotal: z.number().min(0.01).max(1000000),
      linkProduto: z.string().url().max(500).nullable().optional(),
      classificacaoFinanceira: z.enum(["operacional", "investimento"]).default("operacional"),
      ...paymentFields,
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await insumosRepo();
    const provisionalPaymentId = data.formaPagamento && data.dataParaPagamento ? randomUUID() : null;
    const insumo: Insumo = {
      id: randomUUID(),
      nome: data.nome,
      dataCompra: data.dataCompra,
      quantidade: data.quantidade,
      precoTotal: data.precoTotal,
      linkProduto: data.linkProduto ?? null,
      paymentId: provisionalPaymentId,
      classificacaoFinanceira: data.classificacaoFinanceira,
    };
    await repo.save([insumo, ...repo.list]);

    if (provisionalPaymentId) {
      const paymentsRepo = await insumoPaymentsRepo();
      const installmentsRepo = await insumoInstallmentsRepo();
      const parcelas = data.formaPagamento === "parcelado" ? Math.max(1, data.parcelas ?? 1) : 1;
      const payment: InsumoPayment = {
        id: provisionalPaymentId,
        insumoId: insumo.id,
        formaPagamento: data.formaPagamento!,
        custoTotal: data.precoTotal,
        parcelas,
        dataParaPagamento: data.dataParaPagamento ?? data.dataCompra,
        createdAt: nowIso(),
      };
      await paymentsRepo.insert(payment);

      const perParcel = Math.round((data.precoTotal / parcelas) * 100) / 100;
      const lastParcelDiff = +(data.precoTotal - perParcel * parcelas).toFixed(2);
      const items: InsumoPaymentInstallment[] = [];
      for (let i = 0; i < parcelas; i++) {
        const valor = i === parcelas - 1 ? Math.round((perParcel + lastParcelDiff) * 100) / 100 : perParcel;
        items.push({
          id: randomUUID(),
          paymentId: provisionalPaymentId,
          numero: i + 1,
          valor,
          vencimento: addCalendarMonthsIso(payment.dataParaPagamento ?? data.dataCompra, i),
          pago: false,
          dataPagamento: null,
          valorPago: null,
          observacao: null,
        });
      }
      await installmentsRepo.insertMany(items);
    }

    const expRepo = await expensesRepo();
    const expense: Expense = {
      id: randomUUID(),
      source: "insumo",
      refId: insumo.id,
      valor: insumo.precoTotal,
      data: insumo.dataCompra,
      descricao: `Compra de insumo: ${insumo.nome}`,
      categoria: buildInsumoExpenseCategory(insumo.classificacaoFinanceira),
    };
    await expRepo.save([expense, ...expRepo.list]);
    return { ok: true };
  });

export const removeInsumo = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await insumosRepo();
    const current = repo.list.find((insumo) => insumo.id === data.id) ?? null;
    await repo.save(repo.list.filter((insumo) => insumo.id !== data.id));
    const expRepo = await expensesRepo();
    await expRepo.save(expRepo.list.filter((expense) => !(expense.source === "insumo" && expense.refId === data.id)));
    if (current?.paymentId) {
      const [paymentsRepo, installmentsRepo] = await Promise.all([insumoPaymentsRepo(), insumoInstallmentsRepo()]);
      await installmentsRepo.deleteByPayment(current.paymentId);
      await paymentsRepo.detachFromInsumo(current.paymentId);
      await paymentsRepo.remove(current.paymentId);
    }
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
      classificacaoFinanceira: z.enum(["operacional", "investimento"]).default("operacional"),
      ...paymentFields,
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const [repo, expRepo] = await Promise.all([insumosRepo(), expensesRepo()]);
    const existing = repo.list.find((insumo) => insumo.id === data.id);
    if (!existing) return { ok: false as const, reason: "not_found" as const };

    const paymentResult = await createOrUpdateInsumoPayment({
      insumoId: data.id,
      paymentId: existing.paymentId ?? null,
      formaPagamento: data.formaPagamento,
      custoTotal: data.precoTotal,
      parcelas: data.parcelas,
      dataParaPagamento: data.dataParaPagamento,
    });

    const updated: Insumo = {
      ...existing,
      nome: data.nome,
      dataCompra: data.dataCompra,
      quantidade: data.quantidade,
      precoTotal: data.precoTotal,
      linkProduto: data.linkProduto ?? null,
      paymentId: paymentResult.paymentId,
      classificacaoFinanceira: data.classificacaoFinanceira,
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
      categoria: buildInsumoExpenseCategory(updated.classificacaoFinanceira),
    };

    const nextExpenses = linkedExpense
      ? expRepo.list.map((expense) => (expense.id === linkedExpense.id ? nextExpense : expense))
      : [nextExpense, ...expRepo.list];
    await expRepo.save(nextExpenses);

    return { ok: true as const };
  });
