import { createServerFn } from "@tanstack/react-start";
import { computeReservedByFilament } from "../../domain/inventory";
import {
  clientsRepo,
  expensesRepo,
  filamentoInstallmentsRepo,
  filamentoPaymentEventsRepo,
  filamentoPaymentsRepo,
  filamentosHistoryRepo,
  filamentosRepo,
  insumoInstallmentsRepo,
  insumoPaymentEventsRepo,
  insumoPaymentsRepo,
  insumosRepo,
  inventoryRepo,
  leadsRepo,
  orderPartsRepo,
  ordersRepo,
  portfolioRepo,
  settingsRepo,
  vendasRepo,
  productionCalendarRepo,
  budgetQuotesRepo,
} from "../../server/repositories.server";
import { buildFilamentoLabel, hydrateOrderClientLinks } from "./shared";

export const listPublicSnapshot = createServerFn({ method: "GET" }).handler(async () => {
  const [portfolio, filamentos, settingsData] = await Promise.all([portfolioRepo(), filamentosRepo(), settingsRepo()]);

  const publicPortfolio = portfolio.list.map((item) => {
    const filamento = item.filamentoId ? filamentos.list.find((candidate) => candidate.id === item.filamentoId) : null;
    return {
      ...item,
      filamentoMaterial: filamento?.material ?? null,
      filamentoCor: filamento?.cor ?? null,
    };
  });

  return {
    portfolio: publicPortfolio,
    settings: settingsData.settings,
  };
});

export const listSnapshot = createServerFn({ method: "GET" }).handler(async () => {
  const [
    orders,
    orderParts,
    filamentos,
    filamentosHistory,
    portfolio,
    insumos,
    vendas,
    inv,
    expenses,
    settingsData,
    leads,
    clients,
    payments,
    installments,
    paymentEvents,
    insumoPayments,
    insumoInstallments,
    insumoPaymentEvents,
    calendarEvents,
    budgetQuotes,
  ] = await Promise.all([
    ordersRepo(),
    orderPartsRepo(),
    filamentosRepo(),
    filamentosHistoryRepo(),
    portfolioRepo(),
    insumosRepo(),
    vendasRepo(),
    inventoryRepo(),
    expensesRepo(),
    settingsRepo(),
    leadsRepo(),
    clientsRepo(),
    filamentoPaymentsRepo(),
    filamentoInstallmentsRepo(),
    filamentoPaymentEventsRepo(),
    insumoPaymentsRepo(),
    insumoInstallmentsRepo(),
    insumoPaymentEventsRepo(),
    productionCalendarRepo(),
    budgetQuotesRepo(),
  ]);

  const reservedMap = computeReservedByFilament(inv.list);
  const filamentosView = filamentos.list.map((filamento) => ({
    ...filamento,
    reservedGrams: reservedMap[filamento.id] ?? 0,
    disponivelGrams: Math.max(0, filamento.pesoAtual - (reservedMap[filamento.id] ?? 0)),
    label: buildFilamentoLabel(filamento),
  }));

  const partsByOrderId = orderParts.list.reduce<Record<string, typeof orderParts.list>>((acc, part) => {
    (acc[part.orderId] ??= []).push(part);
    return acc;
  }, {});

  const ordersView = hydrateOrderClientLinks(orders.list, clients.list).map((order) => ({
    ...order,
    parts: partsByOrderId[order.id] ?? [],
  }));

  return {
    orders: ordersView,
    orderParts: orderParts.list,
    filamentos: filamentosView,
    filamentosHistory: filamentosHistory.list,
    portfolio: portfolio.list,
    insumos: insumos.list,
    vendas: vendas.list,
    expenses: expenses.list,
    settings: settingsData.settings,
    leads: leads.list,
    clients: clients.list,
    filamentoPayments: payments.list,
    filamentoInstallments: installments.list,
    filamentoPaymentEvents: paymentEvents.list,
    insumoPayments: insumoPayments.list,
    insumoInstallments: insumoInstallments.list,
    insumoPaymentEvents: insumoPaymentEvents.list,
    calendarEvents: calendarEvents.list,
    budgetQuotes: budgetQuotes.list,
  };
});
