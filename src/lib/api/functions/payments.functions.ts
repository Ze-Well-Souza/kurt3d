import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { addCalendarMonthsIso, todayIso } from "../../domain/installments";
import type { FilamentoPayment, FilamentoPaymentInstallment, InsumoPayment, InsumoPaymentInstallment } from "../../domain/types";
import { nowIso } from "../../server/db.server";
import { filamentoInstallmentsRepo, filamentoPaymentsRepo, insumoInstallmentsRepo, insumoPaymentsRepo } from "../../server/repositories.server";

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

    const paid = installmentsRepo.list.filter((installment) => installment.paymentId === data.paymentId && installment.pago);
    await installmentsRepo.deleteByPayment(data.paymentId);

    const perParcel = Math.round((data.custoTotal / data.parcelas) * 100) / 100;
    const lastParcelDiff = +(data.custoTotal - perParcel * data.parcelas).toFixed(2);
    const newItems: FilamentoPaymentInstallment[] = [];
    for (let i = 0; i < data.parcelas; i++) {
      const numero = i + 1;
      const existingPaid = paid.find((installment) => installment.numero === numero);
      if (existingPaid) {
        newItems.push(existingPaid);
        continue;
      }
      const valor = i === data.parcelas - 1 ? Math.round((perParcel + lastParcelDiff) * 100) / 100 : perParcel;
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
    await installmentsRepo.insertMany(newItems);
    return { ok: true };
  });

export const deleteFilamentoPayment = createServerFn({ method: "POST" })
  .validator(z.object({ paymentId: z.string().min(1) }))
  .handler(async ({ data }) => {
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
    const installmentsRepo = await filamentoInstallmentsRepo();
    const installment = installmentsRepo.list.find((item) => item.id === data.installmentId);
    if (!installment) throw new Error("Parcela não encontrada.");
    const updated: FilamentoPaymentInstallment = {
      ...installment,
      pago: true,
      dataPagamento: data.dataPagamento,
      valorPago: data.valorPago ?? installment.valor,
      observacao: data.observacao ?? installment.observacao,
    };
    await installmentsRepo.update(updated);
    return { ok: true };
  });

export const revertInstallment = createServerFn({ method: "POST" })
  .validator(z.object({ installmentId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const installmentsRepo = await filamentoInstallmentsRepo();
    const installment = installmentsRepo.list.find((item) => item.id === data.installmentId);
    if (!installment) throw new Error("Parcela não encontrada.");
    const updated: FilamentoPaymentInstallment = {
      ...installment,
      pago: false,
      dataPagamento: null,
      valorPago: null,
    };
    await installmentsRepo.update(updated);
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
    const installmentsRepo = await filamentoInstallmentsRepo();
    const pending = installmentsRepo.list
      .filter((installment) => installment.paymentId === data.paymentId && !installment.pago)
      .sort((a, b) => a.numero - b.numero);
    if (pending.length === 0) return { ok: true };

    const today = data.dataPagamento ?? todayIso();
    let remaining = data.totalPago ?? pending.reduce((sum, installment) => sum + installment.valor, 0);
    let distributed = 0;
    const updates: FilamentoPaymentInstallment[] = [];
    for (let index = 0; index < pending.length; index++) {
      const installment = pending[index];
      const isLast = index === pending.length - 1;
      const valorPago = isLast ? Math.round((remaining - distributed) * 100) / 100 : installment.valor;
      updates.push({
        ...installment,
        pago: true,
        dataPagamento: today,
        valorPago,
      });
      distributed += valorPago;
    }
    for (const update of updates) {
      await installmentsRepo.update(update);
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
    const installmentsRepo = await insumoInstallmentsRepo();
    const installment = installmentsRepo.list.find((item) => item.id === data.installmentId);
    if (!installment) throw new Error("Parcela do insumo não encontrada.");
    const updated: InsumoPaymentInstallment = {
      ...installment,
      pago: true,
      dataPagamento: data.dataPagamento,
      valorPago: data.valorPago ?? installment.valor,
      observacao: data.observacao ?? installment.observacao,
    };
    await installmentsRepo.update(updated);
    return { ok: true };
  });

export const revertInsumoInstallment = createServerFn({ method: "POST" })
  .validator(z.object({ installmentId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const installmentsRepo = await insumoInstallmentsRepo();
    const installment = installmentsRepo.list.find((item) => item.id === data.installmentId);
    if (!installment) throw new Error("Parcela do insumo não encontrada.");
    const updated: InsumoPaymentInstallment = {
      ...installment,
      pago: false,
      dataPagamento: null,
      valorPago: null,
    };
    await installmentsRepo.update(updated);
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
    const installmentsRepo = await insumoInstallmentsRepo();
    const pending = installmentsRepo.list
      .filter((installment) => installment.paymentId === data.paymentId && !installment.pago)
      .sort((a, b) => a.numero - b.numero);
    if (pending.length === 0) return { ok: true };

    const paymentDate = data.dataPagamento ?? todayIso();
    let remaining = data.totalPago ?? pending.reduce((sum, installment) => sum + installment.valor, 0);
    let distributed = 0;
    const updates: InsumoPaymentInstallment[] = [];
    for (let index = 0; index < pending.length; index++) {
      const installment = pending[index];
      const isLast = index === pending.length - 1;
      const valorPago = isLast ? Math.round((remaining - distributed) * 100) / 100 : installment.valor;
      updates.push({
        ...installment,
        pago: true,
        dataPagamento: paymentDate,
        valorPago,
      });
      distributed += valorPago;
    }
    for (const update of updates) {
      await installmentsRepo.update(update);
    }
    return { ok: true };
  });

export const deleteInsumoPayment = createServerFn({ method: "POST" })
  .validator(z.object({ paymentId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const paymentsRepo = await insumoPaymentsRepo();
    const installmentsRepo = await insumoInstallmentsRepo();
    await installmentsRepo.deleteByPayment(data.paymentId);
    await paymentsRepo.detachFromInsumo(data.paymentId);
    await paymentsRepo.remove(data.paymentId);
    return { ok: true };
  });
