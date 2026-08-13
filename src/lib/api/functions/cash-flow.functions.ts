/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FLUXO DE CAIXA — Endpoints (server functions)
 * ─────────────────────────────────────────────────────────────────────────────
 * - registerOrderPayment: registra um pagamento recebido (Pix/Dinheiro/etc.)
 *   vinculado a um pedido. Feito para o sócio lançar em segundos.
 * - listOrderPayments: lista todos os pagamentos (mais recentes primeiro).
 * - removeOrderPayment: remove um lançamento incorreto.
 * - getWeeklyCashFlow: resumo semanal (receita, despesas de material, lucro).
 * - getDailyCashFlow: resumo do dia com a lista de pagamentos, para os dois
 *   sócios auditarem as entradas instantaneamente.
 */
import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { resumoDiarioFluxoCaixa, resumoSemanalFluxoCaixa } from "../../domain/cash-flow";
import { todayIso } from "../../domain/installments";
import type { OrderPayment } from "../../domain/types";
import { nowIso } from "../../server/db.server";
import { expensesRepo, orderPaymentsRepo, ordersRepo } from "../../server/repositories.server";
import { checkMutationRateLimit } from "../../server/mutation-guard.server";
import { requireSession } from "../../server/require-session.server";

const METODOS = ["Pix", "Dinheiro", "Cartão", "Transferência", "Outro"] as const;

/** Lista todos os pagamentos recebidos (mais recentes primeiro). */
export const listOrderPayments = createServerFn({ method: "GET" }).handler(async () => {
  await requireSession();
  const repo = await orderPaymentsRepo();
  return repo.list;
});

/** Registra um pagamento recebido, vinculado a um pedido existente. */
export const registerOrderPayment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orderId: z.string().min(1, "Pedido obrigatório"),
      valor: z.number().min(0.01, "Valor deve ser maior que zero").max(1_000_000),
      metodo: z.enum(METODOS).default("Pix"),
      // Data do recebimento (YYYY-MM-DD). Padrão: hoje.
      data: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use YYYY-MM-DD)")
        .optional(),
      observacao: z.string().trim().max(300).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    const userId = await requireSession();

    // Garante que o pagamento aponta para um pedido real.
    const orders = await ordersRepo();
    const order = orders.list.find((item) => item.id === data.orderId);
    if (!order) throw new Error("Pedido não encontrado");

    const repo = await orderPaymentsRepo();
    const payment: OrderPayment = {
      id: randomUUID(),
      orderId: data.orderId,
      valor: data.valor,
      metodo: data.metodo,
      data: data.data ?? todayIso(),
      observacao: data.observacao?.length ? data.observacao : null,
      registradoPor: userId,
      createdAt: nowIso(),
    };
    await repo.insert(payment);
    return { ok: true, payment };
  });

/** Remove um lançamento de pagamento (correção de erro de digitação, etc.). */
export const removeOrderPayment = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await orderPaymentsRepo();
    await repo.remove(data.id);
    return { ok: true };
  });

/**
 * Resumo semanal do fluxo de caixa (segunda a domingo).
 * Retorna as últimas N semanas com receita, despesas de material,
 * outras despesas e lucro líquido.
 */
export const getWeeklyCashFlow = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        semanas: z.number().int().min(1).max(26).optional(),
        referenciaIso: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    await requireSession();
    const [payments, expenses] = await Promise.all([orderPaymentsRepo(), expensesRepo()]);
    return resumoSemanalFluxoCaixa(payments.list, expenses.list, {
      semanas: data?.semanas,
      referenciaIso: data?.referenciaIso,
    });
  });

/**
 * Resumo diário do fluxo de caixa (padrão: hoje).
 * Inclui a lista de pagamentos do dia, com cliente e projeto de cada pedido,
 * para conferência rápida entre os sócios.
 */
export const getDailyCashFlow = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        data: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    await requireSession();
    const [payments, expenses, orders] = await Promise.all([
      orderPaymentsRepo(),
      expensesRepo(),
      ordersRepo(),
    ]);
    const resumo = resumoDiarioFluxoCaixa(payments.list, expenses.list, data?.data);

    // Enriquece cada pagamento com cliente/projeto do pedido para o painel de auditoria.
    const ordersById = new Map(orders.list.map((order) => [order.id, order]));
    return {
      ...resumo,
      pagamentos: resumo.pagamentos.map((payment) => {
        const order = ordersById.get(payment.orderId);
        return {
          ...payment,
          client: order?.client ?? "—",
          projectName: order?.projectName ?? "—",
        };
      }),
    };
  });
