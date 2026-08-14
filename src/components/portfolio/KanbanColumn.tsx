import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { Order, Filamento, AppSettings, Status } from "@/lib/domain/types";
import { DraggableCard } from "./DraggableCard";
import { formatTime, type FinalizarPedidoArgs } from "./order-card-shared";

export function KanbanColumn({
  id,
  title,
  hint,
  orders,
  onFinalizar,
  filamentos,
  onDelete,
  onDetail,
  onEdit,
  orderSettings,
  onOpenProjectReference,
}: {
  id: Status;
  title: string;
  hint: string;
  orders: Order[];
  onFinalizar: (args: FinalizarPedidoArgs) => Promise<unknown>;
  filamentos?: Filamento[];
  onDelete?: (orderId: string) => void;
  onDetail?: (order: Order) => void;
  onEdit?: (order: Order) => void;
  orderSettings?: AppSettings;
  onOpenProjectReference?: (reference?: string | null) => Promise<void> | void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const totalTime = orders.reduce((s, o) => s + o.timeMinutes, 0);
  return (
    <div className="flex min-w-0 flex-col">
      <div className="filament-top mb-3 rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold tracking-tight text-foreground">{title}</h3>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-xs font-semibold text-secondary-foreground">
            {orders.length}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        {orders.length > 0 && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Tempo total:{" "}
            <span className="font-medium text-foreground">{formatTime(totalTime)}</span>
          </p>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[400px] flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors",
          isOver ? "border-ring bg-secondary/60" : "border-border bg-secondary/30",
        )}
      >
        {orders.map((o) => (
          <DraggableCard
            key={o.id}
            order={o}
            onFinalizar={onFinalizar}
            filamentos={filamentos}
            onDelete={onDelete}
            onDetail={onDetail}
            onEdit={onEdit}
            orderSettings={orderSettings}
            onOpenProjectReference={onOpenProjectReference}
          />
        ))}
        {orders.length === 0 && (
          <p className="grid flex-1 place-items-center text-center text-xs text-muted-foreground">
            Solte um pedido aqui
          </p>
        )}
      </div>
    </div>
  );
}
