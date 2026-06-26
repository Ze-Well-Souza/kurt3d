import { createServerFn } from "@tanstack/react-start";
import { computeReservedByFilament } from "../../domain/inventory";
import {
  clientsRepo,
  expensesRepo,
  filamentoInstallmentsRepo,
  filamentoPaymentsRepo,
  filamentosHistoryRepo,
  filamentosRepo,
  insumosRepo,
  inventoryRepo,
  leadsRepo,
  ordersRepo,
  portfolioRepo,
  settingsRepo,
  vendasRepo,
} from "../../server/repositories.server";
import { buildFilamentoLabel, hydrateOrderClientLinks } from "./shared";

export const listPublicSnapshot = createServerFn({ method: "GET" }).handler(async () => {
  const [portfolio, settingsData] = await Promise.all([portfolioRepo(), settingsRepo()]);

  return {
    portfolio: portfolio.list,
    settings: settingsData.settings,
  };
});

export const listSnapshot = createServerFn({ method: "GET" }).handler(async () => {
  const [
    orders,
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
  ] = await Promise.all([
    ordersRepo(),
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
  ]);

  const reservedMap = computeReservedByFilament(inv.list);
  const filamentosView = filamentos.list.map((filamento) => ({
    ...filamento,
    reservedGrams: reservedMap[filamento.id] ?? 0,
    disponivelGrams: Math.max(0, filamento.pesoAtual - (reservedMap[filamento.id] ?? 0)),
    label: buildFilamentoLabel(filamento),
  }));

  const ordersView = hydrateOrderClientLinks(orders.list, clients.list);

  return {
    orders: ordersView,
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
  };
});
