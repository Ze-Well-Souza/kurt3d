import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  Clock, Package, User, Plus, MapPin, ExternalLink, Layers, CreditCard, CalendarDays,
  Trash2, Calculator, ListChecks, Eye, AlertTriangle, Pencil, Search, Info, Wand2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  listSnapshot, addOrder, finalizarDestino, updateOrderStatus, removeOrder,
  addPortfolioProject, createOrderFromPortfolio, removePortfolioProject,
  updateOrder, updatePortfolioProject,
} from "@/lib/api/data.functions";
import type { Order, Status, Filamento, AppSettings, PortfolioProject, Client } from "@/lib/domain/types";
import { DEFAULT_APP_SETTINGS } from "@/lib/domain/types";
import { SearchInput } from "@/components/SearchInput";
import { calcOrderCostHybrid } from "@/lib/domain/cost";

export const Route = createFileRoute("/admin/portfolio")({
  head: () => ({ meta: [{ title: "Calculadora e Pedidos — Kurti 3D" }] }),
  component: CalcPedidos,
});

/* ── constants ── */
const CATEGORIES = ["Chaveiro","Miniatura","Peça Mecânica","Decoração","Cosplay","Protótipo"] as const;
type Category = (typeof CATEGORIES)[number];
const PAYMENT_METHODS = ["PIX","Cartão de Crédito","Cartão de Débito","Dinheiro","Transferência"] as const;
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
const FILAMENT_SWATCHES: Record<string, string> = {
  cyan: "var(--filament-cyan)", magenta: "var(--filament-magenta)", yellow: "var(--filament-yellow)",
  pink: "var(--filament-pink)", green: "var(--filament-green)", black: "#1a1a1a",
  white: "#f5f5f5", orange: "#ff8a3d", purple: "#8b5cf6",
};

/* Bambu Lab printer presets — wattagem média durante impressão.
   Fonte: bambucostpro.com / specs oficiais Bambu Lab. */
const BAMBU_PRESETS = [
  { id: "X1C",     label: "X1-Carbon",    watts: 350 },
  { id: "X1E",     label: "X1E",          watts: 350 },
  { id: "P1S",     label: "P1S",          watts: 190 },
  { id: "P1P",     label: "P1P",          watts: 190 },
  { id: "A1",      label: "A1",           watts: 150 },
  { id: "A1Mini",  label: "A1 Mini",      watts:  60 },
] as const;
type BambuPresetId = (typeof BAMBU_PRESETS)[number]["id"];

const projectSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome").max(100),
  categoria: z.enum(CATEGORIES),
  linkModelo: z.string().url("URL inválida").or(z.literal("")).optional(),
  custoRolo: z.number().min(0.01, "Custo do rolo inválido").max(100000),
  pesoRolo: z.number().min(1, "Peso do rolo inválido").max(100000),
  pesoPeca: z.number().min(0.1, "Peso da peça inválido").max(100000),
  tempoMin: z.number().min(0).max(100000),
  quantidade: z.number().int().min(1, "Quantidade mínima 1").max(100000),
  precoVenda: z.number().min(0).max(1000000),
  perdaPercent: z.number().min(0).max(100).optional(),
});

type FormState = {
  nome: string; categoria: Category; linkModelo: string; filamentoId: string;
  custoRolo: string; pesoRolo: string; pesoPeca: string; tempoMin: string;
  quantidade: string; precoVenda: string; perdaPercent: string;
  // novos — espelham BambuCost Pro
  modeloPreset: BambuPresetId; precoImpressora: string; vidaUtilHoras: string; margemPercent: string;
};
const initialForm: FormState = {
  nome: "", categoria: "Chaveiro", linkModelo: "", filamentoId: "",
  custoRolo: "", pesoRolo: "1000", pesoPeca: "", tempoMin: "",
  quantidade: "10", precoVenda: "", perdaPercent: "0",
  modeloPreset: "A1", precoImpressora: "2999", vidaUtilHoras: "2000", margemPercent: "30",
};

