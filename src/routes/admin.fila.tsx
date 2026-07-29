import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Clock, Plus, Printer, RotateCcw, Sparkles, Weight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TimeInput } from "@/components/portfolio/TimeInput";
import { addOrder, updateOrderStatus } from "@/lib/api/data.functions";
import { useOrders } from "@/lib/hooks/use-orders";
import { useToastErrorHandler } from "@/lib/hooks/use-toast-error-handler";
import { formatTimePreview, minutesToTime } from "@/lib/domain/time-utils";
import type { Order, Status } from "@/lib/domain/types";

export const Route = createFileRoute("/admin/fila")({
  head: () => ({ meta: [{ title: "Fila de Impressão — Kurti 3D" }] }),
  component: FilaPage,
});

/* ── Impressoras do estúdio ── */
const PRINTERS = ["Bambu Lab A1", "Bambu Lab A1 Mini"] as const;

/* ── Colunas do quadro (status da fila) ── */
const COLUMNS: { id: Status; title: string; color: string }[] = [
  { id: "todo", title: "Aguardando Impressão", color: "var(--filament-yellow)" },
  { id: "printing", title: "Em Impressão", color: "var(--filament-cyan)" },
  { id: "acabamento", title: "Acabamento", color: "var(--filament-pink)" },
  { id: "done", title: "Concluído", color: "var(--filament-green)" },
];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function formatMinutes(totalMinutes: number) {
  const { hours, minutes } = minutesToTime(Math.round(totalMinutes));
  return formatTimePreview(hours, minutes);
}

/* Situação do pagamento derivada do pedido: Pago quando há data de pagamento. */
function paymentBadge(order: Order) {
  if (order.dataPagamento) {
    return <Badge variant="outline" className="border-green-600/30 bg-green-50 text-green-700">Pago</Badge>;
  }
  return <Badge variant="outline" className="border-yellow-600/30 bg-yellow-50 text-yellow-700">Pendente</Badge>;
}

const EMPTY_FORM = {
  client: "",
  projectName: "",
  printer: PRINTERS[0] as string,
  timeMinutes: 60,
  grams: "",
  preco: "",
  pago: "pendente" as "pendente" | "pago",
};

