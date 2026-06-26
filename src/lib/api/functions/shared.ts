import type { Client, Filamento, Lead, Order, Status } from "../../domain/types";
import { nowIso } from "../../server/db.server";
import { normalizeClientName, normalizePhone } from "../../utils/normalization";

export function buildFilamentoLabel(filamento: Filamento) {
  return `[${filamento.sku}] ${filamento.marca} ${filamento.cor}`;
}

export function allowedStatusTransition(from: Status, to: Status) {
  const allowed: Record<Status, Status[]> = {
    todo: ["printing"],
    printing: ["todo", "done"],
    done: [],
    vendido: [],
    presente: [],
    falha: [],
  };
  return allowed[from].includes(to);
}

export function computeOrderReservedGrams(
  txns: { orderId: string; filamentId: string; type: string; grams: number }[],
  orderId: string,
  filamentId: string,
) {
  let grams = 0;
  for (const txn of txns) {
    if (txn.orderId !== orderId) continue;
    if (txn.filamentId !== filamentId) continue;
    if (txn.type === "reserve") grams += txn.grams;
    if (txn.type === "release") grams -= txn.grams;
    if (txn.type === "consume") grams -= txn.grams;
  }
  return Math.max(0, grams);
}

export { normalizeClientName, normalizePhone };

export function buildLeadConversionNote(lead: Lead) {
  const parts = [
    `[Lead convertido em ${nowIso().slice(0, 10)}]`,
    lead.mensagem ? `Mensagem: ${lead.mensagem}` : null,
    lead.linkProjeto ? `Projeto: ${lead.linkProjeto}` : null,
  ].filter(Boolean);
  return parts.join("\n");
}

export function mergeNotes(existingNotes?: string | null, nextNote?: string | null) {
  const base = existingNotes?.trim();
  const addition = nextNote?.trim();

  if (!addition) return base ?? null;
  if (!base) return addition;
  if (base.includes(addition)) return base;
  return `${base}\n\n${addition}`;
}

export function resolveClientId(
  clients: Client[],
  clientName: string,
  explicitClientId?: string | null,
) {
  if (explicitClientId) {
    const explicitClient = clients.find((client) => client.id === explicitClientId);
    if (explicitClient) return explicitClient.id;
  }

  const normalizedClientName = normalizeClientName(clientName);
  const matchedClient = clients.find((client) => normalizeClientName(client.nome) === normalizedClientName);
  return matchedClient?.id ?? null;
}

export function relinkOrdersToClient(
  orders: Order[],
  clientId: string,
  namesToMatch: string[],
  updatedAt: string,
) {
  const normalizedNames = new Set(namesToMatch.map(normalizeClientName).filter(Boolean));
  return orders.map((order) =>
    !order.clientId && normalizedNames.has(normalizeClientName(order.client))
      ? { ...order, clientId, updatedAt }
      : order,
  );
}

export function hydrateOrderClientLinks(orders: Order[], clients: Client[]) {
  const uniqueClientIdsByName = new Map<string, string | null>();

  for (const client of clients) {
    const normalizedName = normalizeClientName(client.nome);
    const existingClientId = uniqueClientIdsByName.get(normalizedName);

    if (existingClientId === undefined) {
      uniqueClientIdsByName.set(normalizedName, client.id);
      continue;
    }

    if (existingClientId !== client.id) {
      uniqueClientIdsByName.set(normalizedName, null);
    }
  }

  return orders.map((order) => {
    if (order.clientId) return order;
    const inferredClientId = uniqueClientIdsByName.get(normalizeClientName(order.client));
    return inferredClientId ? { ...order, clientId: inferredClientId } : order;
  });
}
