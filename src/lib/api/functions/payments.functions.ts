import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { addCalendarMonthsIso, todayIso } from "../../domain/installments";
import type {
  FilamentoPayment,
  FilamentoPaymentEvent,
  FilamentoPaymentInstallment,
  InsumoPayment,
  InsumoPaymentEvent,
  InsumoPaymentInstallment,
} from "../../domain/types";
import { nowIso } from "../../server/db.server";
import { checkMutationRateLimit } from "../../server/mutation-guard.server";
import { requireSession } from "../../server/require-session.server";
import {
  filamentoInstallmentsRepo,
  filamentoPaymentEventsRepo,
  filamentoPaymentsRepo,
  insumoInstallmentsRepo,
  insumoPaymentEventsRepo,
  insumoPaymentsRepo,
} from "../../server/repositories.server";

export const listFilamentoPayments = createServerFn({ method: "GET" }).handler(async () => {
  const [payments, installments] = await Promise.all([
    filamentoPaymentsRepo(),
    filamentoInstallmentsRepo(),
  ]);
  return {
    filamentoPayments: payments.list,
    filamentoInstallments: installments.list,
  };
});

export const listInsumoPayments = createServerFn({ method: "GET" }).handler(async () => {
  const [payments, installments] = await Promise.all([
    insumoPaymentsRepo(),
    insumoInstallmentsRepo(),
  ]);
  return {
    insumoPayments: payments.list,
    insumoInstallments: installments.list,
  };
});

export const listFilamentoPaymentEvents = createServerFn({ method: "GET" }).handler(async () => {
  const repo = await filamentoPaymentEventsRepo();
  return repo.list;
});

export const listInsumoPaymentEvents = createServerFn({ method: "GET" }).handler(async () => {
  const repo = await insumoPaymentEventsRepo();
  return repo.list;
});

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function getInstallmentPaidAmount(installment: { valor: number; valorPago: number | null }) {
  return Math.min(roundMoney(installment.valorPago ?? 0), installment.valor);
}

function getInstallmentRemainingAmount(installment: { valor: number; valorPago: number | null }) {
  return Math.max(roundMoney(installment.valor - getInstallmentPaidAmount(installment)), 0);
}

async function recordFilamentoEvent(event: FilamentoPaymentEvent) {
  const eventsRepo = await filamentoPaymentEventsRepo();
  await eventsRepo.insert(event);
}

async function recordInsumoEvent(event: InsumoPaymentEvent) {
  const eventsRepo = await insumoPaymentEventsRepo();
  await eventsRepo.insert(event);
}

export const createFilamentoPayment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      batchId: z.string().min(1),
      formaPagamento: z.enum(["a_vista", "parcelado"]),
      custoTotal: z.number().min(0.01).max(10_000_000),
      parcelas: z.number().int().min(1).max(48),
      dataParaPagamento: z.string().min(1).max(30),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const paymentsRepo = await filamentoPaymentsRepo();
    const installmentsRepo = await filamentoInstallmentsRepo();
    const paymentId = randomUUID();
    const payment: FilamentoPayment = {
      id: paymentId,
      batchId: data.batchId,
      formaPagamento: data.formaPagamento,
      custoTotal: data.custoTotal,
      parcelas: data.parcelas,
      dataParaPagamento: data.dataParaPagamento,
      createdAt: nowIso(),
    };
    await paymentsRepo.insert(payment);

    const perParcel = Math.round((data.custoTotal / data.parcelas) * 100) / 100;
    const lastParcelDiff = +(data.custoTotal - perParcel * data.parcelas).toFixed(2);
    const items: FilamentoPaymentInstallment[] = [];
    for (let i = 0; i < data.parcelas; i++) {
      const valor = i === data.parcelas - 1 ? Math.round((perParcel + lastParcelDiff) * 100) / 100 : perParcel;
      items.push({
        id: randomUUID(),
        paymentId,
        numero: i + 1,
        valor,
        vencimento: addCalendarMonthsIso(data.dataParaPagamento, i),
        pago: false,
        dataPagamento: null,
        valorPago: null,
        observacao: null,
      });
    }
    await installmentsRepo.insertMany(items);
    await paymentsRepo.attachToBatch(data.batchId, paymentId);
    return { ok: true, paymentId };
  });

