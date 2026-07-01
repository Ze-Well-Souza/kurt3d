import { computeReservedByFilament } from "../domain/inventory";
export { RepositoryError } from "./repositories/shared";
export { usersRepo, type User } from "./repositories/users.repo";
export { filamentosRepo } from "./repositories/filamentos.repo";
export { filamentosHistoryRepo } from "./repositories/filamentos-history.repo";
export { filamentoPaymentsRepo } from "./repositories/filamento-payments.repo";
export { filamentoInstallmentsRepo } from "./repositories/filamento-installments.repo";
export { insumoPaymentsRepo } from "./repositories/insumo-payments.repo";
export { insumoInstallmentsRepo } from "./repositories/insumo-installments.repo";
export { ordersRepo } from "./repositories/orders.repo";
export { orderPartsRepo } from "./repositories/order-parts.repo";
export { portfolioRepo } from "./repositories/portfolio.repo";
export { insumosRepo } from "./repositories/insumos.repo";
export { vendasRepo } from "./repositories/vendas.repo";
export { inventoryRepo } from "./repositories/inventory.repo";
export { expensesRepo } from "./repositories/expenses.repo";
export { leadsRepo } from "./repositories/leads.repo";
export { clientsRepo } from "./repositories/clients.repo";
export { settingsRepo } from "./repositories/settings.repo";
export { siteContentRepo } from "./repositories/site-content.repo";
export { productionCalendarRepo } from "./repositories/extended-repos";
export { budgetQuotesRepo } from "./repositories/extended-repos";
export { portfolioVideosRepo } from "./repositories/extended-repos";
export { savedReportsRepo } from "./repositories/extended-repos";

export async function computeReservedMap() {
  const inv = await inventoryRepo();
  return computeReservedByFilament(inv.list);
}
