import { ExternalLink, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DetailRow } from "@/components/admin/stock-fields";
import { PaymentSchedule } from "@/components/admin/PaymentSchedule";
import { formatIsoDatePtBr } from "@/lib/domain/installments";
import { brl } from "@/lib/utils";
import { QUALIDADE_CONFIG } from "./stock-shared";
import type { StockCtx } from "./use-stock-page-state";
import { corCompleta, corHex } from "@/lib/domain/filament-colors";

export function FilamentDetailDialog({ ctx }: { ctx: StockCtx }) {
  const {
    detailFilament,
    setDetailFilament,
    filamentos,
    filamentoPayments,
    filamentoInstallments,
    openEdit,
    mutatePayInstallment,
    mutateRevertInstallment,
    mutateSettlePayment,
    mutateUpdateInstallment,
  } = ctx;

  return (
    <Dialog open={!!detailFilament} onOpenChange={(o) => !o && setDetailFilament(null)}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Detalhes do Filamento
          </DialogTitle>
        </DialogHeader>
        {detailFilament && (
          <div className="space-y-4 py-2">
            {(() => {
              const payment = detailFilament?.paymentId
                ? filamentoPayments.find((p) => p.id === detailFilament.paymentId)
                : null;
              const insts = payment
                ? filamentoInstallments.filter((i) => i.paymentId === payment.id)
                : [];
              const dataParaPagamento =
                payment?.dataParaPagamento ??
                [...insts].sort((a, b) => a.numero - b.numero)[0]?.vencimento ??
                null;
              return (
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow label="SKU" value={detailFilament.sku} mono />
                  <DetailRow label="Material" value={detailFilament.material} />
                  <DetailRow label="Marca" value={detailFilament.marca} />
                  <DetailRow
                    label="Cor"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full border border-border"
                          style={{ background: corHex(detailFilament.cor) }}
                        />
                        {corCompleta(detailFilament.cor, detailFilament.corTom)}
                      </span>
                    }
                  />
                  <DetailRow label="Peso inicial" value={`${detailFilament.pesoInicial} g`} />
                  <DetailRow label="Preço pago" value={brl(detailFilament.precoPago)} />
                  <DetailRow
                    label="Data da compra"
                    value={formatIsoDatePtBr(detailFilament.dataCompra)}
                  />
                  <DetailRow
                    label="Data da entrega"
                    value={
                      detailFilament.dataEntrega
                        ? formatIsoDatePtBr(detailFilament.dataEntrega)
                        : "Pendente"
                    }
                  />
                  <DetailRow
                    label="Data para pagto"
                    value={dataParaPagamento ? formatIsoDatePtBr(dataParaPagamento) : "—"}
                  />
                  <DetailRow label="Onde comprou" value={detailFilament.ondeComprou || "—"} />
                  <DetailRow
                    label="Custo por grama"
                    value={brl(
                      detailFilament.pesoInicial > 0
                        ? detailFilament.precoPago / detailFilament.pesoInicial
                        : 0,
                    )}
                  />
                </div>
              );
            })()}

            <div className="space-y-1 border-t border-border pt-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Link do produto
              </div>
              {detailFilament.linkProduto ? (
                <a
                  href={detailFilament.linkProduto}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="truncate">{detailFilament.linkProduto}</span>
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">— sem link cadastrado</p>
              )}
            </div>

            {(detailFilament.observacao ?? detailFilament.comentario) && (
              <div className="space-y-1 border-t border-border pt-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Observação
                </div>
                <p className="text-sm italic text-muted-foreground">
                  "{detailFilament.observacao ?? detailFilament.comentario}"
                </p>
              </div>
            )}

            {detailFilament.qualidade && (
              <div className="space-y-1 border-t border-border pt-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Qualidade
                </div>
                <Badge
                  variant="outline"
                  className="gap-1 text-xs"
                  style={{
                    borderColor: QUALIDADE_CONFIG[detailFilament.qualidade].color,
                    color: QUALIDADE_CONFIG[detailFilament.qualidade].color,
                  }}
                >
                  {(() => {
                    const Icon = QUALIDADE_CONFIG[detailFilament.qualidade!].icon;
                    return <Icon className="h-3 w-3" />;
                  })()}
                  {QUALIDADE_CONFIG[detailFilament.qualidade].label}
                </Badge>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              <span>Quantidade cadastrada</span>
              <span className="font-semibold tabular-nums text-foreground">1 rolo</span>
            </div>

            {(() => {
              const payment = detailFilament?.paymentId
                ? filamentoPayments.find((p) => p.id === detailFilament.paymentId)
                : null;
              if (!payment) {
                return (
                  <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                    Sem plano de pagamento cadastrado.
                  </div>
                );
              }
              const insts = filamentoInstallments.filter((i) => i.paymentId === payment.id);
              const batchFils = filamentos.filter((f) => f.batchId === payment.batchId);
              return (
                <PaymentSchedule
                  payment={payment}
                  installments={insts}
                  batchFilamentos={batchFils}
                  brl={brl}
                  isPending={
                    mutatePayInstallment.isPending ||
                    mutateRevertInstallment.isPending ||
                    mutateSettlePayment.isPending ||
                    mutateUpdateInstallment.isPending
                  }
                  onPay={(input) =>
                    mutatePayInstallment.mutateAsync(input).then(() => {
                      toast.success("Parcela marcada como paga.");
                    })
                  }
                  onRevert={(id) =>
                    mutateRevertInstallment.mutateAsync(id).then(() => {
                      toast.success("Pagamento desfeito.");
                    })
                  }
                  onSettle={(input) =>
                    mutateSettlePayment.mutateAsync(input).then(() => {
                      toast.success("Todas as parcelas quitadas.");
                    })
                  }
                  onUpdateInst={(input) =>
                    mutateUpdateInstallment.mutateAsync(input).then(() => {
                      toast.success("Parcela atualizada.");
                    })
                  }
                />
              );
            })()}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setDetailFilament(null)}>
            Fechar
          </Button>
          {detailFilament && (
            <Button
              className="btn-filament gap-2"
              onClick={() => {
                const f = detailFilament;
                setDetailFilament(null);
                openEdit(f);
              }}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
