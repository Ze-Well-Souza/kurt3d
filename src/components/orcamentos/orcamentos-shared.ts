import { ArrowRightLeft, CheckCircle2, Clock, FileText, Send, XCircle } from "lucide-react";
import type { BudgetQuote, BudgetQuoteItem, BudgetQuoteStatus } from "@/lib/domain/types";
import type { QuoteInput } from "@/lib/domain/quote-print";

export const STATUS_LABELS: Record<BudgetQuoteStatus, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Rejeitado",
  expired: "Expirado",
  converted: "Convertido",
};

export const STATUS_COLORS: Record<BudgetQuoteStatus, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-300",
  sent: "bg-blue-100 text-blue-700 border-blue-300",
  approved: "bg-green-100 text-green-700 border-green-300",
  rejected: "bg-red-100 text-red-700 border-red-300",
  expired: "bg-yellow-100 text-yellow-700 border-yellow-300",
  converted: "bg-purple-100 text-purple-700 border-purple-300",
};

export const STATUS_ICONS: Partial<Record<BudgetQuoteStatus, typeof CheckCircle2>> = {
  draft: FileText,
  sent: Send,
  approved: CheckCircle2,
  rejected: XCircle,
  expired: Clock,
  converted: ArrowRightLeft,
};

export function emptyItem(): BudgetQuoteItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unitPrice: 0,
    timeMinutes: 0,
    materialGrams: 0,
    subtotal: 0,
  };
}

/** Converte um orçamento salvo para o formato usado no PDF/WhatsApp. */
export function quoteToShareInput(
  quote: BudgetQuote,
  settings: { studioNome?: string; whatsappNumero?: string } | undefined,
): QuoteInput {
  return {
    clientName: quote.clientName,
    items: quote.items.map((item) => ({
      name: item.description,
      category: "",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.subtotal,
      timeMinutes: item.timeMinutes ?? 0,
      gramsPerUnit: item.materialGrams ?? 0,
    })),
    validityDays: quote.validityDays,
    observations: quote.notes ?? undefined,
    discountPercent: quote.discountPercent ?? undefined,
    studioNome: settings?.studioNome ?? "Kurti 3D",
    whatsappNumero: settings?.whatsappNumero ?? "",
  };
}