export const updateFilamentoPayment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      paymentId: z.string().min(1),
      formaPagamento: z.enum(["a_vista", "parcelado"]),
      custoTotal: z.number().min(0.01).max(10_000_000),
      parcelas: z.number().int().min(1).max(48),
      dataParaPagamento: z.string().min(1).max(30),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const paymentsRepo = await filamentoPaymentsRepo();
    const installmentsRepo = await filamentoInstallmentsRepo();
    const existing = paymentsRepo.list.find((payment) => payment.id === data.paymentId);
    if (!existing) throw new Error("Plano de pagamento não encontrado.");

    const updated: FilamentoPayment = {
      ...existing,
      formaPagamento: data.formaPagamento,
      custoTotal: data.custoTotal,
      parcelas: data.parcelas,
      dataParaPagamento: data.dataParaPagamento,
    };
    await paymentsRepo.update(updated);

    const existingInstallments = installmentsRepo.list.filter((installment) => installment.paymentId === data.paymentId);
    const progressed = existingInstallments.filter(
      (installment) => installment.paymentId === data.paymentId && ((installment.valorPago ?? 0) > 0 || installment.pago),
    );

    const perParcel = Math.round((data.custoTotal / data.parcelas) * 100) / 100;
    const lastParcelDiff = +(data.custoTotal - perParcel * data.parcelas).toFixed(2);
    const newItems: FilamentoPaymentInstallment[] = [];
    for (let i = 0; i < data.parcelas; i++) {
      const numero = i + 1;
      const valor = i === data.parcelas - 1 ? Math.round((perParcel + lastParcelDiff) * 100) / 100 : perParcel;
      const existingProgressed = progressed.find((installment) => installment.numero === numero);
      if (existingProgressed) {
        const paidAmount = Math.min(existingProgressed.valorPago ?? 0, valor);
        newItems.push({
          ...existingProgressed,
          valor,
          vencimento: addCalendarMonthsIso(data.dataParaPagamento, i),
          pago: paidAmount >= valor,
          valorPago: paidAmount > 0 ? paidAmount : null,
          dataPagamento: paidAmount > 0 ? existingProgressed.dataPagamento : null,
        });
        continue;
      }
      newItems.push({
        id: randomUUID(),
        paymentId: data.paymentId,
        numero,
        valor,
        vencimento: addCalendarMonthsIso(data.dataParaPagamento, i),
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
      (item) => !nextIds.has(item.id) && getInstallmentPaidAmount(item) > 0,
    );
    if (progressedToRemove.length > 0) {
      throw new Error("Nao e possivel reduzir parcelas que ja possuem historico de pagamento.");
    }
    const idsToRemove = existingInstallments
      .filter((item) => !nextIds.has(item.id) && getInstallmentPaidAmount(item) === 0)
      .map((item) => item.id);

    for (const item of itemsToUpdate) {
      await installmentsRepo.update(item);
    }
    await installmentsRepo.insertMany(itemsToInsert);
    await installmentsRepo.removeMany(idsToRemove);
    return { ok: true };
  });

export const deleteFilamentoPayment = createServerFn({ method: "POST" })
  .validator(z.object({ paymentId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const paymentsRepo = await filamentoPaymentsRepo();
    const installmentsRepo = await filamentoInstallmentsRepo();
    await installmentsRepo.deleteByPayment(data.paymentId);
    await paymentsRepo.detachFromFilamentos(data.paymentId);
    await paymentsRepo.remove(data.paymentId);
    return { ok: true };
  });

export const payInstallment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      installmentId: z.string().min(1),
      dataPagamento: z.string().min(1).max(30),
      valorPago: z.number().min(0).max(10_000_000).optional(),
      observacao: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const installmentsRepo = await filamentoInstallmentsRepo();
    const installment = installmentsRepo.list.find((item) => item.id === data.installmentId);
    if (!installment) throw new Error("Parcela não encontrada.");
    if (installment.pago) throw new Error("Parcela já está quitada.");
    const remaining = getInstallmentRemainingAmount(installment);
    const amountToAdd = roundMoney(data.valorPago ?? remaining);
    if (amountToAdd <= 0) throw new Error("Informe um valor de pagamento maior que zero.");
    if (amountToAdd - remaining > 0.001) {
      throw new Error("O valor informado é maior que o saldo restante da parcela.");
    }
    const nextPaidAmount = roundMoney(getInstallmentPaidAmount(installment) + amountToAdd);
    const settled = nextPaidAmount >= installment.valor;
    const updated: FilamentoPaymentInstallment = {
      ...installment,
      pago: settled,
      dataPagamento: data.dataPagamento,
      valorPago: nextPaidAmount,
      observacao: data.observacao ?? installment.observacao,
    };
    await installmentsRepo.update(updated);
    await recordFilamentoEvent({
      id: randomUUID(),
      installmentId: installment.id,
      paymentId: installment.paymentId,
      tipo: "pagamento",
      valor: amountToAdd,
      dataPagamento: data.dataPagamento,
      observacao: data.observacao ?? installment.observacao,
      createdAt: nowIso(),
    });
    return { ok: true };
  });