function calc(p: {
  custoRolo: number; pesoRolo: number; pesoPeca: number; tempoMin: number;
  quantidade: number; precoVenda: number; perdaPercent: number;
  settings?: AppSettings;
  modeloPreset?: BambuPresetId; precoImpressora?: number; vidaUtilHoras?: number; margemPercent?: number;
}) {
  const s = p.settings ?? DEFAULT_APP_SETTINGS;
  // Energia: usa wattagem do preset (kW = W/1000) — se preset informado, sobrescreve settings
  const preset = p.modeloPreset ? BAMBU_PRESETS.find((m) => m.id === p.modeloPreset) : undefined;
  const consumoKw = preset ? preset.watts / 1000 : s.consumoKw;
  // Amortização: preço ÷ vida útil = R$/h; se não informados, usa settings
  const amortHoraCalc = (p.precoImpressora && p.vidaUtilHoras && p.vidaUtilHoras > 0)
    ? p.precoImpressora / p.vidaUtilHoras
    : s.depreciacaoHora;

  const custoFilamento = p.pesoRolo > 0 ? (p.custoRolo / p.pesoRolo) * p.pesoPeca : 0;
  const custoEnergia = (p.tempoMin / 60) * consumoKw * s.tarifaEnergiaKwh;
  const custoDepreciacao = (p.tempoMin / 60) * amortHoraCalc;
  const custoFixo = s.custoFixoUnidade;
  const custoBase = custoFilamento + custoEnergia + custoDepreciacao + custoFixo;
  const custoPerda = custoBase * ((p.perdaPercent || 0) / 100);
  const custoUnidade = custoBase + custoPerda;
  const custoLote = custoUnidade * p.quantidade;
  const receitaTotal = p.precoVenda * p.quantidade;
  const lucroLiquido = receitaTotal - custoLote;
  // Preço sugerido pela margem
  const margem = p.margemPercent ?? 0;
  const precoSugerido = custoUnidade * (1 + margem / 100);
  return { custoUnidade, custoFilamento, custoEnergia, custoDepreciacao, custoFixo, custoPerda, custoLote, receitaTotal, lucroLiquido, precoSugerido, consumoKw, amortHora: amortHoraCalc };
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
function formatTime(min: number) {
  const h = Math.floor(min / 60); const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */
function CalcPedidos() {
  const qc = useQueryClient();
  const snap = useQuery({ queryKey: ["snapshot"], queryFn: () => listSnapshot() });
  const orders = snap.data?.orders ?? [];
  const filamentos = snap.data?.filamentos ?? [];
  const projects = snap.data?.portfolio ?? [];
  const clients = snap.data?.clients ?? [];
  const settings = snap.data?.settings ?? DEFAULT_APP_SETTINGS;
  const [activeTab, setActiveTab] = useState<"calc" | "orders">("calc");
  const [form, setForm] = useState<FormState>({ ...initialForm, pesoRolo: String(settings.defaultPesoRolo), quantidade: String(settings.defaultQuantidade) });

  /* ── mutations ── */
  const mutateAddProject = useMutation({ mutationFn: (input: any) => addPortfolioProject({ data: input }), onSuccess: () => qc.invalidateQueries({ queryKey: ["snapshot"] }) });
  const mutateRemoveProject = useMutation({ mutationFn: (id: string) => removePortfolioProject({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["snapshot"] }) });
  const mutateCreateOrder = useMutation({ mutationFn: (input: { portfolioProjectId: string; client: string; quantity: number }) => createOrderFromPortfolio({ data: input }), onSuccess: () => qc.invalidateQueries({ queryKey: ["snapshot"] }) });
  const mutateStatus = useMutation({ mutationFn: (input: { orderId: string; status: "todo" | "printing" | "done" }) => updateOrderStatus({ data: input }), onSuccess: () => qc.invalidateQueries({ queryKey: ["snapshot"] }) });
  const mutateAddOrder = useMutation({ mutationFn: (input: any) => addOrder({ data: input }), onSuccess: () => qc.invalidateQueries({ queryKey: ["snapshot"] }) });
  const mutateFinalizar = useMutation({ mutationFn: (input: any) => finalizarDestino({ data: input }), onSuccess: () => qc.invalidateQueries({ queryKey: ["snapshot"] }) });
  const mutateRemoveOrder = useMutation({ mutationFn: (input: { orderId: string; reason: string }) => removeOrder({ data: input }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["snapshot"] }); toast.success("Pedido excluído."); } });
  const mutateUpdateOrder = useMutation({ mutationFn: (input: any) => updateOrder({ data: input }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["snapshot"] }); toast.success("Pedido atualizado."); }, onError: (err: any) => toast.error(err?.message ?? "Erro ao atualizar.") });
  const mutateUpdateProject = useMutation({ mutationFn: (input: any) => updatePortfolioProject({ data: input }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["snapshot"] }); toast.success("Projeto atualizado."); }, onError: (err: any) => toast.error(err?.message ?? "Erro ao atualizar.") });

  /* ── calculator state ── */
  const numeric = useMemo(() => ({
    custoRolo: Number(form.custoRolo) || 0, pesoRolo: Number(form.pesoRolo) || 0,
    pesoPeca: Number(form.pesoPeca) || 0, tempoMin: Number(form.tempoMin) || 0,
    quantidade: Number(form.quantidade) || 0, precoVenda: Number(form.precoVenda) || 0,
    perdaPercent: Number(form.perdaPercent) || 0,
    modeloPreset: form.modeloPreset,
    precoImpressora: Number(form.precoImpressora) || 0,
    vidaUtilHoras: Number(form.vidaUtilHoras) || 0,
    margemPercent: Number(form.margemPercent) || 0,
  }), [form]);
  const results = useMemo(() => calc({ ...numeric, settings }), [numeric, settings]);
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const totals = useMemo(() => projects.reduce((acc, p) => {
    const r = calc({ ...p, perdaPercent: p.perdaPercent ?? 0, settings });
    acc.lucro += r.lucroLiquido; acc.receita += r.receitaTotal; return acc;
  }, { lucro: 0, receita: 0 }), [projects, settings]);

  /* ── order dialogs ── */
  const [orderDialog, setOrderDialog] = useState<{ open: boolean; projectId: string; client: string; quantity: string }>({ open: false, projectId: "", client: "", quantity: "1" });
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newOrder, setNewOrder] = useState({ client: "", projectName: "", quantity: "1", timeMinutes: "60", filamentoId: "", gramsPerUnit: "5", linkProjeto: "", multiPart: false, precoVenda: "", formaPagamento: "", dataPagamento: "" });
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; orderId: string; reason: string }>({ open: false, orderId: "", reason: "" });
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editProject, setEditProject] = useState<PortfolioProject | null>(null);
  const [projectSearch, setProjectSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");

  /* ── drag state ── */
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const grouped = useMemo(() => {
    const g: Record<Status, Order[]> = { todo: [], printing: [], done: [], vendido: [], presente: [], falha: [] };
    const searchLower = orderSearch.toLowerCase().trim();
    for (const o of orders) {
      if (searchLower && !o.projectName.toLowerCase().includes(searchLower) && !o.client.toLowerCase().includes(searchLower)) continue;
      g[o.status]?.push(o);
    }
    return g;
  }, [orders, orderSearch]);
  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const s = projectSearch.toLowerCase().trim();
    return projects.filter((p) => p.nome.toLowerCase().includes(s) || p.categoria.toLowerCase().includes(s));
  }, [projects, projectSearch]);
  const activeOrder = activeId ? orders.find((o) => o.id === activeId) ?? null : null;
  const terminalOrders = [...(grouped.vendido ?? []), ...(grouped.presente ?? []), ...(grouped.falha ?? [])];

  /* ── handlers ── */
  function submitProject(e: React.FormEvent) {
    e.preventDefault();
    const parsed = projectSchema.safeParse({ ...form, custoRolo: Number(form.custoRolo), pesoRolo: Number(form.pesoRolo), pesoPeca: Number(form.pesoPeca), tempoMin: Number(form.tempoMin), quantidade: Number(form.quantidade), precoVenda: Number(form.precoVenda), perdaPercent: Number(form.perdaPercent) || 0, linkModelo: form.linkModelo || undefined });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos"); return; }
    mutateAddProject.mutate({ ...parsed.data, filamentoId: form.filamentoId || undefined });
    setForm(initialForm);
    toast.success("Projeto salvo.");
  }
  function submitNewOrder(e: React.FormEvent) {
    e.preventDefault();
    mutateAddOrder.mutate({
      client: newOrder.client.trim() || "Cliente", projectName: newOrder.projectName.trim() || "Pedido",
      quantity: Number(newOrder.quantity) || 1, timeMinutes: Number(newOrder.timeMinutes) || 60,
      filamentoId: newOrder.filamentoId || undefined, gramsPerUnit: newOrder.gramsPerUnit ? Number(newOrder.gramsPerUnit) : undefined,
      linkProjeto: newOrder.linkProjeto || undefined, multiPart: newOrder.multiPart,
      precoVenda: newOrder.precoVenda ? Number(newOrder.precoVenda) : undefined,
      formaPagamento: newOrder.formaPagamento || undefined, dataPagamento: newOrder.dataPagamento || undefined,
    });
    setShowNewOrder(false);
    setNewOrder({ client: "", projectName: "", quantity: "1", timeMinutes: "60", filamentoId: "", gramsPerUnit: "5", linkProjeto: "", multiPart: false, precoVenda: "", formaPagamento: "", dataPagamento: "" });
  }

  /* ═══════════ JSX ═══════════ */
  return (
    <div className="space-y-6">
      <Toaster />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Calculadora e Pedidos</h1>
          <p className="text-sm text-muted-foreground">Calcule custos, salve projetos e gerencie sua fila de produção.</p>
        </div>
        <div className="flex gap-6 text-sm">
          <div><div className="text-xs uppercase tracking-wider text-muted-foreground">Lucro acumulado</div><div className="font-display text-xl font-bold filament-text">{brl(totals.lucro)}</div></div>
          <div><div className="text-xs uppercase tracking-wider text-muted-foreground">Projetos</div><div className="font-display text-xl font-bold">{projects.length}</div></div>
          <div><div className="text-xs uppercase tracking-wider text-muted-foreground">Pedidos ativos</div><div className="font-display text-xl font-bold">{orders.filter((o) => ["todo","printing","done"].includes(o.status)).length}</div></div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
        <button className={cn("flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors", activeTab === "calc" ? "bg-background text-foreground shadow-sm filament-text" : "text-muted-foreground hover:text-foreground")} onClick={() => setActiveTab("calc")}>
          <Calculator className="h-4 w-4" /> Calculadora
        </button>
        <button className={cn("flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors", activeTab === "orders" ? "bg-background text-foreground shadow-sm filament-text" : "text-muted-foreground hover:text-foreground")} onClick={() => setActiveTab("orders")}>
          <ListChecks className="h-4 w-4" /> Pedidos
          {orders.filter((o) => ["todo","printing","done"].includes(o.status)).length > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-bold">{orders.filter((o) => ["todo","printing","done"].includes(o.status)).length}</span>
          )}
        </button>
      </div>

      {activeTab === "calc" ? renderCalculatorTab() : renderOrdersTab()}

      {/* ── Create Order from Portfolio dialog ── */}
      <Dialog open={orderDialog.open} onOpenChange={(open) => setOrderDialog((s) => ({ ...s, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Criar pedido</DialogTitle></DialogHeader>
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); mutateCreateOrder.mutate({ portfolioProjectId: orderDialog.projectId, client: orderDialog.client.trim() || "Cliente", quantity: Number(orderDialog.quantity) || 1 }); setOrderDialog((s) => ({ ...s, open: false })); toast.success("Pedido criado na fila."); }}>
            <div className="grid gap-2"><Label>Cliente</Label><Input value={orderDialog.client} onChange={(e) => setOrderDialog((s) => ({ ...s, client: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Quantidade</Label><Input type="number" min={1} value={orderDialog.quantity} onChange={(e) => setOrderDialog((s) => ({ ...s, quantity: e.target.value }))} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOrderDialog((s) => ({ ...s, open: false }))}>Cancelar</Button>
              <Button type="submit" className="btn-filament">Criar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── New Order dialog ── */}
      <Dialog open={showNewOrder} onOpenChange={setShowNewOrder}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Novo pedido</DialogTitle></DialogHeader>
          <form className="grid gap-4" onSubmit={submitNewOrder}>
            <div className="grid gap-2"><Label>Cliente</Label><Input value={newOrder.client} onChange={(e) => setNewOrder((s) => ({ ...s, client: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Projeto</Label><Input value={newOrder.projectName} onChange={(e) => setNewOrder((s) => ({ ...s, projectName: e.target.value }))} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Quantidade</Label><Input type="number" min={1} value={newOrder.quantity} onChange={(e) => setNewOrder((s) => ({ ...s, quantity: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Tempo (min)</Label><Input type="number" min={1} value={newOrder.timeMinutes} onChange={(e) => setNewOrder((s) => ({ ...s, timeMinutes: e.target.value }))} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Filamento</Label>
                <Select value={newOrder.filamentoId} onValueChange={(v) => setNewOrder((s) => ({ ...s, filamentoId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{filamentos.map((f) => (<SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Gramas / unidade</Label><Input type="number" min={0} value={newOrder.gramsPerUnit} onChange={(e) => setNewOrder((s) => ({ ...s, gramsPerUnit: e.target.value }))} /></div>
            </div>
            <div className="grid gap-2"><Label>Link do Projeto (opcional)</Label><Input type="url" value={newOrder.linkProjeto} onChange={(e) => setNewOrder((s) => ({ ...s, linkProjeto: e.target.value }))} placeholder="https://..." /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Preço de Venda (R$)</Label><Input type="number" min={0} step={0.01} value={newOrder.precoVenda} onChange={(e) => setNewOrder((s) => ({ ...s, precoVenda: e.target.value }))} placeholder="0,00" /></div>
              <div className="flex items-end"><Button type="button" variant={newOrder.multiPart ? "default" : "outline"} className="flex-1 gap-2" onClick={() => setNewOrder((s) => ({ ...s, multiPart: !s.multiPart }))}><Layers className="h-4 w-4" />{newOrder.multiPart ? "Multi-partes" : "Peça única"}</Button></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Forma de Pagamento</Label>
                <Select value={newOrder.formaPagamento} onValueChange={(v) => setNewOrder((s) => ({ ...s, formaPagamento: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Data do Pagamento</Label><Input type="date" value={newOrder.dataPagamento} onChange={(e) => setNewOrder((s) => ({ ...s, dataPagamento: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewOrder(false)}>Cancelar</Button>
              <Button type="submit" className="btn-filament">Criar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Order Detail dialog ── */}
      <Dialog open={!!detailOrder} onOpenChange={(open) => { if (!open) setDetailOrder(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Detalhes do Pedido</DialogTitle></DialogHeader>
          {detailOrder && (() => {
            const fil = detailOrder.filamentoId ? filamentos.find((f) => f.id === detailOrder.filamentoId) : undefined;
            const cost = calcOrderCostHybrid({ order: detailOrder, filamento: fil, precoVendaUnit: detailOrder.precoVenda ?? 0, settings });
            const statusLabel = STATUS_BADGE[detailOrder.status]?.label ?? ({ todo: "A Fazer", printing: "Imprimindo", done: "Concluído" } as any)[detailOrder.status] ?? detailOrder.status;
            return (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Projeto" value={detailOrder.projectName} />
                  <DetailItem label="Cliente" value={detailOrder.client} />
                  <DetailItem label="Quantidade" value={`${detailOrder.quantity} un.`} />
                  <DetailItem label="Tempo" value={formatTime(detailOrder.timeMinutes)} />
                  <DetailItem label="Filamento" value={fil?.label ?? (detailOrder.filamentoId ? `ID: ${detailOrder.filamentoId}` : "—")} />
                  <DetailItem label="Gramas / un." value={detailOrder.gramsPerUnit ? `${detailOrder.gramsPerUnit}g` : "—"} />
                  <DetailItem label="Status" value={statusLabel} />
                  <DetailItem label="Multi-partes" value={detailOrder.multiPart ? "Sim" : "Não"} />
                  <DetailItem label="Preço de Venda" value={detailOrder.precoVenda ? brl(detailOrder.precoVenda) : "—"} />
                  <DetailItem label="Custo Total" value={brl(cost.total)} />
                  {detailOrder.precoVenda && <DetailItem label="Lucro" value={brl((detailOrder.precoVenda * detailOrder.quantity) - cost.total)} accent={(detailOrder.precoVenda * detailOrder.quantity) - cost.total >= 0} />}
                  <DetailItem label="Forma Pagamento" value={detailOrder.formaPagamento ?? "—"} />
                  <DetailItem label="Data Pagamento" value={detailOrder.dataPagamento ? new Date(detailOrder.dataPagamento).toLocaleDateString("pt-BR") : "—"} />
                  {detailOrder.valorRecebido !== undefined && <DetailItem label="Valor Recebido" value={brl(detailOrder.valorRecebido)} />}
                  {detailOrder.destino && <DetailItem label="Destino" value={detailOrder.destino} />}
                  <DetailItem label="Criado em" value={new Date(detailOrder.createdAt).toLocaleDateString("pt-BR")} />
                </div>
                {detailOrder.linkProjeto && (
                  <a href={detailOrder.linkProjeto} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 hover:underline">
                    <ExternalLink className="h-4 w-4" /> Ver projeto
                  </a>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOrder(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Order dialog ── */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog((s) => ({ ...s, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Excluir Pedido</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.</p>
            <div className="grid gap-2">
              <Label>Motivo da exclusão *</Label>
              <Textarea rows={3} placeholder="Informe o motivo..." value={deleteDialog.reason} onChange={(e) => setDeleteDialog((s) => ({ ...s, reason: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog((s) => ({ ...s, open: false, reason: "" }))}>Cancelar</Button>
            <Button variant="destructive" disabled={!deleteDialog.reason.trim()} onClick={() => { mutateRemoveOrder.mutate({ orderId: deleteDialog.orderId, reason: deleteDialog.reason }); setDeleteDialog({ open: false, orderId: "", reason: "" }); }}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Order dialog ── */}
      <Dialog open={!!editOrder} onOpenChange={(open) => { if (!open) setEditOrder(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Editar Pedido</DialogTitle></DialogHeader>
          {editOrder && (
            <form className="grid gap-4" onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              mutateUpdateOrder.mutate({
                orderId: editOrder.id,
                client: (fd.get("client") as string)?.trim() || editOrder.client,
                projectName: (fd.get("projectName") as string)?.trim() || editOrder.projectName,
                quantity: Number(fd.get("quantity")) || editOrder.quantity,
                timeMinutes: Number(fd.get("timeMinutes")) || editOrder.timeMinutes,
                filamentoId: (fd.get("filamentoId") as string) || null,
                gramsPerUnit: Number(fd.get("gramsPerUnit")) || null,
                precoVenda: Number(fd.get("precoVenda")) || null,
                linkProjeto: (fd.get("linkProjeto") as string) || null,
                multiPart: fd.get("multiPart") === "on",
                formaPagamento: (fd.get("formaPagamento") as string) || null,
                dataPagamento: (fd.get("dataPagamento") as string) || null,
                clientId: (fd.get("clientId") as string) || null,
              });
              setEditOrder(null);
            }}>
              <div className="grid gap-2"><Label>Cliente</Label>
                <Input name="client" defaultValue={editOrder.client} />
              </div>
              <div className="grid gap-2"><Label>Projeto</Label>
                <Input name="projectName" defaultValue={editOrder.projectName} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2"><Label>Quantidade</Label><Input name="quantity" type="number" min={1} defaultValue={editOrder.quantity} /></div>
                <div className="grid gap-2"><Label>Tempo (min)</Label><Input name="timeMinutes" type="number" min={1} defaultValue={editOrder.timeMinutes} /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2"><Label>Filamento</Label>
                  <Select name="filamentoId" defaultValue={editOrder.filamentoId ?? ""}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{filamentos.map((f) => (<SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>Gramas / unidade</Label><Input name="gramsPerUnit" type="number" min={0} defaultValue={editOrder.gramsPerUnit ?? ""} /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2"><Label>Preço de Venda (R$)</Label><Input name="precoVenda" type="number" min={0} step={0.01} defaultValue={editOrder.precoVenda ?? ""} /></div>
                <div className="grid gap-2"><Label>Link do Projeto</Label><Input name="linkProjeto" type="url" defaultValue={editOrder.linkProjeto ?? ""} /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2"><Label>Forma de Pagamento</Label>
                  <Select name="formaPagamento" defaultValue={editOrder.formaPagamento ?? ""}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>Data do Pagamento</Label><Input name="dataPagamento" type="date" defaultValue={editOrder.dataPagamento ?? ""} /></div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOrder(null)}>Cancelar</Button>
                <Button type="submit" className="btn-filament" disabled={mutateUpdateOrder.isPending}>{mutateUpdateOrder.isPending ? "Salvando..." : "Salvar"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Project dialog ── */}
      <Dialog open={!!editProject} onOpenChange={(open) => { if (!open) setEditProject(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Editar Projeto</DialogTitle></DialogHeader>
          {editProject && (
            <form className="grid gap-4" onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              mutateUpdateProject.mutate({
                id: editProject.id,
                nome: (fd.get("nome") as string)?.trim() || editProject.nome,
                categoria: (fd.get("categoria") as string) || editProject.categoria,
                linkModelo: (fd.get("linkModelo") as string) || null,
                filamentoId: (fd.get("filamentoId") as string) || null,
                custoRolo: Number(fd.get("custoRolo")) || editProject.custoRolo,
                pesoRolo: Number(fd.get("pesoRolo")) || editProject.pesoRolo,
                pesoPeca: Number(fd.get("pesoPeca")) || editProject.pesoPeca,
                tempoMin: Number(fd.get("tempoMin")) || editProject.tempoMin,
                quantidade: Number(fd.get("quantidade")) || editProject.quantidade,
                precoVenda: Number(fd.get("precoVenda")) || editProject.precoVenda,
                perdaPercent: Number(fd.get("perdaPercent")) || 0,
              });
              setEditProject(null);
            }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2"><Label>Nome</Label><Input name="nome" defaultValue={editProject.nome} /></div>
                <div className="grid gap-2"><Label>Categoria</Label>
                  <Select name="categoria" defaultValue={editProject.categoria}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2"><Label>Link do Modelo</Label><Input name="linkModelo" type="url" defaultValue={editProject.linkModelo ?? ""} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2"><Label>Custo do Rolo (R$)</Label><Input name="custoRolo" type="number" step={0.01} defaultValue={editProject.custoRolo} /></div>
                <div className="grid gap-2"><Label>Peso do Rolo (g)</Label><Input name="pesoRolo" type="number" defaultValue={editProject.pesoRolo} /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2"><Label>Peso Peça (g)</Label><Input name="pesoPeca" type="number" step={0.01} defaultValue={editProject.pesoPeca} /></div>
                <div className="grid gap-2"><Label>Tempo (min)</Label><Input name="tempoMin" type="number" defaultValue={editProject.tempoMin} /></div>
                <div className="grid gap-2"><Label>Quantidade</Label><Input name="quantidade" type="number" min={1} defaultValue={editProject.quantidade} /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2"><Label>Preço Venda (R$)</Label><Input name="precoVenda" type="number" step={0.01} defaultValue={editProject.precoVenda} /></div>
                <div className="grid gap-2"><Label>% Desperdício</Label><Input name="perdaPercent" type="number" step={1} defaultValue={editProject.perdaPercent ?? 0} /></div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditProject(null)}>Cancelar</Button>
                <Button type="submit" className="btn-filament" disabled={mutateUpdateProject.isPending}>{mutateUpdateProject.isPending ? "Salvando..." : "Salvar"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  /* ═══════════ CALCULATOR TAB ═══════════ */
  function renderCalculatorTab() {
    return (
      <div className="space-y-8">
      <TooltipProvider delayDuration={150}>
      <div className="space-y-8">
        {/* Form + Results */}
        <form onSubmit={submitProject} className="filament-top space-y-6 rounded-2xl border border-border bg-card p-6">
          {/* ── Bloco 1: Identificação do projeto ── */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Nome do Projeto" tip="Como esse modelo será identificado nos pedidos e relatórios. Ex.: 'Chaveiro logo Bambu'." className="md:col-span-2"><Input value={form.nome} onChange={(e) => setField("nome", e.target.value)} placeholder="Chaveiro logo Bambu" maxLength={100} /></Field>
            <Field label="Categoria" tip="Tipo da peça — usado para agrupar nos relatórios. Ex.: Chaveiro, Miniatura, Decoração." className="md:col-span-2">
              <Select value={form.categoria} onValueChange={(v) => setField("categoria", v as Category)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
              </Select>
            </Field>
            <Field label="Link do Modelo (MakerWorld/STL)" tip="URL do modelo 3D (MakerWorld, Printables, Thingiverse). Opcional — facilita reimprimir depois." className="md:col-span-2"><Input value={form.linkModelo} onChange={(e) => setField("linkModelo", e.target.value)} placeholder="https://makerworld.com/en/models/..." type="url" /></Field>
            <Field label="Filamento (Rolo)" tip="Selecione um rolo do seu estoque para preencher automaticamente Custo do Rolo e Peso do Rolo." className="md:col-span-2">
              <Select value={form.filamentoId} onValueChange={(v) => { setField("filamentoId", v); const f = filamentos.find((x) => x.id === v); if (f) { setField("custoRolo", String(f.precoPago)); setField("pesoRolo", String(f.pesoInicial)); } }}>
                <SelectTrigger><SelectValue placeholder="Selecione o rolo" /></SelectTrigger>
                <SelectContent>{filamentos.map((f) => (<SelectItem key={f.id} value={f.id}>[{f.sku}] {f.marca} - {f.cor} (Restam {f.pesoAtual}g)</SelectItem>))}</SelectContent>
              </Select>
            </Field>
          </div>

          {/* ── Bloco 2: Impressora (preset Bambu Lab) ── */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Calculator className="h-3.5 w-3.5" /> Impressora e Amortização
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <Field label="Modelo Bambu Lab" tip="Preset oficial Bambu Lab. Define a wattagem usada no cálculo de energia. Ex.: A1 = 150W, X1-Carbon = 350W.">
                <Select value={form.modeloPreset} onValueChange={(v) => setField("modeloPreset", v as BambuPresetId)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BAMBU_PRESETS.map((m) => (<SelectItem key={m.id} value={m.id}>{m.label} — {m.watts}W</SelectItem>))}</SelectContent>
                </Select>
              </Field>
              <NumberField label="Preço da Impressora (R$)" value={form.precoImpressora} onChange={(v) => setField("precoImpressora", v)} placeholder="2999,00" tip="Quanto você pagou pela impressora. Usado para calcular a amortização (desgaste) por hora. Ex.: A1 ≈ R$ 2.999." />
              <NumberField label="Vida Útil (horas)" value={form.vidaUtilHoras} onChange={(v) => setField("vidaUtilHoras", v)} placeholder="2000" step="100" tip="Quantas horas você espera que a impressora dure antes de precisar trocar partes principais. Padrão: 2000h (~2-3 anos de uso intenso)." />
              <NumberField label="% Margem de Lucro" value={form.margemPercent} onChange={(v) => setField("margemPercent", v)} placeholder="30" step="1" tip="Percentual de lucro sobre o custo. Ex.: custo R$ 2, margem 30% → preço sugerido R$ 2,60. O bambucostpro.com usa 30% como padrão." />
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Amortização calculada: <strong className="filament-text">{brl(results.amortHora)}/h</strong> (Preço ÷ Vida útil) · Consumo: <strong>{(results.consumoKw * 1000).toFixed(0)}W</strong>
            </p>
          </div>

          {/* ── Bloco 3: Filamento, peça e lote ── */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <NumberField label="Custo do Rolo (R$)" value={form.custoRolo} onChange={(v) => setField("custoRolo", v)} placeholder="120,00" tip="Quanto você pagou pelo rolo inteiro de filamento. Ex.: R$ 120 por um rolo Creality PLA de 1kg." />
            <NumberField label="Peso do Rolo (g)" value={form.pesoRolo} onChange={(v) => setField("pesoRolo", v)} placeholder="1000" tip="Peso total do rolo cheio. Padrão: 1000g (1kg). Verifique a embalagem do filamento." />
            <NumberField label="Peso da Peça (g)" value={form.pesoPeca} onChange={(v) => setField("pesoPeca", v)} placeholder="6" tip="Quanto pesa UMA peça depois de impressa. Olhe no Bambu Studio / OrcaSlicer no painel à direita, em 'Filament'. Ex.: chaveiro = 6g." />
            <NumberField label="Tempo de Impressão (min)" value={form.tempoMin} onChange={(v) => setField("tempoMin", v)} placeholder="35" tip="Tempo total de UMA impressão (não importa se é 1 peça ou várias na mesma placa). Veja no Bambu Studio, canto inferior direito, antes de enviar. Ex.: 35min." />
            <NumberField label="Quantidade do Lote" value={form.quantidade} onChange={(v) => setField("quantidade", v)} placeholder="20" step="1" tip="Quantas peças TOTAIS você vai produzir desse projeto (somando todas as sessões de impressão, se forem várias). Ex.: 20 chaveiros vendidos = quantidade 20, mesmo que você imprima 5 por vez em 4 sessões." />
            <NumberField label="% Desperdício" value={form.perdaPercent} onChange={(v) => setField("perdaPercent", v)} placeholder="0" step="1" tip="Percentual estimado de impressões que falham, descolam ou saem com defeito. Comece com 0%. Depois de imprimir um tempo, se 1 em 20 falha = 5%. Cobre prejuízos no preço final." />
            <div className="lg:col-span-2">
              <NumberField label="Preço de Venda (R$)" value={form.precoVenda} onChange={(v) => setField("precoVenda", v)} placeholder="15,00" tip="Quanto você cobra por UMA peça. Use o 'Aplicar sugerido' ao lado para preencher automaticamente com base na sua margem." />
            </div>
          </div>

          {/* Results */}
          <div className="grid gap-4 rounded-xl border border-border bg-muted/40 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <ResultCard label="Custo Filamento /un." value={brl(results.custoFilamento)} accent="cyan" tip="Filamento usado em UMA peça × preço por grama. Fórmula: (Custo do Rolo ÷ Peso do Rolo) × Peso da Peça." />
            <ResultCard label="Energia + Depreciação" value={brl(results.custoEnergia + results.custoDepreciacao)} accent="yellow" tip="Energia elétrica gasta na impressão + desgaste da máquina (amortização). Por peça." />
            <ResultCard label="Desperdício" value={brl(results.custoPerda)} accent="pink" tip="Acréscimo de custo para cobrir as impressões que falham. Calculado como % do custo base." />
            <ResultCard label="Custo Total do Lote" value={brl(results.custoLote)} accent="pink" tip="Custo por peça × Quantidade do Lote. É o quanto você gasta para produzir o lote inteiro." />
            <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4">
              <div aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: ACCENT_COLORS.green }} />
              <div className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
                Preço Sugerido <InfoTip text={`Custo por unidade + ${form.margemPercent || 0}% de margem. Clique em Aplicar para usar como Preço de Venda.`} />
              </div>
              <div className="mt-2 font-display text-2xl font-bold tabular-nums" style={{ color: ACCENT_COLORS.green }}>{brl(results.precoSugerido)}</div>
              <Button type="button" size="sm" variant="outline" className="mt-2 h-7 gap-1 text-xs" onClick={() => setField("precoVenda", results.precoSugerido.toFixed(2))}>
                <Wand2 className="h-3 w-3" /> Aplicar
              </Button>
            </div>
            <ResultCard label="Lucro Líquido" value={brl(results.lucroLiquido)} accent={results.lucroLiquido >= 0 ? "green" : "magenta"} emphasize tip="Receita Total − Custo Total do Lote. Negativo = você está pagando para trabalhar." />
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="lg" className="btn-filament gap-2 px-6"><Plus className="h-4 w-4" /> Salvar Projeto</Button>
          </div>
        </form>

        {/* Saved Projects */}
        <div className="filament-top rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-display text-lg font-semibold">Projetos salvos</h2>
            <div className="flex items-center gap-3">
              <SearchInput value={projectSearch} onChange={setProjectSearch} placeholder="Buscar projeto..." />
              <span className="text-xs text-muted-foreground">{filteredProjects.length} de {projects.length}</span>
            </div>
          </div>
          {projects.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">Nenhum projeto ainda. Calcule e salve seu primeiro lote acima.</div>
          ) : filteredProjects.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">Nenhum projeto encontrado para “{projectSearch}”.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead><TableHead>Categoria</TableHead><TableHead>Modelo</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead><TableHead className="text-right">Custo/un.</TableHead>
                  <TableHead className="text-right">Perda</TableHead><TableHead className="text-right">Custo lote</TableHead>
                  <TableHead className="text-right">Receita</TableHead><TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="w-40" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((p) => {
                  const r = calc({ ...p, perdaPercent: p.perdaPercent ?? 0, settings });
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell><Badge variant="secondary">{p.categoria}</Badge></TableCell>
                      <TableCell>{p.linkModelo ? (<a href={p.linkModelo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /><span className="hidden sm:inline">Ver modelo</span></a>) : (<span className="text-xs text-muted-foreground">—</span>)}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.quantidade}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{brl(r.custoUnidade)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{p.perdaPercent ? `${p.perdaPercent}%` : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{brl(r.custoLote)}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(r.receitaTotal)}</TableCell>
                      <TableCell className={cn("text-right tabular-nums font-semibold", r.lucroLiquido >= 0 ? "filament-text" : "text-destructive")}>{brl(r.lucroLiquido)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => setOrderDialog({ open: true, projectId: p.id, client: "", quantity: String(p.quantidade ?? 1) })}>Criar pedido</Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditProject(p)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => mutateRemoveProject.mutate(p.id)} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════ ORDERS TAB ═══════════ */
  function renderOrdersTab() {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchInput value={orderSearch} onChange={setOrderSearch} placeholder="Buscar pedido..." />
          <Button onClick={() => setShowNewOrder(true)} className="btn-filament gap-2"><Plus className="h-4 w-4" />Novo pedido</Button>
        </div>
        <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))} onDragEnd={(e: DragEndEvent) => { setActiveId(null); const { active, over } = e; if (!over) return; const st = String(over.id); if (!["todo","printing","done"].includes(st)) return; mutateStatus.mutate({ orderId: String(active.id), status: st as "todo" | "printing" | "done" }); }}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {COLUMNS.map((col) => (
              <KanbanColumn key={col.id} id={col.id} title={col.title} hint={col.hint} orders={grouped[col.id]}
                onFinalizar={async (args) => mutateFinalizar.mutateAsync(args)} filamentos={filamentos}
                onDelete={(id) => setDeleteDialog({ open: true, orderId: id, reason: "" })}
                onDetail={(o) => setDetailOrder(o)} onEdit={(o) => setEditOrder(o)} orderSettings={settings} />
            ))}
          </div>
          <DragOverlay>{activeOrder ? (<div className="w-[280px]"><OrderCardView order={activeOrder} dragging onFinalizar={async (args) => mutateFinalizar.mutateAsync(args)} filamentos={filamentos} onDelete={(id) => setDeleteDialog({ open: true, orderId: id, reason: "" })} onDetail={(o) => setDetailOrder(o)} orderSettings={settings} /></div>) : null}</DragOverlay>
        </DndContext>
        {terminalOrders.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">Histórico de Destinos</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {terminalOrders.map((o) => {
                const fil = o.filamentoId ? filamentos.find((f) => f.id === o.filamentoId) : undefined;
                const cost = calcOrderCostHybrid({ order: o, filamento: fil, precoVendaUnit: o.precoVenda ?? 0, settings });
                return (
                  <Card key={o.id} className="filament-top border-border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0"><p className="truncate text-sm font-semibold">{o.projectName}</p><p className="text-xs text-muted-foreground">{o.client}</p></div>
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: STATUS_BADGE[o.status]?.color }}>{STATUS_BADGE[o.status]?.label}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Custo: R$ {cost.total.toFixed(2)}</span>
                      {o.valorRecebido !== undefined && (<span className="font-medium filament-text">R$ {o.valorRecebido.toFixed(2)}</span>)}
                    </div>
                    {o.linkProjeto && (<a href={o.linkProjeto} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-blue-500 hover:underline"><ExternalLink className="h-3 w-3" />Projeto</a>)}
                    {o.formaPagamento && (<div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><CreditCard className="h-3 w-3" /><span>{o.formaPagamento}</span>{o.dataPagamento && (<span className="text-muted-foreground/70">· {new Date(o.dataPagamento).toLocaleDateString("pt-BR")}</span>)}</div>)}
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
}

/* ═══════════════════════ SHARED COMPONENTS ═══════════════════════ */

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-2 ${className}`}><Label>{label}</Label>{children}</div>;
}

function NumberField({ label, value, onChange, placeholder, step = "0.01" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; step?: string }) {
  return <Field label={label}><Input type="number" inputMode="decimal" min={0} step={step} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></Field>;
}

const ACCENT_COLORS: Record<string, string> = { cyan: "#5fa8a3", green: "#8aab6e", yellow: "#e0a93b", pink: "#d98ca0", magenta: "#8a3a52" };

function ResultCard({ label, value, accent, emphasize = false }: { label: string; value: string; accent: keyof typeof ACCENT_COLORS; emphasize?: boolean }) {
  const color = ACCENT_COLORS[accent];
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4" style={{ boxShadow: `0 8px 24px -16px ${color}` }}>
      <div aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display font-bold tabular-nums ${emphasize ? "text-3xl" : "text-2xl"}`} style={emphasize ? undefined : { color }}>
        {emphasize ? <span className="filament-text">{value}</span> : value}
      </div>
    </div>
  );
}

function FilamentTag({ label, color }: { label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span title={label} className="h-3.5 w-3.5 rounded-full border border-border shadow-sm" style={{ background: color ?? "var(--filament-cyan)" }} />
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

function OrderCardView({ order, dragging = false, onFinalizar, filamentos, onDelete, onDetail, onEdit, orderSettings }: {
  order: Order; dragging?: boolean;
  onFinalizar: (args: { orderId: string; destino: string; valorRecebido?: number; formaPagamento?: string; dataPagamento?: string }) => Promise<unknown>;
  filamentos?: Filamento[];
  onDelete?: (orderId: string) => void;
  onDetail?: (order: Order) => void;
  onEdit?: (order: Order) => void;
  orderSettings?: AppSettings;
}) {
  const [showDestino, setShowDestino] = useState(false);
  const [destinoValor, setDestinoValor] = useState("");
  const [destinoPagamento, setDestinoPagamento] = useState("");
  const [destinoDataPag, setDestinoDataPag] = useState("");
  const badge = order.status in STATUS_BADGE ? STATUS_BADGE[order.status] : null;
  const filamento = order.filamentoId ? filamentos?.find((f) => f.id === order.filamentoId) : undefined;
  const costResult = calcOrderCostHybrid({ order, filamento, precoVendaUnit: order.precoVenda ?? 0, settings: orderSettings });
  const custoTotal = costResult.total;
  const lucro = order.precoVenda ? (order.precoVenda * order.quantity) - custoTotal : null;

  return (
    <>
      <Card className={cn("filament-top select-none border-border bg-card p-3 shadow-sm transition-shadow", dragging ? "shadow-lg ring-2 ring-ring/40" : "hover:shadow-md", !badge && "cursor-grab active:cursor-grabbing")} onClick={() => onDetail?.(order)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{order.projectName}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3" /><span className="truncate">{order.client}</span></p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <FilamentTag label={order.filamentoId ? `Filamento ${order.filamentoId}` : "Sem filamento"} color={order.filamentoId ? FILAMENT_SWATCHES[order.filamentoId] : undefined} />
            {!badge && onEdit && <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); onEdit(order); }} aria-label="Editar pedido"><Pencil className="h-3.5 w-3.5" /></Button>}
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete?.(order.id); }} aria-label="Excluir pedido"><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Package className="h-3.5 w-3.5" /><span className="font-medium text-foreground">{order.quantity}</span> un.</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /><span className="font-medium text-foreground">{formatTime(order.timeMinutes)}</span></span>
          {order.multiPart && (<span className="inline-flex items-center gap-0.5 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700"><Layers className="h-3 w-3" />Multi</span>)}
        </div>
        {order.linkProjeto && (<a href={order.linkProjeto} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}><ExternalLink className="h-3 w-3" />Ver projeto</a>)}
        {(order.precoVenda || custoTotal > 0) && (
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[11px]">
            <span className="text-muted-foreground">Custo: <span className="font-medium">R$ {custoTotal.toFixed(2)}</span></span>
            {order.precoVenda && (<><span className="font-medium text-foreground">Venda: R$ {order.precoVenda.toFixed(2)}</span>{lucro !== null && (<span className={lucro >= 0 ? "text-green-600" : "text-red-500"}>{lucro >= 0 ? "+" : ""}R$ {lucro.toFixed(2)}</span>)}</>)}
          </div>
        )}
        {badge && (
          <div className="mt-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: badge.color }}>{badge.label}</span>
            {order.valorRecebido !== undefined && (<span className="text-[11px] font-medium text-muted-foreground">R$ {order.valorRecebido.toFixed(2)}</span>)}
          </div>
        )}
        {order.formaPagamento && (<div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground"><CreditCard className="h-3 w-3" /><span className="font-medium">{order.formaPagamento}</span>{order.dataPagamento && (<span className="text-muted-foreground/70">· {new Date(order.dataPagamento).toLocaleDateString("pt-BR")}</span>)}</div>)}
        {order.status === "done" && (<Button size="sm" variant="outline" className="mt-2 w-full gap-1 text-xs" onClick={(e) => { e.stopPropagation(); setShowDestino(true); }}><MapPin className="h-3 w-3" />Finalizar Destino</Button>)}
      </Card>
      <Dialog open={showDestino} onOpenChange={setShowDestino}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Destino de &quot;{order.projectName}&quot;</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Selecione o destino final desta peça:</p>
            <div className="grid gap-2">
              <Button variant="outline" className="justify-start gap-2" onClick={() => { onFinalizar({ orderId: order.id, destino: "Dado de Presente" }); setShowDestino(false); }}>🎁 Dado de Presente</Button>
              <Button variant="outline" className="justify-start gap-2" onClick={() => { onFinalizar({ orderId: order.id, destino: "Falha de Impressão" }); setShowDestino(false); }}>❌ Falha de Impressão</Button>
            </div>
            <div className="space-y-2">
              <Label>Valor recebido (R$)</Label>
              <Input type="number" inputMode="decimal" min={0} step={0.01} placeholder="0,00" value={destinoValor} onChange={(e) => setDestinoValor(e.target.value)} />
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2"><Label>Forma de Pagamento</Label><Select value={destinoPagamento} onValueChange={setDestinoPagamento}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent></Select></div>
                <div className="grid gap-2"><Label>Data do Pagamento</Label><Input type="date" value={destinoDataPag} onChange={(e) => setDestinoDataPag(e.target.value)} /></div>
              </div>
              <Button className="btn-filament w-full gap-2" disabled={!destinoValor || Number(destinoValor) <= 0} onClick={() => { onFinalizar({ orderId: order.id, destino: "Kurtido e Vendido", valorRecebido: Number(destinoValor), formaPagamento: destinoPagamento || undefined, dataPagamento: destinoDataPag || undefined }); setShowDestino(false); }}>💰 Kurtido e Vendido</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DraggableCard({ order, onFinalizar, filamentos, onDelete, onDetail, onEdit, orderSettings }: { order: Order; onFinalizar: (args: { orderId: string; destino: string; valorRecebido?: number; formaPagamento?: string; dataPagamento?: string }) => Promise<unknown>; filamentos?: Filamento[]; onDelete?: (orderId: string) => void; onDetail?: (order: Order) => void; onEdit?: (order: Order) => void; orderSettings?: AppSettings }) {
  const isTerminal = ["vendido", "presente", "falha"].includes(order.status);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: order.id, disabled: isTerminal });
  return <div ref={setNodeRef} {...attributes} {...listeners} className={cn("touch-none", isDragging && "opacity-40")}><OrderCardView order={order} onFinalizar={onFinalizar} filamentos={filamentos} onDelete={onDelete} onDetail={onDetail} onEdit={onEdit} orderSettings={orderSettings} /></div>;
}

function KanbanColumn({ id, title, hint, orders, onFinalizar, filamentos, onDelete, onDetail, onEdit, orderSettings }: { id: Status; title: string; hint: string; orders: Order[]; onFinalizar: (args: { orderId: string; destino: string; valorRecebido?: number; formaPagamento?: string; dataPagamento?: string }) => Promise<unknown>; filamentos?: Filamento[]; onDelete?: (orderId: string) => void; onDetail?: (order: Order) => void; onEdit?: (order: Order) => void; orderSettings?: AppSettings }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const totalTime = orders.reduce((s, o) => s + o.timeMinutes, 0);
  return (
    <div className="flex min-w-0 flex-col">
      <div className="filament-top mb-3 rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold tracking-tight text-foreground">{title}</h3>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-xs font-semibold text-secondary-foreground">{orders.length}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        {orders.length > 0 && (<p className="mt-1 text-[11px] text-muted-foreground">Tempo total: <span className="font-medium text-foreground">{formatTime(totalTime)}</span></p>)}
      </div>
      <div ref={setNodeRef} className={cn("flex min-h-[400px] flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors", isOver ? "border-ring bg-secondary/60" : "border-border bg-secondary/30")}>
        {orders.map((o) => (<DraggableCard key={o.id} order={o} onFinalizar={onFinalizar} filamentos={filamentos} onDelete={onDelete} onDetail={onDetail} onEdit={onEdit} orderSettings={orderSettings} />))}
        {orders.length === 0 && (<p className="grid flex-1 place-items-center text-center text-xs text-muted-foreground">Solte um pedido aqui</p>)}
      </div>
    </div>
  );
}

function DetailItem({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={cn("text-sm font-medium", accent === true && "filament-text", accent === false && "text-destructive")}>{value}</dd>
    </div>
  );
}
