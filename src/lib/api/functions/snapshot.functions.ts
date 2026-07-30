import { createServerFn } from "@tanstack/react-start";
import { computeReservedByFilament } from "../../domain/inventory";
import { DEFAULT_APP_SETTINGS } from "../../domain/types";
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
import { safeParseJsonArray } from "../../server/repositories/mappers";
import { unwrapResult } from "../../server/repositories/shared";
import { getSupabaseAdminClient } from "../../server/supabase.server";
import { requireSession } from "../../server/require-session.server";
import { buildFilamentoLabel, hydrateOrderClientLinks } from "./shared";

export const listPublicSnapshot = createServerFn({ method: "GET" }).handler(async () => {
  // Rota pública de maior tráfego: filtro e projeção acontecem no SQL para
  // baixar do Supabase apenas os projetos públicos e as colunas exibidas no
  // site — nunca custos/preços internos nem projetos privados (economiza egress).
  const supabase = getSupabaseAdminClient();
  const [portfolioRows, filamentoRows, settingsRows] = await Promise.all([
    supabase
      .from("portfolio_projects")
      .select("id, nome, categoria, image_url, image_urls, published_at, filamento_id")
      .eq("is_public", true),
    supabase.from("filamentos").select("id, material, cor"),
    supabase.from("app_settings").select("whatsapp_numero").eq("id", "main").limit(1),
  ]).then(([portfolio, filamentos, settings]) => [
    unwrapResult(portfolio, {
      table: "portfolio_projects",
      operation: "listPublic",
      query: "select(public cols).eq(is_public, true)",
    }) as any[],
    unwrapResult(filamentos, {
      table: "filamentos",
      operation: "listPublicLookup",
      query: "select(id, material, cor)",
    }) as any[],
    unwrapResult(settings, {
      table: "app_settings",
      operation: "getPublicSettings",
      query: "select(whatsapp_numero).eq(id, main).limit(1)",
    }) as any[],
  ]);

  const publicPortfolio = portfolioRows
    .map((row) => {
      const filamento = row.filamento_id ? filamentoRows.find((candidate) => candidate.id === row.filamento_id) : null;
      return {
        id: row.id as string,
        nome: row.nome as string,
        categoria: row.categoria as string,
        imageUrl: (row.image_url ?? null) as string | null,
        imageUrls: safeParseJsonArray(row.image_urls).filter((v): v is string => typeof v === "string"),
        publishedAt: (row.published_at ?? null) as string | null,
        filamentoMaterial: (filamento?.material ?? null) as string | null,
        filamentoCor: (filamento?.cor ?? null) as string | null,
      };
    })
    .sort((a, b) => {
      if (!a.publishedAt && !b.publishedAt) return 0;
      if (!a.publishedAt) return 1;
      if (!b.publishedAt) return -1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

  return {
    portfolio: publicPortfolio,
    // Público só precisa do WhatsApp para o CTA de contato.
    settings: {
      whatsappNumero: settingsRows[0]?.whatsapp_numero ?? DEFAULT_APP_SETTINGS.whatsappNumero ?? "",
    },
  };
});

export const listSnapshot = createServerFn({ method: "GET" }).handler(async () => {
  await requireSession();
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
