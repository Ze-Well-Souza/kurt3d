import { useState } from "react";
import {
  Clock,
  Package,
  User,
  MapPin,
  ExternalLink,
  Layers,
  CreditCard,
  Trash2,
  Pencil,
  Download,
  ScrollText,
  MessageCircle,
  Printer,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn, brl } from "@/lib/utils";
import { saveReceipt } from "@/lib/api/data.functions";
import type { Order, Filamento, AppSettings } from "@/lib/domain/types";
import { calcOrderCostHybrid } from "@/lib/domain/cost";
import { isOrderAssetReference } from "@/lib/domain/order-asset";
import { summarizeOrderParts } from "@/lib/domain/order-parts";
import { openSaleReceiptWhatsApp, openPrintSaleReceipt } from "@/lib/domain/sale-receipt-print";
import { formatIsoDatePtBr } from "@/lib/domain/installments";
import {
  PAYMENT_METHODS,
  STATUS_BADGE,
  formatTime,
  getPaymentBadge,
  swatchDaCor,
  type FinalizarPedidoArgs,
} from "./order-card-shared";

/**
 * Filamento(s) do pedido, resolvidos para um rotulo legivel.
 *
 * Antes o card mostrava `Filamento <uuid>` e pintava a bolinha com
 * FILAMENT_SWATCHES[filamentoId] — mas aquele mapa e indexado por nome de cor,
 * nao por id, entao a bolinha saia sempre ciano. Pior: o uuid inteiro ocupava a
 * largura toda do cabecalho e espremia o nome do projeto ate sumir.
 */
function FilamentTag({ filamentos, order }: { filamentos?: Filamento[]; order: Order }) {
  const ids = order.filamentoIds?.length
    ? order.filamentoIds
    : order.filamentoId
      ? [order.filamentoId]
      : [];

  if (ids.length === 0) {
    return (
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="h-3 w-3 shrink-0 rounded-full border border-border bg-muted" />
        <span className="truncate text-[11px] text-muted-foreground">Sem filamento</span>
      </div>
    );
  }

  const resolvidos = ids.map((id) => filamentos?.find((f) => f.id === id) ?? null);
  const rotulos = resolvidos.map((f, i) =>
    f ? `[${f.sku}] ${f.marca} ${f.cor}` : `Filamento ${ids[i].slice(0, 8)}`,
  );
  const completo = rotulos.join(" · ");
  const resumo = rotulos.length > 1 ? `${rotulos[0]} +${rotulos.length - 1}` : rotulos[0];

  return (
    <div className="flex min-w-0 items-center gap-1.5" title={completo}>
      <span className="flex shrink-0 -space-x-1">
        {resolvidos.slice(0, 3).map((f, i) => (
          <span
            key={ids[i]}
            className="h-3 w-3 rounded-full border border-border shadow-sm"
            style={{ background: swatchDaCor(f?.cor) }}
          />
        ))}
      </span>
      <span className="truncate text-[11px] text-muted-foreground">{resumo}</span>
    </div>
  );
}