export const revertInstallment = createServerFn({ method: "POST" })
  .validator(z.object({ installmentId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const installmentsRepo = await filamentoInstallmentsRepo();
    const installment = installmentsRepo.list.find((item) => item.id === data.installmentId);
    if (!installment) throw new Error("Parcela não encontrada.");
    const reversedAmount = getInstallmentPaidAmount(installment);
    const updated: FilamentoPaymentInstallment = {
      ...installment,
      pago: false,
      dataPagamento: null,
      valorPago: null,
    };
    await installmentsRepo.update(updated);
    if (reversedAmount > 0) {
      await recordFilamentoEvent({
        id: randomUUID(),
        installmentId: installment.id,
        paymentId: installment.paymentId,
        tipo: "estorno",
        valor: reversedAmount,
        dataPagamento: todayIso(),
        observacao: installment.observacao,
        createdAt: nowIso(),
      });
    }
    return { ok: true };
  });

export const updateInstallment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      installmentId: z.string().min(1),
      vencimento: z.string().min(1).max(30).optional(),
      valor: z.number().min(0.01).max(10_000_000).optional(),
      observacao: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const installmentsRepo = await filamentoInstallmentsRepo();
    const installment = installmentsRepo.list.find((item) => item.id === data.installmentId);
    if (!installment) throw new Error("Parcela não encontrada.");
    const updated: FilamentoPaymentInstallment = {
      ...installment,
      vencimento: data.vencimento ?? installment.vencimento,
      valor: data.valor ?? installment.valor,
      observacao: data.observacao ?? installment.observacao,
    };
    await installmentsRepo.update(updated);
    return { ok: true };
  });

export const settlePayment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      paymentId: z.string().min(1),
      totalPago: z.number().min(0).max(10_000_000).optional(),
      dataPagamento: z.string().min(1).max(30).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const installmentsRepo = await filamentoInstallmentsRepo();
    const pending = installmentsRepo.list
      .filter((installment) => installment.paymentId === data.paymentId && !installment.pago)
      .sort((a, b) => a.numero - b.numero);
    if (pending.length === 0) return { ok: true };

    const today = data.dataPagamento ?? todayIso();
    const totalRemaining = pending.reduce((sum, installment) => sum + getInstallmentRemainingAmount(installment), 0);
    let remaining = data.totalPago ?? totalRemaining;
    if (remaining <= 0) throw new Error("Informe um valor maior que zero para quitar.");
    if (remaining - totalRemaining > 0.001) {
      throw new Error("O valor informado é maior que o saldo restante do lote.");
    }
    let distributed = 0;
    const updates: FilamentoPaymentInstallment[] = [];
    for (let index = 0; index < pending.length; index++) {
      const installment = pending[index];
      const isLast = index === pending.length - 1;
      const currentPaid = getInstallmentPaidAmount(installment);
      const installmentRemaining = getInstallmentRemainingAmount(installment);
      const amountToAdd = isLast ? roundMoney(remaining - distributed) : installmentRemaining;
      const valorPago = roundMoney(currentPaid + amountToAdd);
      updates.push({
        ...installment,
        pago: valorPago >= installment.valor,
        dataPagamento: today,
        valorPago,
      });
      distributed += amountToAdd;
    }
    for (const update of updates) {
      await installmentsRepo.update(update);
      const amountAdded = roundMoney(update.valorPago - getInstallmentPaidAmount(pending.find((item) => item.id === update.id)!));
      if (amountAdded > 0) {
        await recordFilamentoEvent({
          id: randomUUID(),
          installmentId: update.id,
          paymentId: update.paymentId,
          tipo: "pagamento",
          valor: amountAdded,
          dataPagamento: today,
          observacao: update.observacao,
          createdAt: nowIso(),
        });
      }
    }
    return { ok: true };
  });

export const payInsumoInstallment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      installmentId: z.string().min(1),
      dataPagamento: z.string().min(1).max(30),
      valorPago: z.number().min(0).max(10_000_000).optional(),
      observacao: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const installmentsRepo = await insumoInstallmentsRepo();
    const installment = installmentsRepo.list.find((item) => item.id === data.installmentId);
    if (!installment) throw new Error("Parcela do insumo não encontrada.");
    if (installment.pago) throw new Error("Parcela do insumo já está quitada.");
    const remaining = getInstallmentRemainingAmount(installment);
    const amountToAdd = roundMoney(data.valorPago ?? remaining);
    if (amountToAdd <= 0) throw new Error("Informe um valor de pagamento maior que zero.");
    if (amountToAdd - remaining > 0.001) {
      throw new Error("O valor informado é maior que o saldo restante da parcela.");
    }
    const nextPaidAmount = roundMoney(getInstallmentPaidAmount(installment) + amountToAdd);
    const settled = nextPaidAmount >= installment.valor;
    const updated: InsumoPaymentInstallment = {
      ...installment,
      pago: settled,
      dataPagamento: data.dataPagamento,
      valorPago: nextPaidAmount,
      observacao: data.observacao ?? installment.observacao,
    };
    await installmentsRepo.update(updated);
    await recordInsumoEvent({
      id: randomUUID(),
      installmentId: installment.id,
      paymentId: installment.paymentId,
      tipo: "pagamento",
      valor: amountToAdd,
      dataPagamento: data.dataPagamento,
      observacao: data.observacao ?? installment.observacao,
      createdAt: nowIso(),
    });
    return { ok: true };
  });

