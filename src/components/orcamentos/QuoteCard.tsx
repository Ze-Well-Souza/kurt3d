import {
  ArrowRightLeft,
  CheckCircle2,
  FileText,
  MessageCircle,
  Pencil,
  Printer,
  ScrollText,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brl, formatPhoneDisplay } from "@/lib/utils";
import { openPrintQuote, openQuoteWhatsApp } from "@/lib/domain/quote-print";
import { formatIsoDatePtBr } from "@/lib/domain/installments";
import type { BudgetQuote } from "@/lib/domain/types";
import type { OrcamentosCtx } from "./use-orcamentos-page-state";
import { STATUS_COLORS, STATUS_ICONS, STATUS_LABELS, quoteToShareInput } from "./orcamentos-shared";

export function QuoteCard({ ctx, quote }: { ctx: OrcamentosCtx; quote: BudgetQuote }) {
  const {
    orders,
    settingsData,
    mutateStatus,
    mutateConvert,
    openEdit,
    setDeleteId,
    openReceiptFor,
  } = ctx;
  const StatusIcon = STATUS_ICONS[quote.status] ?? FileText;
  const isConverted =
    quote.convertedToOrderId && orders.some((o) => o.id === quote.convertedToOrderId);

  return (
    <Card className="overflow-hidden border-border">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">{quote.clientName}</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {quote.clientContact && <span>{formatPhoneDisplay(quote.clientContact)}</span>}
              {quote.clientEmail && <span>{quote.clientEmail}</span>}
              <span>{formatIsoDatePtBr(quote.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`gap-1 text-xs ${STATUS_COLORS[quote.status]}`}>
              <StatusIcon className="h-3 w-3" />
              {STATUS_LABELS[quote.status]}
            </Badge>
            <span className="font-display text-lg font-bold filament-text">{brl(quote.total)}</span>
          </div>
        </div>
      </CardHeader>

      {/* Items list */}
      <div className="border-t border-border bg-muted/20 px-6 py-2">
        <div className="space-y-1">
          {quote.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="truncate flex-1">
                <span className="font-medium">{item.description}</span>
                {item.quantity > 1 && (
                  <span className="ml-1 text-xs text-muted-foreground">x{item.quantity}</span>
                )}
              </span>
              <span className="ml-2 shrink-0 text-muted-foreground">{brl(item.subtotal)}</span>
            </div>
          ))}
          {quote.discountPercent && quote.discountPercent > 0 && (
            <div className="flex items-center justify-between text-sm text-green-600">
              <span>Desconto</span>
              <span>-{quote.discountPercent}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {quote.notes && (
        <div className="border-t border-border px-6 py-2 text-xs text-muted-foreground">
          {quote.notes}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2">
        <div className="flex items-center gap-1">
          {/* Draft → Sent */}
          {quote.status === "draft" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => mutateStatus.mutate({ quoteId: quote.id, status: "sent" })}
              className="gap-1 text-xs"
            >
              <Send className="h-3 w-3" /> Marcar Enviado
            </Button>
          )}
          {/* Sent → Approved */}
          {quote.status === "sent" && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => mutateStatus.mutate({ quoteId: quote.id, status: "approved" })}
                className="gap-1 text-xs text-green-600"
              >
                <CheckCircle2 className="h-3 w-3" /> Aprovar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => mutateStatus.mutate({ quoteId: quote.id, status: "rejected" })}
                className="gap-1 text-xs text-red-600"
              >
                <XCircle className="h-3 w-3" /> Rejeitar
              </Button>
            </>
          )}
          {/* Approved → Convert */}
          {quote.status === "approved" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => mutateConvert.mutate(quote.id)}
              className="gap-1 text-xs text-purple-600"
              disabled={mutateConvert.isPending}
            >
              <ArrowRightLeft className="h-3 w-3" /> Converter em Pedido
            </Button>
          )}
          {/* Expired/Rejected → Draft (reopen) */}
          {(quote.status === "expired" || quote.status === "rejected") && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => mutateStatus.mutate({ quoteId: quote.id, status: "draft" })}
              className="gap-1 text-xs"
            >
              <FileText className="h-3 w-3" /> Reabrir
            </Button>
          )}
          {isConverted && (
            <Badge
              variant="outline"
              className="text-xs text-purple-600 border-purple-300 bg-purple-50"
            >
              Pedido #{quote.convertedToOrderId!.slice(0, 8)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              openQuoteWhatsApp(quoteToShareInput(quote, settingsData), quote.clientContact)
            }
            className="gap-1 text-xs text-green-700"
            title="Enviar orçamento por WhatsApp"
          >
            <MessageCircle className="h-3 w-3" /> WhatsApp
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openPrintQuote(quoteToShareInput(quote, settingsData))}
            className="gap-1 text-xs"
            title="Gerar PDF do orçamento (imprimir/salvar)"
          >
            <Printer className="h-3 w-3" /> PDF
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openReceiptFor(quote)}
            className="gap-1 text-xs"
            title="Gerar recibo de venda"
          >
            <ScrollText className="h-3 w-3" /> Recibo
          </Button>
          {quote.status !== "converted" && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => openEdit(quote)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteId(quote.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