export function OrderCardView({
  order,
  dragging = false,
  onFinalizar,
  filamentos,
  onDelete,
  onDetail,
  onEdit,
  orderSettings,
  onOpenProjectReference,
}: {
  order: Order;
  dragging?: boolean;
  onFinalizar: (args: FinalizarPedidoArgs) => Promise<unknown>;
  filamentos?: Filamento[];
  onDelete?: (orderId: string) => void;
  onDetail?: (order: Order) => void;
  onEdit?: (order: Order) => void;
  orderSettings?: AppSettings;
  onOpenProjectReference?: (reference?: string | null) => Promise<void> | void;
}) {
  const [showDestino, setShowDestino] = useState(false);
  const [destinoValor, setDestinoValor] = useState("");
  const [destinoPagamento, setDestinoPagamento] = useState("");
  const [destinoDataPag, setDestinoDataPag] = useState("");
  const [receiptDialog, setReceiptDialog] = useState<{
    open: boolean;
    docType: "cnpj" | "cpf";
    docNumber: string;
    studioDocType: "cnpj" | "cpf";
    studioDocNumber: string;
    clientPhone: string;
    paid: boolean;
  }>({
    open: false,
    docType: "cnpj",
    docNumber: "",
    studioDocType: "cnpj",
    studioDocNumber: "",
    clientPhone: "",
    paid: false,
  });
  const badge = order.status in STATUS_BADGE ? STATUS_BADGE[order.status] : null;
  const filamento = order.filamentoId
    ? filamentos?.find((f) => f.id === order.filamentoId)
    : undefined;
  const costResult = calcOrderCostHybrid({
    order,
    filamento,
    precoVendaUnit: order.precoVenda ?? 0,
    settings: orderSettings,
  });
  const custoTotal = costResult.total;
  const lucro = order.precoVenda ? order.precoVenda * order.quantity - custoTotal : null;
  const paymentBadge = getPaymentBadge(order);
  const partSummary = order.parts?.length ? summarizeOrderParts(order.parts) : null;

  return (
    <>
      <Card
        className={cn(
          "filament-top select-none border-border bg-card p-3 shadow-sm transition-shadow",
          dragging ? "shadow-lg ring-2 ring-ring/40" : "hover:shadow-md",
          !badge && "cursor-grab active:cursor-grabbing",
        )}
        onClick={() => onDetail?.(order)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{order.projectName}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="truncate">{order.client}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {!badge && onEdit && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(order);
                }}
                aria-label="Editar pedido"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(order.id);
              }}
              aria-label="Excluir pedido"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {/* Filamento em linha propria: no cabecalho ele competia por largura
            com o nome do projeto e ganhava. */}
        <div className="mt-2">
          <FilamentTag filamentos={filamentos} order={order} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{order.quantity}</span> un.
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{formatTime(order.timeMinutes)}</span>
          </span>
          {order.printer && (
            <span className="inline-flex items-center gap-1">
              <Printer className="h-3.5 w-3.5" />
              {order.printer}
            </span>
          )}
          {order.multiPart && (
            <span className="inline-flex items-center gap-0.5 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
              <Layers className="h-3 w-3" />
              Multi
            </span>
          )}
        </div>
        {partSummary && (
          <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
            <Badge variant="secondary">Partes: {partSummary.total}</Badge>
            {partSummary.todo > 0 && <Badge variant="outline">A fazer: {partSummary.todo}</Badge>}
            {partSummary.printing > 0 && (
              <Badge variant="outline">Imprimindo: {partSummary.printing}</Badge>
            )}
            {partSummary.done > 0 && (
              <Badge variant="outline">Concluidas: {partSummary.done}</Badge>
            )}
            {partSummary.failed > 0 && <Badge variant="outline">Falha: {partSummary.failed}</Badge>}
          </div>
        )}
        {order.linkProjeto && (
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              void onOpenProjectReference?.(order.linkProjeto);
            }}
          >
            {isOrderAssetReference(order.linkProjeto) ? (
              <Download className="h-3 w-3" />
            ) : (
              <ExternalLink className="h-3 w-3" />
            )}
            {isOrderAssetReference(order.linkProjeto) ? "Abrir arquivo" : "Ver projeto"}
          </button>
        )}
        {(order.precoVenda || custoTotal > 0) && (
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[11px]">
            <span className="text-muted-foreground">
              Custo: <span className="font-medium">R$ {custoTotal.toFixed(2)}</span>
            </span>
            {order.precoVenda && (
              <>
                <span className="font-medium text-foreground">
                  Venda: R$ {order.precoVenda.toFixed(2)}
                </span>
                {lucro !== null && (
                  <span className={lucro >= 0 ? "text-green-600" : "text-red-500"}>
                    {lucro >= 0 ? "+" : ""}R$ {lucro.toFixed(2)}
                  </span>
                )}
              </>
            )}
          </div>
        )}
        {badge && (
          <div className="mt-2 flex items-center justify-between">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
              style={{ background: badge.color }}
            >
              {badge.label}
            </span>
            {order.valorRecebido !== undefined && (
              <span className="text-[11px] font-medium text-muted-foreground">
                R$ {order.valorRecebido.toFixed(2)}
              </span>
            )}
          </div>
        )}
        {order.formaPagamento && (
          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <CreditCard className="h-3 w-3" />
            <span className="font-medium">{order.formaPagamento}</span>
            {order.dataPagamento && (
              <span className="text-muted-foreground/70">
                · {formatIsoDatePtBr(order.dataPagamento)}
              </span>
            )}
          </div>
        )}
        {paymentBadge && (
          <Badge
            variant="outline"
            className={cn("mt-2 text-[10px] font-semibold", paymentBadge.className)}
          >
            {paymentBadge.label}
          </Badge>
        )}
        {(order.valorRecebido || order.dataPagamento) && (
          <Button
            size="sm"
            variant="ghost"
            className="mt-1 h-7 w-full gap-1 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setReceiptDialog({
                open: true,
                docType: "cnpj",
                docNumber: "",
                studioDocType: "cnpj",
                studioDocNumber: "",
                clientPhone: "",
                paid: false,
              });
            }}
          >
            <ScrollText className="h-3 w-3" />
            Recibo de Venda
          </Button>
        )}
        {order.status === "done" && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2 w-full gap-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setShowDestino(true);
            }}
          >
            <MapPin className="h-3 w-3" />
            Finalizar Destino
          </Button>
        )}
      </Card>
      <Dialog open={showDestino} onOpenChange={setShowDestino}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Destino de &quot;{order.projectName}&quot;</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Selecione o destino final desta peça:</p>
            <div className="grid gap-2">
              <Button
                variant="outline"
                className="justify-start gap-2"
                onClick={() => {
                  onFinalizar({ orderId: order.id, destino: "Dado de Presente" });
                  setShowDestino(false);
                }}
              >
                🎁 Dado de Presente
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2"
                onClick={() => {
                  onFinalizar({ orderId: order.id, destino: "Falha de Impressão" });
                  setShowDestino(false);
                }}
              >
                ❌ Falha de Impressão
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Valor recebido (R$)</Label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.01}
                placeholder="0,00"
                value={destinoValor}
                onChange={(e) => setDestinoValor(e.target.value)}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Forma de Pagamento</Label>
                  <Select value={destinoPagamento} onValueChange={setDestinoPagamento}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Data do Pagamento</Label>
                  <Input
                    type="date"
                    value={destinoDataPag}
                    onChange={(e) => setDestinoDataPag(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Ao confirmar, a venda entra na Receita Total e aparece em Finanças → aba Vendas.
              </p>
              <Button
                className="btn-filament w-full gap-2"
                disabled={!destinoValor || Number(destinoValor) <= 0}
                onClick={() => {
                  onFinalizar({
                    orderId: order.id,
                    destino: "Kurtido e Vendido",
                    valorRecebido: Number(destinoValor),
                    formaPagamento: destinoPagamento || undefined,
                    dataPagamento: destinoDataPag || undefined,
                  });
                  setShowDestino(false);
                }}
              >
                💰 Kurtido e Vendido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog
        open={receiptDialog.open}
        onOpenChange={(open) => setReceiptDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              Recibo de Venda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente</span>
                <span className="font-semibold">{order.client}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Projeto</span>
                <span className="font-medium">{order.projectName}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-display font-bold filament-text">
                  {brl(
                    order.valorRecebido ??
                      (order.precoVenda ? order.precoVenda * order.quantity : 0),
                  )}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de Documento</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={receiptDialog.docType === "cnpj" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setReceiptDialog((prev) => ({ ...prev, docType: "cnpj" }))}
                >
                  CNPJ
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={receiptDialog.docType === "cpf" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setReceiptDialog((prev) => ({ ...prev, docType: "cpf" }))}
                >
                  CPF
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Número do {receiptDialog.docType === "cnpj" ? "CNPJ" : "CPF"}
              </Label>
              <Input
                value={receiptDialog.docNumber}
                onChange={(e) =>
                  setReceiptDialog((prev) => ({ ...prev, docNumber: e.target.value }))
                }
                placeholder={
                  receiptDialog.docType === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"
                }
              />
            </div>

            {/* Kurt3D document info */}
            <div className="space-y-1.5">
              <Label className="text-xs">Documento da Kurti 3D (Vendedor)</Label>
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  size="sm"
                  variant={receiptDialog.studioDocType === "cnpj" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setReceiptDialog((prev) => ({ ...prev, studioDocType: "cnpj" }))}
                >
                  CNPJ
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={receiptDialog.studioDocType === "cpf" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setReceiptDialog((prev) => ({ ...prev, studioDocType: "cpf" }))}
                >
                  CPF
                </Button>
              </div>
              <Input
                value={receiptDialog.studioDocNumber}
                onChange={(e) =>
                  setReceiptDialog((prev) => ({ ...prev, studioDocNumber: e.target.value }))
                }
                placeholder={
                  receiptDialog.studioDocType === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"
                }
              />
            </div>

            {/* Client phone */}
            <div className="space-y-1.5">
              <Label className="text-xs">Telefone do Cliente (WhatsApp)</Label>
              <Input
                value={receiptDialog.clientPhone}
                onChange={(e) =>
                  setReceiptDialog((prev) => ({ ...prev, clientPhone: e.target.value }))
                }
                placeholder="(11) 99999-9999"
              />
            </div>

            {/* Paid toggle */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <input
                type="checkbox"
                id="rcpt-paid-pf"
                checked={receiptDialog.paid}
                onChange={(e) => setReceiptDialog((prev) => ({ ...prev, paid: e.target.checked }))}
                className="h-4 w-4 rounded accent-green-600"
              />
              <Label htmlFor="rcpt-paid-pf" className="text-sm cursor-pointer">
                Pagamento já recebido (exibe carimbo PAGO)
              </Label>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setReceiptDialog((prev) => ({ ...prev, open: false }))}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs text-green-700"
                onClick={async () => {
                  const items = [
                    {
                      description: order.projectName,
                      quantity: order.quantity,
                      unitPrice: order.valorRecebido ?? order.precoVenda ?? 0,
                      subtotal:
                        order.valorRecebido ??
                        (order.precoVenda ? order.precoVenda * order.quantity : 0),
                    },
                  ];
                  const total = items[0].subtotal;
                  const result = await saveReceipt({
                    data: {
                      type: "sale",
                      clientName: order.client,
                      items,
                      total,
                      docType: receiptDialog.docType,
                      docNumber: receiptDialog.docNumber || undefined,
                      studioDocType: receiptDialog.studioDocType,
                      studioDocNumber: receiptDialog.studioDocNumber || undefined,
                      formaPagamento: order.formaPagamento || undefined,
                      paid: receiptDialog.paid,
                      sourceType: "order",
                      sourceId: order.id,
                    },
                  });
                  if (!result.ok) {
                    toast.error("Erro ao salvar recibo.");
                    return;
                  }
                  openSaleReceiptWhatsApp({
                    clientName: order.client,
                    items,
                    docType: receiptDialog.docType,
                    docNumber: receiptDialog.docNumber,
                    studioDocType: receiptDialog.studioDocType,
                    studioDocNumber: receiptDialog.studioDocNumber,
                    formaPagamento: order.formaPagamento ?? undefined,
                    dataRecebimento: order.dataPagamento ?? undefined,
                    studioNome: orderSettings?.studioNome ?? "Kurti 3D",
                    whatsappNumero: orderSettings?.whatsappNumero ?? "",
                    clientPhone: receiptDialog.clientPhone || undefined,
                    paid: receiptDialog.paid || undefined,
                    receiptNumber: result.receiptNumber,
                  });
                }}
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </Button>
              <Button
                className="btn-filament gap-2"
                onClick={async () => {
                  const items = [
                    {
                      description: order.projectName,
                      quantity: order.quantity,
                      unitPrice: order.valorRecebido ?? order.precoVenda ?? 0,
                      subtotal:
                        order.valorRecebido ??
                        (order.precoVenda ? order.precoVenda * order.quantity : 0),
                    },
                  ];
                  const total = items[0].subtotal;
                  const result = await saveReceipt({
                    data: {
                      type: "sale",
                      clientName: order.client,
                      items,
                      total,
                      docType: receiptDialog.docType,
                      docNumber: receiptDialog.docNumber || undefined,
                      studioDocType: receiptDialog.studioDocType,
                      studioDocNumber: receiptDialog.studioDocNumber || undefined,
                      formaPagamento: order.formaPagamento || undefined,
                      paid: receiptDialog.paid,
                      sourceType: "order",
                      sourceId: order.id,
                    },
                  });
                  if (!result.ok) {
                    toast.error("Erro ao salvar recibo.");
                    return;
                  }
                  openPrintSaleReceipt({
                    clientName: order.client,
                    items,
                    docType: receiptDialog.docType,
                    docNumber: receiptDialog.docNumber,
                    studioDocType: receiptDialog.studioDocType,
                    studioDocNumber: receiptDialog.studioDocNumber,
                    formaPagamento: order.formaPagamento ?? undefined,
                    dataRecebimento: order.dataPagamento ?? undefined,
                    studioNome: orderSettings?.studioNome ?? "Kurti 3D",
                    whatsappNumero: orderSettings?.whatsappNumero ?? "",
                    clientPhone: receiptDialog.clientPhone || undefined,
                    paid: receiptDialog.paid || undefined,
                    receiptNumber: result.receiptNumber,
                  });
                  setReceiptDialog((prev) => ({ ...prev, open: false }));
                }}
              >
                <Printer className="h-4 w-4" /> Gerar Recibo
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
