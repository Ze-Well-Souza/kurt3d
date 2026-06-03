import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Clock, Package, User, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/queue")({
  head: () => ({ meta: [{ title: "Fila de Pedidos — Kurti 3D" }] }),
  component: QueuePage,
});

type Status = "todo" | "printing" | "done";

type Order = {
  id: string;
  client: string;
  project: string;
  quantity: number;
  timeMinutes: number;
  colors: string[];
  status: Status;
};

const FILAMENT_SWATCHES: Record<string, string> = {
  cyan: "var(--filament-cyan)",
  magenta: "var(--filament-magenta)",
  yellow: "var(--filament-yellow)",
  pink: "var(--filament-pink)",
  green: "var(--filament-green)",
  black: "#1a1a1a",
  white: "#f5f5f5",
  orange: "#ff8a3d",
  purple: "#8b5cf6",
};

const INITIAL: Order[] = [
  { id: "o1", client: "Marina Souza", project: "Chaveiros Toy Story", quantity: 12, timeMinutes: 270, colors: ["yellow", "cyan", "green"], status: "todo" },
  { id: "o2", client: "Pedro Lima", project: "Vaso Geométrico", quantity: 2, timeMinutes: 480, colors: ["pink", "white"], status: "todo" },
  { id: "o3", client: "Atelier Bambu", project: "Suporte de Celular", quantity: 6, timeMinutes: 180, colors: ["black", "magenta"], status: "printing" },
  { id: "o4", client: "Joana Reis", project: "Dragão Articulado", quantity: 1, timeMinutes: 600, colors: ["green", "yellow"], status: "printing" },
  { id: "o5", client: "Lucas Pereira", project: "Coração Decorativo", quantity: 20, timeMinutes: 150, colors: ["pink", "magenta", "purple"], status: "done" },
];

const COLUMNS: { id: Status; title: string; hint: string }[] = [
  { id: "todo", title: "A Fazer", hint: "Pedidos confirmados aguardando impressão" },
  { id: "printing", title: "Imprimindo", hint: "Em produção nas impressoras Bambu Lab" },
  { id: "done", title: "Concluído", hint: "Prontos para retirada ou envio" },
];

function formatTime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function ColorTags({ colors }: { colors: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {colors.map((c, i) => (
        <span
          key={`${c}-${i}`}
          title={c}
          className="h-3.5 w-3.5 rounded-full border border-border shadow-sm"
          style={{ background: FILAMENT_SWATCHES[c] ?? c }}
        />
      ))}
    </div>
  );
}

function OrderCardView({ order, dragging = false }: { order: Order; dragging?: boolean }) {
  return (
    <Card
      className={cn(
        "filament-top cursor-grab select-none border-border bg-card p-3 shadow-sm transition-shadow active:cursor-grabbing",
        dragging ? "shadow-lg ring-2 ring-ring/40" : "hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{order.project}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">{order.client}</span>
          </p>
        </div>
        <ColorTags colors={order.colors} />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Package className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{order.quantity}</span>
          un.
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{formatTime(order.timeMinutes)}</span>
        </span>
      </div>
    </Card>
  );
}

function DraggableCard({ order }: { order: Order }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: order.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn("touch-none", isDragging && "opacity-40")}
    >
      <OrderCardView order={order} />
    </div>
  );
}

function Column({ id, title, hint, orders }: { id: Status; title: string; hint: string; orders: Order[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const totalTime = orders.reduce((s, o) => s + o.timeMinutes, 0);

  return (
    <div className="flex min-w-0 flex-col">
      <div className="filament-top mb-3 rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold tracking-tight text-foreground">
            {title}
          </h3>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-xs font-semibold text-secondary-foreground">
            {orders.length}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        {orders.length > 0 && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Tempo total: <span className="font-medium text-foreground">{formatTime(totalTime)}</span>
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
          <DraggableCard key={o.id} order={o} />
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

function QueuePage() {
  const [orders, setOrders] = useState<Order[]>(INITIAL);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const grouped = useMemo(() => {
    const g: Record<Status, Order[]> = { todo: [], printing: [], done: [] };
    for (const o of orders) g[o.status].push(o);
    return g;
  }, [orders]);

  const activeOrder = activeId ? orders.find((o) => o.id === activeId) ?? null : null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const status = over.id as Status;
    if (!["todo", "printing", "done"].includes(status)) return;
    setOrders((prev) =>
      prev.map((o) => (o.id === active.id && o.status !== status ? { ...o, status } : o)),
    );
  }

  function addOrder() {
    const id = `o${Date.now()}`;
    setOrders((prev) => [
      ...prev,
      {
        id,
        client: "Novo cliente",
        project: "Novo pedido",
        quantity: 1,
        timeMinutes: 60,
        colors: ["cyan", "pink"],
        status: "todo",
      },
    ]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Fila de Pedidos</h1>
          <p className="text-sm text-muted-foreground">
            Arraste os cartões entre as colunas para atualizar o status de cada pedido.
          </p>
        </div>
        <Button onClick={addOrder} className="btn-filament gap-2">
          <Plus className="h-4 w-4" />
          Novo pedido
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {COLUMNS.map((col) => (
            <Column key={col.id} id={col.id} title={col.title} hint={col.hint} orders={grouped[col.id]} />
          ))}
        </div>

        <DragOverlay>
          {activeOrder ? (
            <div className="w-[280px]">
              <OrderCardView order={activeOrder} dragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
