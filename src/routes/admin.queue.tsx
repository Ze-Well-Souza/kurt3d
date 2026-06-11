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
import { Clock, Package, User, Plus, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useOrders,
  setOrders,
  addOrder as addOrderAction,
  finalizarDestino,
  type Order,
  type Status,
} from "@/lib/store";

export const Route = createFileRoute("/admin/queue")({
  head: () => ({ meta: [{ title: "Fila de Pedidos — Kurti 3D" }] }),
  component: QueuePage,
});

const FILAMENT_SWATCHES: Record<string, string> = {  cyan: "var(--filament-cyan)",
  magenta: "var(--filament-magenta)",
  yellow: "var(--filament-yellow)",
  pink: "var(--filament-pink)",
  green: "var(--filament-green)",
  black: "#1a1a1a",
  white: "#f5f5f5",
  orange: "#ff8a3d",
  purple: "#8b5cf6",
};


const COLUMNS: { id: Status; title: string; hint: string }[] = [
  { id: "todo", title: "A Fazer", hint: "Pedidos confirmados aguardando impressão" },
  { id: "printing", title: "Imprimindo", hint: "Em produção nas impressoras Bambu Lab" },
  { id: "done", title: "Concluído", hint: "Prontos para retirada ou envio" },
];

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  vendido: { label: "Vendido", color: "var(--filament-green)" },
  presente: { label: "Presente", color: "var(--filament-yellow)" },
  falha: { label: "Falha", color: "var(--filament-magenta)" },
};

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
  const [showDestino, setShowDestino] = useState(false);
  const [destinoValor, setDestinoValor] = useState("");

  const badge = order.status in STATUS_BADGE ? STATUS_BADGE[order.status] : null;

  return (
    <>
      <Card
        className={cn(
          "filament-top select-none border-border bg-card p-3 shadow-sm transition-shadow",
          dragging ? "shadow-lg ring-2 ring-ring/40" : "hover:shadow-md",
          !badge && "cursor-grab active:cursor-grabbing",
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
            <DialogTitle>Destino de "{order.project}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Selecione o destino final desta peça:
            </p>
            <div className="grid gap-2">
              <Button
                variant="outline"
                className="justify-start gap-2"
                onClick={() => {
                  finalizarDestino(order.id, "Dado de Presente");
                  setShowDestino(false);
                }}
              >
                🎁 Dado de Presente
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2"
                onClick={() => {
                  finalizarDestino(order.id, "Falha de Impressão");
                  setShowDestino(false);
                }}
              >
                ❌ Falha de Impressão
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor-venda">Valor recebido (R$)</Label>
              <Input
                id="valor-venda"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.01}
                placeholder="0,00"
                value={destinoValor}
                onChange={(e) => setDestinoValor(e.target.value)}
              />
              <Button
                className="btn-filament w-full gap-2"
                disabled={!destinoValor || Number(destinoValor) <= 0}
                onClick={() => {
                  finalizarDestino(order.id, "Kurtido e Vendido", Number(destinoValor));
                  setShowDestino(false);
                }}
              >
                💰 Kurtido e Vendido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DraggableCard({ order }: { order: Order }) {
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
  const orders = useOrders();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const grouped = useMemo(() => {
    const g: Record<Status, Order[]> = { todo: [], printing: [], done: [], vendido: [], presente: [], falha: [] };
    for (const o of orders) g[o.status]?.push(o);
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

  function addNewOrder() {
    addOrderAction({
      id: `o${Date.now()}`,
      client: "Novo cliente",
      project: "Novo pedido",
      quantity: 1,
      timeMinutes: 60,
      colors: ["cyan", "pink"],
      status: "todo",
    });
  }

  const terminalOrders = [
    ...(grouped.vendido ?? []),
    ...(grouped.presente ?? []),
    ...(grouped.falha ?? []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Fila de Pedidos</h1>
          <p className="text-sm text-muted-foreground">
            Arraste os cartões entre as colunas para atualizar o status de cada pedido.
          </p>
        </div>
        <Button onClick={addNewOrder} className="btn-filament gap-2">
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

      {terminalOrders.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">Histórico de Destinos</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {terminalOrders.map((o) => (
              <Card key={o.id} className="filament-top border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{o.project}</p>
                    <p className="text-xs text-muted-foreground">{o.client}</p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                    style={{ background: STATUS_BADGE[o.status]?.color }}
                  >
                    {STATUS_BADGE[o.status]?.label}
                  </span>
                </div>
                {o.valorRecebido !== undefined && (
                  <p className="mt-1 text-xs font-medium filament-text">R$ {o.valorRecebido.toFixed(2)}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