export const revertInsumoInstallment = createServerFn({ method: "POST" })
  .validator(z.object({ installmentId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const installmentsRepo = await insumoInstallmentsRepo();
    const installment = installmentsRepo.list.find((item) => item.id === data.installmentId);
    if (!installment) throw new Error("Parcela do insumo não encontrada.");
    const reversedAmount = getInstallmentPaidAmount(installment);
    const updated: InsumoPaymentInstallment = {
      ...installment,
      pago: false,
      dataPagamento: null,
      valorPago: null,
    };
    await installmentsRepo.update(updated);
    if (reversedAmount > 0) {
      await recordInsumoEvent({
        id: randomUUID(),
        installmentId: installment.id,
        paymentId: installment.paymentId,
        tipo: "estorno",
        valor: reversedAmount,
        dataPagamento: todayIso(),
        observacao: installment.observacao,
        createdAt: nowIso(),
      });
    }
    return { ok: true };
  });

export const updateInsumoInstallment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      installmentId: z.string().min(1),
      vencimento: z.string().min(1).max(30).optional(),
      valor: z.number().min(0.01).max(10_000_000).optional(),
      observacao: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const installmentsRepo = await insumoInstallmentsRepo();
    const installment = installmentsRepo.list.find((item) => item.id === data.installmentId);
    if (!installment) throw new Error("Parcela do insumo não encontrada.");
    const updated: InsumoPaymentInstallment = {
      ...installment,
      vencimento: data.vencimento ?? installment.vencimento,
      valor: data.valor ?? installment.valor,
      observacao: data.observacao ?? installment.observacao,
    };
    await installmentsRepo.update(updated);
    return { ok: true };
  });

export const settleInsumoPayment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      paymentId: z.string().min(1),
      totalPago: z.number().min(0).max(10_000_000).optional(),
      dataPagamento: z.string().min(1).max(30).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const installmentsRepo = await insumoInstallmentsRepo();
    const pending = installmentsRepo.list
      .filter((installment) => installment.paymentId === data.paymentId && !installment.pago)
      .sort((a, b) => a.numero - b.numero);
    if (pending.length === 0) return { ok: true };

    const paymentDate = data.dataPagamento ?? todayIso();
    const totalRemaining = pending.reduce((sum, installment) => sum + getInstallmentRemainingAmount(installment), 0);
    let remaining = data.totalPago ?? totalRemaining;
    if (remaining <= 0) throw new Error("Informe um valor maior que zero para quitar.");
    if (remaining - totalRemaining > 0.001) {
      throw new Error("O valor informado é maior que o saldo restante da compra.");
    }
    let distributed = 0;
    const updates: InsumoPaymentInstallment[] = [];
    for (let index = 0; index < pending.length; index++) {
      const installment = pending[index];
      const isLast = index === pending.length - 1;
      const currentPaid = getInstallmentPaidAmount(installment);
      const installmentRemaining = getInstallmentRemainingAmount(installment);
      const amountToAdd = isLast ? roundMoney(remaining - distributed) : installmentRemaining;
      const valorPago = roundMoney(currentPaid + amountToAdd);
      updates.push({
        ...installment,
        pago: valorPago >= installment.valor,
        dataPagamento: paymentDate,
        valorPago,
      });
      distributed += amountToAdd;
    }
    for (const update of updates) {
      await installmentsRepo.update(update);
      const amountAdded = roundMoney(update.valorPago - getInstallmentPaidAmount(pending.find((item) => item.id === update.id)!));
      if (amountAdded > 0) {
        await recordInsumoEvent({
          id: randomUUID(),
          installmentId: update.id,
          paymentId: update.paymentId,
          tipo: "pagamento",
          valor: amountAdded,
          dataPagamento: paymentDate,
          observacao: update.observacao,
          createdAt: nowIso(),
        });
      }
    }
    return { ok: true };
  });

export const deleteInsumoPayment = createServerFn({ method: "POST" })
  .validator(z.object({ paymentId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const paymentsRepo = await insumoPaymentsRepo();
    const installmentsRepo = await insumoInstallmentsRepo();
    await installmentsRepo.deleteByPayment(data.paymentId);
    await paymentsRepo.detachFromInsumo(data.paymentId);
    await paymentsRepo.remove(data.paymentId);
    return { ok: true };
  });
