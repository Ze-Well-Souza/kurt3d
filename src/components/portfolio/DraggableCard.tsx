import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { Order, Filamento, AppSettings } from "@/lib/domain/types";
import { OrderCardView } from "./OrderCardView";
import type { FinalizarPedidoArgs } from "./order-card-shared";

export function DraggableCard({
  order,
  onFinalizar,
  filamentos,
  onDelete,
  onDetail,
  onEdit,
  orderSettings,
  onOpenProjectReference,
}: {
  order: Order;
  onFinalizar: (args: FinalizarPedidoArgs) => Promise<unknown>;
  filamentos?: Filamento[];
  onDelete?: (orderId: string) => void;
  onDetail?: (order: Order) => void;
  onEdit?: (order: Order) => void;
  orderSettings?: AppSettings;
  onOpenProjectReference?: (reference?: string | null) => Promise<void> | void;
}) {
  const isTerminal = ["vendido", "presente", "falha"].includes(order.status);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: order.id,
    disabled: isTerminal,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn("touch-none", isDragging && "opacity-40")}
    >
      <OrderCardView
        order={order}
        onFinalizar={onFinalizar}
        filamentos={filamentos}
        onDelete={onDelete}
        onDetail={onDetail}
        onEdit={onEdit}
        orderSettings={orderSettings}
        onOpenProjectReference={onOpenProjectReference}
      />
    </div>
  );
}
