import { Clock3, CreditCard, Download, ExternalLink, Package, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { brl } from "@/lib/utils";
import { calcOrderCostHybrid } from "@/lib/domain/cost";
import { getOrderAssetFileName, isOrderAssetReference } from "@/lib/domain/order-asset";
import { computeOrderTotalsFromParts, summarizeOrderParts } from "@/lib/domain/order-parts";
import { getOrderTrackingSummary } from "@/lib/domain/order-tracking";
import { formatIsoDatePtBr } from "@/lib/domain/installments";
import { openPrintReceipt, type ReceiptInput } from "@/lib/domain/payment-receipt-print";
import type { OrderPartStatus, Status } from "@/lib/domain/types";
import { DetailItem } from "./DetailItem";
import { DialogSection } from "./DialogSection";
import { STATUS_BADGE, formatTime } from "./order-card-shared";
import { ORDER_PART_STATUS_LABEL } from "./calc-pedidos-shared";
import type { CalcPedidosCtx } from "./use-calc-pedidos-state";

export function OrderDetailDialog({ ctx }: { ctx: CalcPedidosCtx }) {
  const {
    detailOrder,
    setDetailOrder,
    filamentos,
    settings,
    updatingPartId,
    setUpdatingPartId,
    mutateUpdateOrderPartStatus,
    openProjectReference,
  } = ctx;

  return (
    <Dialog
      open={!!detailOrder}
      onOpenChange={(open) => {
        if (!open) setDetailOrder(null);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes do Pedido</DialogTitle>
        </DialogHeader>
        {detailOrder &&
          (() => {
            const fil = detailOrder.filamentoId
              ? filamentos.find((f) => f.id === detailOrder.filamentoId)
              : undefined;
            const cost = calcOrderCostHybrid({
              order: detailOrder,
              filamento: fil,
              precoVendaUnit: detailOrder.precoVenda ?? 0,
              settings,
            });
            const statusLabel =
              STATUS_BADGE[detailOrder.status]?.label ??
              (
                { todo: "A Fazer", printing: "Imprimindo", done: "Concluído" } as Partial<
                  Record<Status, string>
                >
              )[detailOrder.status] ??
              detailOrder.status;
            const tracking = getOrderTrackingSummary(detailOrder);
            const trackingPath = `/acompanhar`;
            const parts = detailOrder.parts ?? [];
            const partsSummary = summarizeOrderParts(parts);
            const partsTotals = parts.length > 0 ? computeOrderTotalsFromParts(parts) : null;
            const partStatusLocked = ["vendido", "presente", "falha"].includes(detailOrder.status);
            return (
              <div className="space-y-3">
                <DialogSection icon={Package} title="Produção">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailItem label="Projeto" value={detailOrder.projectName} />
                    <DetailItem label="Cliente" value={detailOrder.client} />
                    <DetailItem label="Quantidade" value={`${detailOrder.quantity} un.`} />
                    <DetailItem label="Tempo" value={formatTime(detailOrder.timeMinutes)} />
                    <DetailItem
                      label="Filamento"
                      value={
                        detailOrder.filamentoIds?.length
                          ? detailOrder.filamentoIds
                              .map((id) => filamentos.find((f) => f.id === id)?.label ?? id)
                              .join(", ")
                          : (fil?.label ??
                            (detailOrder.filamentoId ? `ID: ${detailOrder.filamentoId}` : "—"))
                      }
                    />
                    <DetailItem
                      label="Gramas / un."
                      value={detailOrder.gramsPerUnit ? `${detailOrder.gramsPerUnit}g` : "—"}
                    />
                    <DetailItem label="Status" value={statusLabel} />
                    <DetailItem
                      label="Multi-partes"
                      value={detailOrder.multiPart ? "Sim" : "Não"}
                    />
                    {parts.length > 0 && (
                      <DetailItem label="Partes" value={`${partsSummary.total} cadastradas`} />
                    )}
                  </div>
                </DialogSection>

                <DialogSection icon={CreditCard} title="Financeiro">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailItem
                      label="Preço de Venda"
                      value={detailOrder.precoVenda ? brl(detailOrder.precoVenda) : "—"}
                    />
                    <DetailItem label="Custo Total" value={brl(cost.total)} />
                    {detailOrder.precoVenda && (
                      <DetailItem
                        label="Lucro"
                        value={brl(detailOrder.precoVenda * detailOrder.quantity - cost.total)}
                        accent={detailOrder.precoVenda * detailOrder.quantity - cost.total >= 0}
                      />
                    )}
                    <DetailItem label="Forma Pagamento" value={detailOrder.formaPagamento ?? "—"} />
                    <DetailItem
                      label="Data Pagamento"
                      value={
                        detailOrder.dataPagamento
                          ? formatIsoDatePtBr(detailOrder.dataPagamento)
                          : "—"
                      }
                    />
                    {detailOrder.valorRecebido !== undefined && (
                      <DetailItem label="Valor Recebido" value={brl(detailOrder.valorRecebido)} />
                    )}
                    {detailOrder.destino && (
                      <DetailItem label="Destino" value={detailOrder.destino} />
                    )}
                  </div>
                </DialogSection>

                <DialogSection icon={Clock3} title="Rastreamento">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailItem
                      label="Codigo de acompanhamento"
                      value={tracking.trackingCode}
                      mono
                    />
                    <DetailItem
                      label="Previsao operacional"
                      value={
                        tracking.estimatedDeliveryAt
                          ? formatIsoDatePtBr(tracking.estimatedDeliveryAt)
                          : "—"
                      }
                    />
                    <DetailItem
                      label="Criado em"
                      value={formatIsoDatePtBr(detailOrder.createdAt)}
                    />
                    <DetailItem
                      label="Previsao de inicio"
                      value={
                        detailOrder.previsaoInicio
                          ? formatIsoDatePtBr(detailOrder.previsaoInicio)
                          : "—"
                      }
                    />
                    <DetailItem
                      label="Previsao de entrega"
                      value={
                        detailOrder.previsaoEntrega
                          ? formatIsoDatePtBr(detailOrder.previsaoEntrega)
                          : "—"
                      }
                    />
                  </div>
                </DialogSection>
                {parts.length > 0 && (
                  <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Partes do pedido</p>
                        <p className="text-xs text-muted-foreground">
                          {partsSummary.done} concluidas, {partsSummary.printing} imprimindo,{" "}
                          {partsSummary.todo} a fazer, {partsSummary.failed} com falha.
                        </p>
                      </div>
                      {partsTotals && (
                        <div className="text-xs text-muted-foreground">
                          Total:{" "}
                          <span className="font-medium text-foreground">
                            {formatTime(Math.round(partsTotals.timeMinutes))}
                          </span>
                          {" · "}
                          <span className="font-medium text-foreground">
                            {partsTotals.gramsPerUnit.toFixed(2)}g
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      {parts.map((part) => (
                        <div
                          key={part.id}
                          className="rounded-xl border border-border bg-background p-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">{part.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {part.quantity}x · {formatTime(Math.round(part.timeMinutes))}/un. ·{" "}
                                {part.gramsPerUnit.toFixed(2)}g/un.
                              </p>
                            </div>
                            <Select
                              value={part.status}
                              disabled={partStatusLocked || updatingPartId === part.id}
                              onValueChange={(value) => {
                                const nextStatus = value as OrderPartStatus;
                                setUpdatingPartId(part.id);
                                void mutateUpdateOrderPartStatus
                                  .mutateAsync({
                                    orderId: detailOrder.id,
                                    partId: part.id,
                                    status: nextStatus,
                                  })
                                  .then(() => {
                                    setDetailOrder((current) =>
                                      current && current.id === detailOrder.id
                                        ? {
                                            ...current,
                                            updatedAt: new Date().toISOString(),
                                            parts: (current.parts ?? []).map((currentPart) =>
                                              currentPart.id === part.id
                                                ? {
                                                    ...currentPart,
                                                    status: nextStatus,
                                                    updatedAt: new Date().toISOString(),
                                                  }
                                                : currentPart,
                                            ),
                                          }
                                        : current,
                                    );
                                    toast.success("Status da parte atualizado.");
                                  })
                                  .catch(() => {
                                    // handled by mutation onError
                                  })
                                  .finally(() => {
                                    setUpdatingPartId(null);
                                  });
                              }}
                            >
                              <SelectTrigger className="w-[170px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(ORDER_PART_STATUS_LABEL).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {part.notes && (
                            <p className="mt-2 text-xs text-muted-foreground">{part.notes}</p>
                          )}
                          {part.linkProjeto && (
                            <Button
                              type="button"
                              variant="ghost"
                              className="mt-2 h-auto px-0 text-xs text-blue-500 hover:text-blue-600"
                              onClick={() => void openProjectReference(part.linkProjeto)}
                            >
                              {isOrderAssetReference(part.linkProjeto) ? (
                                <Download className="mr-1 h-3 w-3" />
                              ) : (
                                <ExternalLink className="mr-1 h-3 w-3" />
                              )}
                              {isOrderAssetReference(part.linkProjeto)
                                ? `Abrir ${getOrderAssetFileName(part.linkProjeto) ?? "arquivo da parte"}`
                                : "Ver referencia da parte"}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {(detailOrder.valorRecebido || detailOrder.dataPagamento) && (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        const receiptInput: ReceiptInput = {
                          clientName: detailOrder.client,
                          projectName: detailOrder.projectName,
                          valorPago:
                            detailOrder.valorRecebido ??
                            (detailOrder.precoVenda
                              ? detailOrder.precoVenda * detailOrder.quantity
                              : 0),
                          formaPagamento: detailOrder.formaPagamento ?? "—",
                          dataPagamento: detailOrder.dataPagamento ?? detailOrder.updatedAt,
                          studioNome: settings.studioNome || "Kurti 3D",
                          whatsappNumero: settings.whatsappNumero || "",
                        };
                        openPrintReceipt(receiptInput);
                      }}
                    >
                      <Printer className="h-4 w-4" />
                      Imprimir Recibo
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      const base = typeof window !== "undefined" ? window.location.origin : "";
                      const url = `${base}${trackingPath}`;
                      const text = `Codigo: ${tracking.trackingCode}\nWhatsApp do pedido: confirme com o cliente\nAcompanhe em: ${url}`;
                      await navigator.clipboard.writeText(text);
                      toast.success("Dados de acompanhamento copiados.");
                    }}
                  >
                    Copiar acompanhamento
                  </Button>
                </div>
                {detailOrder.linkProjeto && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-fit gap-2"
                    onClick={() => void openProjectReference(detailOrder.linkProjeto)}
                  >
                    {isOrderAssetReference(detailOrder.linkProjeto) ? (
                      <Download className="h-4 w-4" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    {isOrderAssetReference(detailOrder.linkProjeto)
                      ? `Abrir ${getOrderAssetFileName(detailOrder.linkProjeto) ?? "arquivo"}`
                      : "Ver projeto"}
                  </Button>
                )}
              </div>
            );
          })()}
        <DialogFooter>
          <Button variant="outline" onClick={() => setDetailOrder(null)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