function FilaPage() {
  const qc = useQueryClient();
  const { data: ordersData, isLoading } = useOrders();
  const orders = ordersData ?? [];
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const handleError = useToastErrorHandler({ fallbackMessage: "Não foi possível concluir a operação." });

  /* ── mutações ── */
  const mutateAdd = useMutation({
    mutationFn: () =>
      addOrder({
        data: {
          client: form.client.trim(),
          projectName: form.projectName.trim(),
          quantity: 1,
          timeMinutes: Math.max(1, form.timeMinutes),
          gramsPerUnit: Number(form.grams) > 0 ? Number(form.grams) : undefined,
          precoVenda: Number(form.preco) > 0 ? Number(form.preco) : undefined,
          printer: form.printer,
          dataPagamento: form.pago === "pago" ? new Date().toISOString().slice(0, 10) : undefined,
          formaPagamento: form.pago === "pago" ? "PIX" : undefined,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Pedido registrado na fila.");
      setForm(EMPTY_FORM);
      setShowNew(false);
    },
    onError: handleError,
  });

  const mutateStatus = useMutation({
    mutationFn: (vars: { orderId: string; status: "todo" | "printing" | "acabamento" | "done" }) =>
      updateOrderStatus({ data: vars }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      if (result && "ok" in result && !result.ok) {
        toast.error("Transição de status não permitida.");
      } else {
        toast.success("Status atualizado.");
      }
    },
    onError: handleError,
  });

  /* ── agrupamento por coluna ── */
  const grouped = useMemo(() => {
    const g: Partial<Record<Status, Order[]>> = { todo: [], printing: [], acabamento: [], done: [] };
    for (const o of orders) g[o.status]?.push(o);
    return g;
  }, [orders]);

  /* ── transparência: o que está rodando em cada impressora agora ── */
  const printingByPrinter = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const p of PRINTERS) map.set(p, []);
    for (const o of grouped.printing ?? []) {
      const key = o.printer && map.has(o.printer) ? o.printer : PRINTERS[0];
      map.get(key)!.push(o);
    }
    return map;
  }, [grouped.printing]);

  const canSubmit = form.client.trim().length > 0 && form.projectName.trim().length > 0 && form.timeMinutes >= 1;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Toaster />

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Fila de Impressão</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe os pedidos do registro à entrega ({orders.length} no total)
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} className="btn-filament gap-2">
          <Plus className="h-4 w-4" />
          Novo pedido
        </Button>
      </div>

      {/* Painel de impressoras: o que está rodando agora */}
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
                  className={active.length > 0
                    ? "border-cyan-600/30 bg-cyan-50 text-cyan-700"
                    : "border-green-600/30 bg-green-50 text-green-700"}
                >
                  {active.length > 0 ? "Imprimindo" : "Livre"}
                </Badge>
              </div>
              {active.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {active.map((o) => (
                    <li key={o.id} className="text-sm">
                      <span className="font-medium">{o.projectName}</span>
                      <span className="text-muted-foreground"> · {o.client} · {formatMinutes(o.timeMinutes)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Nenhuma impressão em andamento.</p>
              )}
            </Card>
          );
        })}
      </div>

      {/* Quadro Kanban — em telas pequenas as colunas empilham */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const colOrders = grouped[col.id] ?? [];
          return (
            <div key={col.id} className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.color }} />
                  <h2 className="font-display text-sm font-semibold">{col.title}</h2>
                </div>
                <Badge variant="secondary">{colOrders.length}</Badge>
              </div>
              <div className="space-y-3">
                {isLoading && <p className="text-xs text-muted-foreground">Carregando…</p>}
                {!isLoading && colOrders.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">Sem pedidos aqui.</p>
                )}
                {colOrders.map((order) => (
                  <FilaCard
                    key={order.id}
                    order={order}
                    busy={mutateStatus.isPending}
                    onMove={(status) => mutateStatus.mutate({ orderId: order.id, status })}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de registro rápido (menos de 30 segundos) */}
      <Dialog open={showNew} onOpenChange={(open) => { if (!open) setShowNew(false); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo pedido rápido</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Cliente *</Label>
              <Input
                autoFocus
                value={form.client}
                onChange={(e) => setForm((s) => ({ ...s, client: e.target.value }))}
                placeholder="Nome do cliente"
              />
            </div>
            <div className="grid gap-2">
              <Label>Modelo / Peça *</Label>
              <Input
                value={form.projectName}
                onChange={(e) => setForm((s) => ({ ...s, projectName: e.target.value }))}
                placeholder="Ex.: Suporte de fone articulado"
              />
            </div>
            <div className="grid gap-2">
              <Label>Impressora</Label>
              <Select value={form.printer} onValueChange={(v) => setForm((s) => ({ ...s, printer: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRINTERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <TimeInput
              totalMinutes={form.timeMinutes}
              onChange={(minutes) => setForm((s) => ({ ...s, timeMinutes: minutes }))}
              label="Tempo estimado de impressão"
              tip="Tempo do fatiador. Pode ajustar depois."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Peso (g)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={form.grams}
                  onChange={(e) => setForm((s) => ({ ...s, grams: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label>Preço total (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.preco}
                  onChange={(e) => setForm((s) => ({ ...s, preco: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Pagamento</Label>
              <Select value={form.pago} onValueChange={(v) => setForm((s) => ({ ...s, pago: v as "pendente" | "pago" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button
              className="btn-filament"
              disabled={!canSubmit || mutateAdd.isPending}
              onClick={() => mutateAdd.mutate()}
            >
              {mutateAdd.isPending ? "Salvando…" : "Registrar pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Card de pedido na fila ── */
function FilaCard({ order, busy, onMove }: {
  order: Order;
  busy: boolean;
  onMove: (status: "todo" | "printing" | "acabamento" | "done") => void;
}) {
  const totalGrams = order.gramsPerUnit ? order.gramsPerUnit * order.quantity : null;
  const totalPrice = order.precoVenda ? order.precoVenda * order.quantity : null;

  return (
    <Card className="border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{order.projectName}</p>
          <p className="truncate text-xs text-muted-foreground">{order.client}</p>
        </div>
        {paymentBadge(order)}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Printer className="h-3 w-3" />
          {order.printer ?? "Sem impressora"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatMinutes(order.timeMinutes)}
        </span>
        {totalGrams !== null && (
          <span className="inline-flex items-center gap-1">
            <Weight className="h-3 w-3" />
            {totalGrams.toLocaleString("pt-BR")} g
          </span>
        )}
      </div>
      {totalPrice !== null && (
        <p className="mt-1 text-sm font-semibold filament-text">{brl(totalPrice)}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {order.status === "todo" && (
          <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" disabled={busy} onClick={() => onMove("printing")}>
            <ArrowRight className="h-3 w-3" />Iniciar impressão
          </Button>
        )}
        {order.status === "printing" && (
          <>
            <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" disabled={busy} onClick={() => onMove("acabamento")}>
              <Sparkles className="h-3 w-3" />Acabamento
            </Button>
            <Button size="sm" variant="outline" className="gap-1 text-xs" disabled={busy} onClick={() => onMove("todo")} title="Voltar para a fila">
              <RotateCcw className="h-3 w-3" />
            </Button>
          </>
        )}
        {(order.status === "printing" || order.status === "acabamento") && (
          <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" disabled={busy} onClick={() => onMove("done")}>
            <CheckCircle2 className="h-3 w-3" />Concluir
          </Button>
        )}
      </div>
    </Card>
  );
}
