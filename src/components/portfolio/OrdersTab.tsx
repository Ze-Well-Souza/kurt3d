import { CreditCard, Download, ExternalLink, Plus, Printer } from "lucide-react";
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/SearchInput";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { calcOrderCostHybrid } from "@/lib/domain/cost";
import { isOrderAssetReference } from "@/lib/domain/order-asset";
import { formatIsoDatePtBr } from "@/lib/domain/installments";
import { OrderCardView } from "./OrderCardView";
import { KanbanColumn } from "./KanbanColumn";
import { STATUS_BADGE, formatTime } from "./order-card-shared";
import { COLUMNS, HYBRID_PRINTER, PRINTERS } from "./calc-pedidos-shared";
import type { CalcPedidosCtx } from "./use-calc-pedidos-state";

export function OrdersTab({ ctx }: { ctx: CalcPedidosCtx }) {
  const {
    printingByPrinter,
    orderSearch,
    setOrderSearch,
    setShowNewOrder,
    sensors,
    setActiveId,
    mutateStatus,
    grouped,
    mutateFinalizar,
    filamentos,
    setDeleteDialog,
    setDetailOrder,
    setEditOrder,
    settings,
    openProjectReference,
    activeOrder,
    terminalOrders,
    terminalOrdersPagination,
  } = ctx;

  return (
    <div className="space-y-6">
      {/* Painel de impressoras: o que esta rodando em cada uma agora */}
      <div className="grid gap-4 sm:grid-cols-2">
        {PRINTERS.map((printer) => {
          const active = printingByPrinter.get(printer) ?? [];
          return (
            <Card key={printer} className="filament-top border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4 text-muted-foreground" />
                  <span className="font-display text-sm font-semibold">{printer}</span>
                </div>
                <Badge
                  variant="outline"
                  className={
                    active.length > 0
                      ? "border-cyan-600/30 bg-cyan-50 text-cyan-700"
                      : "border-green-600/30 bg-green-50 text-green-700"
                  }
                >
                  {active.length > 0 ? "Imprimindo" : "Livre"}
                </Badge>
              </div>
              {active.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {active.map((o) => (
                    <li key={o.id} className="text-sm">
                      <span className="font-medium">{o.projectName}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {o.client} · {formatTime(o.timeMinutes)}
                      </span>
                      {o.printer === HYBRID_PRINTER && (
                        <Badge variant="outline" className="ml-1.5 text-[10px]">
                          híbrido
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Nenhuma impressão em andamento.
                </p>
              )}
            </Card>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput value={orderSearch} onChange={setOrderSearch} placeholder="Buscar pedido..." />
        <Button onClick={() => setShowNewOrder(true)} className="btn-filament gap-2">
          <Plus className="h-4 w-4" />
          Novo pedido
        </Button>
      </div>
      <DndContext
        sensors={sensors}
        onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
        onDragEnd={(e: DragEndEvent) => {
          setActiveId(null);
          const { active, over } = e;
          if (!over) return;
          const st = String(over.id);
          if (!(["todo", "printing", "acabamento", "done"] as string[]).includes(st)) return;
          mutateStatus.mutate({
            orderId: String(active.id),
            status: st as "todo" | "printing" | "acabamento" | "done",
          });
        }}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              hint={col.hint}
              orders={grouped[col.id]}
              onFinalizar={async (args) => mutateFinalizar.mutateAsync(args)}
              filamentos={filamentos}
              onDelete={(id) => setDeleteDialog({ open: true, orderId: id, reason: "" })}
              onDetail={(o) => setDetailOrder(o)}
              onEdit={(o) => setEditOrder(o)}
              orderSettings={settings}
              onOpenProjectReference={openProjectReference}
            />
          ))}
        </div>
        <DragOverlay>
          {activeOrder ? (
            <div className="w-[280px]">
              <OrderCardView
                order={activeOrder}
                dragging
                onFinalizar={async (args) => mutateFinalizar.mutateAsync(args)}
                filamentos={filamentos}
                onDelete={(id) => setDeleteDialog({ open: true, orderId: id, reason: "" })}
                onDetail={(o) => setDetailOrder(o)}
                orderSettings={settings}
                onOpenProjectReference={openProjectReference}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {terminalOrders.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
            Histórico de Destinos
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {terminalOrdersPagination.pageRows.map((o) => {
              const fil = o.filamentoId
                ? filamentos.find((f) => f.id === o.filamentoId)
                : undefined;
              const cost = calcOrderCostHybrid({
                order: o,
                filamento: fil,
                precoVendaUnit: o.precoVenda ?? 0,
                settings,
              });
              return (
                <Card key={o.id} className="filament-top border-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{o.projectName}</p>
                      <p className="text-xs text-muted-foreground">{o.client}</p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                      style={{ background: STATUS_BADGE[o.status]?.color }}
                    >
                      {STATUS_BADGE[o.status]?.label}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Custo: R$ {cost.total.toFixed(2)}</span>
                    {o.valorRecebido !== undefined && (
                      <span className="font-medium filament-text">
                        R$ {o.valorRecebido.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {o.linkProjeto && (
                    <button
                      type="button"
                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-blue-500 hover:underline"
                      onClick={() => void openProjectReference(o.linkProjeto)}
                    >
                      {isOrderAssetReference(o.linkProjeto) ? (
                        <Download className="h-3 w-3" />
                      ) : (
                        <ExternalLink className="h-3 w-3" />
                      )}
                      {isOrderAssetReference(o.linkProjeto) ? "Arquivo" : "Projeto"}
                    </button>
                  )}
                  {o.formaPagamento && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <CreditCard className="h-3 w-3" />
                      <span>{o.formaPagamento}</span>
                      {o.dataPagamento && (
                        <span className="text-muted-foreground/70">
                          · {formatIsoDatePtBr(o.dataPagamento)}
                        </span>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
          <Card className="mt-2">
            <PaginationBar
              page={terminalOrdersPagination.page}
              totalPages={terminalOrdersPagination.totalPages}
              total={terminalOrdersPagination.total}
              pageSize={terminalOrdersPagination.pageSize}
              onPageChange={terminalOrdersPagination.setPage}
              onPageSizeChange={terminalOrdersPagination.setPageSize}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
