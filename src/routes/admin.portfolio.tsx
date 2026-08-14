import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Package,
  Plus,
  ExternalLink,
  Layers,
  CreditCard,
  CalendarDays,
  Trash2,
  Calculator,
  ListChecks,
  Eye,
  TriangleAlert as AlertTriangle,
  Pencil,
  Search,
  Wand as Wand2,
  Download,
  Lock,
  Globe,
  ShoppingCart,
  Loader2,
  Printer,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { z } from "zod";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { TimeInput } from "@/components/portfolio/TimeInput";
import { VisibilityBadge } from "@/components/portfolio/VisibilityBadge";
import { ProjectImagesPicker } from "@/components/portfolio/ProjectImagesPicker";
import {
  InfoTip,
  Field,
  NumberField,
  ACCENT_COLORS,
  ResultCard,
  CalculatorDonutChart,
} from "@/components/portfolio/calculator-ui";
import { OrderCardView } from "@/components/portfolio/OrderCardView";
import { KanbanColumn } from "@/components/portfolio/KanbanColumn";
import { DetailItem } from "@/components/portfolio/DetailItem";
import {
  PAYMENT_METHODS,
  STATUS_BADGE,
  FILAMENT_SWATCHES,
  formatTime,
  getPaymentBadge,
  type FinalizarPedidoArgs,
} from "@/components/portfolio/order-card-shared";
import { useCalcPedidosState } from "@/components/portfolio/use-calc-pedidos-state";
import {
  CATEGORIES,
  type Category,
  COLUMNS,
  PRINTERS,
  NO_PRINTER,
  buildEmptyFilamentoItem,
  buildEmptyExtraCost,
  buildEmptyOrderPart,
  fileToBase64,
  formatFileSize,
  initialForm,
  type FormState,
  type NewOrderPartForm,
} from "@/components/portfolio/calc-pedidos-shared";
import {
  addOrder,
  finalizarDestino,
  updateOrderStatus,
  removeOrder,
  addPortfolioProject,
  createOrderFromPortfolio,
  removePortfolioProject,
  updateOrder,
  updatePortfolioProject,
  uploadOrderAsset,
  resolveOrderAssetUrl,
  updateOrderPartStatus,
  saveSettings,
} from "@/lib/api/data.functions";
import type {
  Order,
  OrderPart,
  OrderPartStatus,
  Status,
  Filamento,
  AppSettings,
  PortfolioProject,
  CalculatorFilamentoInput,
  CalculatorExtraCost,
} from "@/lib/domain/types";
import { DEFAULT_APP_SETTINGS } from "@/lib/domain/types";
import { SearchInput } from "@/components/SearchInput";
import { calcOrderCostHybrid } from "@/lib/domain/cost";
import { getOrderAssetFileName, isOrderAssetReference } from "@/lib/domain/order-asset";
import { computeOrderTotalsFromParts, summarizeOrderParts } from "@/lib/domain/order-parts";
import { getOrderTrackingSummary } from "@/lib/domain/order-tracking";
import {
  BAMBU_PRESETS,
  type BambuPresetId,
  calcAdvancedPortfolioPricing,
  type PortfolioCalculatorEntryMode,
} from "@/lib/domain/portfolio-pricing";
import { useOrders } from "@/lib/hooks/use-orders";
import { useFilamentos } from "@/lib/hooks/use-filamentos";
import { usePortfolio } from "@/lib/hooks/use-portfolio";
import { useClients } from "@/lib/hooks/use-clients";
import { useSettings } from "@/lib/hooks/use-settings";
import { useToastErrorHandler } from "@/lib/hooks/use-toast-error-handler";
import { invalidarPor, type OperacaoDeNegocio } from "@/lib/query-keys";
import { normalizeText } from "@/lib/utils/normalization";
import { openPrintQuote, type QuoteInput } from "@/lib/domain/quote-print";
import { openPrintReceipt, type ReceiptInput } from "@/lib/domain/payment-receipt-print";
import { formatIsoDatePtBr } from "@/lib/domain/installments";

export const Route = createFileRoute("/admin/portfolio")({
  validateSearch: (search: Record<string, unknown>) => ({
    aba: search.aba === "orders" ? "orders" : "calc",
  }),
  head: () => ({ meta: [{ title: "Calculadora e Pedidos — Kurti 3D" }] }),
  component: CalcPedidos,
});

const NO_CLIENT_SELECTED = "__none__";
const MAX_ORDER_ASSET_SIZE = 25 * 1024 * 1024;
const ORDER_ASSET_ACCEPT =
  ".stl,.3mf,model/stl,application/sla,application/vnd.ms-package.3dmanufacturing-3dmodel+xml";
const ORDER_PART_STATUS_LABEL: Record<OrderPartStatus, string> = {
  todo: "A fazer",
  printing: "Imprimindo",
  done: "Concluida",
  falha: "Falha",
};

function validateOrderAssetFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["stl", "3mf"].includes(extension)) {
    return "Envie apenas arquivos STL ou 3MF.";
  }
  if (file.size > MAX_ORDER_ASSET_SIZE) {
    return "O arquivo excede o limite de 25 MB.";
  }
  return null;
}

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */
function CalcPedidos() {
  const ctx = useCalcPedidosState();
  const {
    qc,
    orders,
    filamentos,
    projects,
    clients,
    settings,
    form,
    setForm,
    invalidar,
    mutateAddProject,
    mutateRemoveProject,
    mutateCreateOrder,
    mutateStatus,
    mutateAddOrder,
    mutateFinalizar,
    mutateRemoveOrder,
    mutateUpdateOrder,
    mutateUpdateProject,
    mutateUploadOrderAsset,
    mutateResolveOrderAssetUrl,
    mutateUpdateOrderPartStatus,
    numeric,
    results,
    setField,
    isSlicerMode,
    effectiveUnitPrice,
    effectiveLotProfit,
    totals,
    orderDialog,
    setOrderDialog,
    showNewOrder,
    setShowNewOrder,
    newOrder,
    setNewOrder,
    newOrderAsset,
    setNewOrderAsset,
    newOrderParts,
    setNewOrderParts,
    detailOrder,
    setDetailOrder,
    deleteDialog,
    setDeleteDialog,
    editOrder,
    setEditOrder,
    editProject,
    setEditProject,
    editImages,
    setEditImages,
    projectImages,
    setProjectImages,
    projectSearch,
    setProjectSearch,
    orderSearch,
    setOrderSearch,
    updatingPartId,
    setUpdatingPartId,
    resetNewOrderForm,
    openEditProject,
    openProjectReference,
    activeId,
    setActiveId,
    sensors,
    grouped,
    printingByPrinter,
    filteredProjects,
    activeOrder,
    terminalOrders,
    newOrderPartsTotals,
    newOrderPartSummary,
    updateNewOrderPartField,
    addNewOrderPart,
    removeNewOrderPart,
    handlePrintQuote,
    handleProjectAction,
    submitProject,
    submitNewOrder,
  } = ctx;
  const { aba } = Route.useSearch();
  const navigate = useNavigate();
  const activeTab: "calc" | "orders" = aba === "orders" ? "orders" : "calc";
  const setTab = (tab: "calc" | "orders") =>
    navigate({
      to: "/admin/portfolio",
      search: (prev: Record<string, unknown>) => ({ ...prev, aba: tab }),
    });

  /* ═══════════ JSX ═══════════ */
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Calculadora e Pedidos</h1>
          <p className="text-sm text-muted-foreground">
            Calcule custos, salve projetos e gerencie sua fila de produção.
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Lucro acumulado
            </div>
            <div className="font-display text-xl font-bold filament-text">{brl(totals.lucro)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Projetos</div>
            <div className="font-display text-xl font-bold">{projects.length}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Pedidos ativos
            </div>
            <div className="font-display text-xl font-bold">
              {orders.filter((o) => ["todo", "printing", "done"].includes(o.status)).length}
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
        <button
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "calc"
              ? "bg-background text-foreground shadow-sm filament-text"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("calc")}
        >
          <Calculator className="h-4 w-4" /> Calculadora
        </button>
        <button
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "orders"
              ? "bg-background text-foreground shadow-sm filament-text"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("orders")}
        >
          <ListChecks className="h-4 w-4" /> Pedidos
          {orders.filter((o) => ["todo", "printing", "done"].includes(o.status)).length > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-bold">
              {orders.filter((o) => ["todo", "printing", "done"].includes(o.status)).length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "calc" ? renderCalculatorTab() : renderOrdersTab()}

      {/* ── Create Order from Portfolio dialog ── */}
      <Dialog
        open={orderDialog.open}
        onOpenChange={(open) => setOrderDialog((s) => ({ ...s, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar pedido</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const selectedClient = clients.find((client) => client.id === orderDialog.clientId);
              try {
                const result = await mutateCreateOrder.mutateAsync({
                  portfolioProjectId: orderDialog.projectId,
                  client: (selectedClient?.nome ?? orderDialog.client.trim()) || "Cliente",
                  clientId: selectedClient?.id,
                  quantity: Number(orderDialog.quantity) || 1,
                });
                if (!result.ok) {
                  toast.error("Projeto nao encontrado. Salve-o novamente.");
                  return;
                }
                setOrderDialog((s) => ({ ...s, open: false }));
                setTab("orders");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Erro ao criar o pedido.");
              }
            }}
          >
            <div className="grid gap-2">
              <Label>Cliente Cadastrado</Label>
              <Select
                value={orderDialog.clientId || NO_CLIENT_SELECTED}
                onValueChange={(value) => {
                  const nextClientId = value === NO_CLIENT_SELECTED ? "" : value;
                  const selectedClient = clients.find((client) => client.id === nextClientId);
                  setOrderDialog((state) => ({
                    ...state,
                    clientId: nextClientId,
                    client: selectedClient?.nome ?? state.client,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem vínculo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CLIENT_SELECTED}>Sem vínculo</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Cliente</Label>
              <Input
                value={orderDialog.client}
                onChange={(e) => setOrderDialog((s) => ({ ...s, client: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min={1}
                value={orderDialog.quantity}
                onChange={(e) => setOrderDialog((s) => ({ ...s, quantity: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                className="gap-2"
                onClick={() => {
                  const project = projects.find((p) => p.id === orderDialog.projectId);
                  if (!project) {
                    toast.error("Projeto nao encontrado.");
                    return;
                  }
                  const effectivePrice = project.precoVenda > 0 ? project.precoVenda : 0;
                  const input: QuoteInput = {
                    clientName: orderDialog.client.trim() || "",
                    items: [
                      {
                        name: project.nome,
                        category: project.categoria,
                        quantity: Number(orderDialog.quantity) || 1,
                        unitPrice: effectivePrice,
                        total: effectivePrice * (Number(orderDialog.quantity) || 1),
                        timeMinutes: project.tempoMin,
                        gramsPerUnit: project.pesoPeca,
                      },
                    ],
                    validityDays: 7,
                    observations: project.linkModelo?.trim()
                      ? `Modelo de referencia: ${project.linkModelo.trim()}`
                      : undefined,
                    studioNome: settings.studioNome || "Kurti 3D",
                    whatsappNumero: settings.whatsappNumero || "",
                  };
                  openPrintQuote(input);
                }}
              >
                <Printer className="h-4 w-4" />
                Imprimir Orçamento
              </Button>
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                onClick={() => setOrderDialog((s) => ({ ...s, open: false }))}
              >
                Cancelar
              </Button>
              <Button type="submit" className="btn-filament" disabled={mutateCreateOrder.isPending}>
                {mutateCreateOrder.isPending ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── New Order dialog ── */}
      <Dialog
        open={showNewOrder}
        onOpenChange={(open) => {
          setShowNewOrder(open);
          if (!open) resetNewOrderForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo pedido</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={submitNewOrder}>
            <div className="grid gap-2">
              <Label>Cliente Cadastrado</Label>
              <Select
                value={newOrder.clientId || NO_CLIENT_SELECTED}
                onValueChange={(value) => {
                  const nextClientId = value === NO_CLIENT_SELECTED ? "" : value;
                  const selectedClient = clients.find((client) => client.id === nextClientId);
                  setNewOrder((state) => ({
                    ...state,
                    clientId: nextClientId,
                    client: selectedClient?.nome ?? state.client,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem vínculo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CLIENT_SELECTED}>Sem vínculo</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Cliente</Label>
              <Input
                value={newOrder.client}
                onChange={(e) => setNewOrder((s) => ({ ...s, client: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Projeto</Label>
              <Input
                value={newOrder.projectName}
                onChange={(e) => setNewOrder((s) => ({ ...s, projectName: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Impressora</Label>
              <Select
                value={newOrder.printer || NO_PRINTER}
                onValueChange={(v) =>
                  setNewOrder((s) => ({ ...s, printer: v === NO_PRINTER ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem impressora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PRINTER}>Sem impressora</SelectItem>
                  {PRINTERS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={1}
                  value={newOrder.quantity}
                  onChange={(e) => setNewOrder((s) => ({ ...s, quantity: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{newOrder.multiPart ? "Horas (calc.)" : "Horas"}</Label>
                <Input
                  type="number"
                  min={0}
                  value={
                    newOrder.multiPart
                      ? newOrderPartsTotals.timeMinutes > 0
                        ? String(Math.floor(newOrderPartsTotals.timeMinutes / 60))
                        : ""
                      : String(Math.floor(Number(newOrder.timeMinutes) / 60))
                  }
                  onChange={(e) => {
                    const h = Number(e.target.value) || 0;
                    const m = Number(newOrder.timeMinutes) % 60;
                    setNewOrder((s) => ({ ...s, timeMinutes: String(h * 60 + m) }));
                  }}
                  disabled={newOrder.multiPart}
                />
              </div>
              <div className="grid gap-2">
                <Label>{newOrder.multiPart ? "Minutos (calc.)" : "Minutos"}</Label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={
                    newOrder.multiPart
                      ? newOrderPartsTotals.timeMinutes > 0
                        ? String(newOrderPartsTotals.timeMinutes % 60)
                        : ""
                      : String(Number(newOrder.timeMinutes) % 60)
                  }
                  onChange={(e) => {
                    const m = Math.min(Number(e.target.value) || 0, 59);
                    const h = Math.floor(Number(newOrder.timeMinutes) / 60);
                    setNewOrder((s) => ({ ...s, timeMinutes: String(h * 60 + m) }));
                  }}
                  disabled={newOrder.multiPart}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Filamentos</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() =>
                      setNewOrder((s) => ({ ...s, filamentoIds: [...s.filamentoIds, ""] }))
                    }
                  >
                    <Plus className="h-3 w-3" /> Adicionar filamento
                  </Button>
                </div>
                {newOrder.filamentoIds.length === 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-muted-foreground"
                    onClick={() => setNewOrder((s) => ({ ...s, filamentoIds: [""] }))}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Selecionar filamento
                  </Button>
                ) : (
                  <div className="space-y-2">
                    {newOrder.filamentoIds.map((fId, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Select
                          value={fId}
                          onValueChange={(v) =>
                            setNewOrder((s) => {
                              const ids = [...s.filamentoIds];
                              ids[idx] = v;
                              return { ...s, filamentoIds: ids };
                            })
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {filamentos.map((f) => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setNewOrder((s) => ({
                              ...s,
                              filamentoIds: s.filamentoIds.filter((_, i) => i !== idx),
                            }))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>
                  {newOrder.multiPart ? "Gramas totais (calculado)" : "Gramas / unidade"}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={
                    newOrder.multiPart
                      ? newOrderPartsTotals.gramsPerUnit > 0
                        ? String(newOrderPartsTotals.gramsPerUnit)
                        : ""
                      : newOrder.gramsPerUnit
                  }
                  onChange={(e) => setNewOrder((s) => ({ ...s, gramsPerUnit: e.target.value }))}
                  disabled={newOrder.multiPart}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Link externo (opcional)</Label>
              <Input
                type="url"
                value={newOrder.linkProjeto}
                onChange={(e) => setNewOrder((s) => ({ ...s, linkProjeto: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Arquivo STL ou 3MF (opcional)</Label>
              <Input
                type="file"
                accept=".stl,.3mf,model/stl,application/sla,application/vnd.ms-package.3dmanufacturing-3dmodel+xml"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (!file) {
                    setNewOrderAsset(null);
                    return;
                  }
                  const extension = file.name.split(".").pop()?.toLowerCase();
                  if (!extension || !["stl", "3mf"].includes(extension)) {
                    toast.error("Envie apenas arquivos STL ou 3MF.");
                    e.currentTarget.value = "";
                    return;
                  }
                  if (file.size > MAX_ORDER_ASSET_SIZE) {
                    toast.error("O arquivo excede o limite de 25 MB.");
                    e.currentTarget.value = "";
                    return;
                  }
                  setNewOrderAsset(file);
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                O arquivo fica salvo em Storage para reimpressao futura. Se enviar um arquivo, ele
                sera a referencia principal do pedido.
              </p>
              {newOrderAsset && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                  <span className="truncate font-medium">{newOrderAsset.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatFileSize(newOrderAsset.size)}
                  </span>
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Preço de Venda (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={newOrder.precoVenda}
                  onChange={(e) => setNewOrder((s) => ({ ...s, precoVenda: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant={newOrder.multiPart ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => {
                    setNewOrder((s) => ({ ...s, multiPart: !s.multiPart }));
                    setNewOrderParts((current) =>
                      current.length > 0 ? current : [buildEmptyOrderPart()],
                    );
                  }}
                >
                  <Layers className="h-4 w-4" />
                  {newOrder.multiPart ? "Multi-partes" : "Peça única"}
                </Button>
              </div>
            </div>
            {newOrder.multiPart && (
              <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Partes do pedido</p>
                    <p className="text-xs text-muted-foreground">
                      Cadastre cada parte com seu tempo, peso e arquivo opcional. Os totais do
                      pedido sao somados automaticamente.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={addNewOrderPart}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar parte
                  </Button>
                </div>
                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    <span className="font-medium text-foreground">{newOrderPartSummary.total}</span>{" "}
                    partes
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    <span className="font-medium text-foreground">
                      {formatTime(Math.round(newOrderPartsTotals.timeMinutes))}
                    </span>{" "}
                    tempo total
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    <span className="font-medium text-foreground">
                      {newOrderPartsTotals.gramsPerUnit.toFixed(2)}g
                    </span>{" "}
                    consumo total
                  </div>
                </div>
                <div className="space-y-4">
                  {newOrderParts.map((part, index) => (
                    <div
                      key={part.id}
                      className="space-y-3 rounded-xl border border-border bg-background p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">Parte {index + 1}</p>
                          <p className="text-xs text-muted-foreground">
                            Cada linha representa uma subpeca do pedido final.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeNewOrderPart(part.id)}
                          disabled={newOrderParts.length <= 1}
                          aria-label={`Remover parte ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-2 sm:col-span-2">
                          <Label>Nome da parte</Label>
                          <Input
                            value={part.nome}
                            onChange={(e) =>
                              updateNewOrderPartField(part.id, "nome", e.target.value)
                            }
                            placeholder="Ex.: Cabeca, Base, Braço esquerdo"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Quantidade desta parte</Label>
                          <Input
                            type="number"
                            min={1}
                            value={part.quantity}
                            onChange={(e) =>
                              updateNewOrderPartField(part.id, "quantity", e.target.value)
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Tempo por unidade (min)</Label>
                          <Input
                            type="number"
                            min={0.1}
                            step={0.1}
                            value={part.timeMinutes}
                            onChange={(e) =>
                              updateNewOrderPartField(part.id, "timeMinutes", e.target.value)
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Gramas por unidade</Label>
                          <Input
                            type="number"
                            min={0.01}
                            step={0.01}
                            value={part.gramsPerUnit}
                            onChange={(e) =>
                              updateNewOrderPartField(part.id, "gramsPerUnit", e.target.value)
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Link externo da parte</Label>
                          <Input
                            type="url"
                            value={part.linkProjeto}
                            onChange={(e) =>
                              updateNewOrderPartField(part.id, "linkProjeto", e.target.value)
                            }
                            placeholder="https://..."
                          />
                        </div>
                        <div className="grid gap-2 sm:col-span-2">
                          <Label>Arquivo STL ou 3MF da parte (opcional)</Label>
                          <Input
                            type="file"
                            accept={ORDER_ASSET_ACCEPT}
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              if (!file) {
                                updateNewOrderPartField(part.id, "file", null);
                                return;
                              }
                              const validationMessage = validateOrderAssetFile(file);
                              if (validationMessage) {
                                toast.error(validationMessage);
                                e.currentTarget.value = "";
                                return;
                              }
                              updateNewOrderPartField(part.id, "file", file);
                            }}
                          />
                          {part.file && (
                            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                              <span className="truncate font-medium">{part.file.name}</span>
                              <span className="shrink-0 text-muted-foreground">
                                {formatFileSize(part.file.size)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="grid gap-2 sm:col-span-2">
                          <Label>Observacoes</Label>
                          <Textarea
                            rows={2}
                            value={part.notes}
                            onChange={(e) =>
                              updateNewOrderPartField(part.id, "notes", e.target.value)
                            }
                            placeholder="Observacoes de encaixe, orientacao, cor, suporte..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Forma de Pagamento</Label>
                <Select
                  value={newOrder.formaPagamento}
                  onValueChange={(v) => setNewOrder((s) => ({ ...s, formaPagamento: v }))}
                >
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
                  value={newOrder.dataPagamento}
                  onChange={(e) => setNewOrder((s) => ({ ...s, dataPagamento: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowNewOrder(false);
                  resetNewOrderForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="btn-filament"
                disabled={mutateAddOrder.isPending || mutateUploadOrderAsset.isPending}
              >
                {mutateAddOrder.isPending || mutateUploadOrderAsset.isPending
                  ? "Salvando..."
                  : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Order Detail dialog ── */}
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
              const partStatusLocked = ["vendido", "presente", "falha"].includes(
                detailOrder.status,
              );
              return (
                <div className="space-y-4">
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
                            (detailOrder.filamentoId ? `ID: ${detailOrder.filamentoId}` : "\u2014"))
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
                  </div>
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
                                  {part.quantity}x · {formatTime(Math.round(part.timeMinutes))}/un.
                                  · {part.gramsPerUnit.toFixed(2)}g/un.
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

      {/* ── Delete Order dialog ── */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((s) => ({ ...s, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir Pedido
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.
            </p>
            <div className="grid gap-2">
              <Label>Motivo da exclusão *</Label>
              <Textarea
                rows={3}
                placeholder="Informe o motivo..."
                value={deleteDialog.reason}
                onChange={(e) => setDeleteDialog((s) => ({ ...s, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog((s) => ({ ...s, open: false, reason: "" }))}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!deleteDialog.reason.trim()}
              onClick={() => {
                mutateRemoveOrder.mutate({
                  orderId: deleteDialog.orderId,
                  reason: deleteDialog.reason,
                });
                setDeleteDialog({ open: false, orderId: "", reason: "" });
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Order dialog ── */}
      <Dialog
        open={!!editOrder}
        onOpenChange={(open) => {
          if (!open) setEditOrder(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Pedido</DialogTitle>
          </DialogHeader>
          {editOrder && (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const selectedClientId = (fd.get("clientId") as string) || "";
                const selectedClient = clients.find((client) => client.id === selectedClientId);
                const printerValue = (fd.get("printer") as string) || "";
                mutateUpdateOrder.mutate({
                  orderId: editOrder.id,
                  client:
                    (selectedClient?.nome ?? (fd.get("client") as string)?.trim()) ||
                    editOrder.client,
                  projectName: (fd.get("projectName") as string)?.trim() || editOrder.projectName,
                  quantity: Number(fd.get("quantity")) || editOrder.quantity,
                  timeMinutes: Number(fd.get("timeMinutes")) || editOrder.timeMinutes,
                  filamentoId: (fd.get("filamentoId") as string) || null,
                  gramsPerUnit: Number(fd.get("gramsPerUnit")) || null,
                  precoVenda: Number(fd.get("precoVenda")) || null,
                  linkProjeto:
                    (fd.get("linkProjeto") as string)?.trim() ||
                    (isOrderAssetReference(editOrder.linkProjeto)
                      ? (editOrder.linkProjeto ?? null)
                      : null),
                  multiPart: editOrder.parts?.length ? true : (editOrder.multiPart ?? false),
                  formaPagamento: (fd.get("formaPagamento") as string) || null,
                  dataPagamento: (fd.get("dataPagamento") as string) || null,
                  clientId: selectedClient?.id ?? null,
                  printer: printerValue && printerValue !== NO_PRINTER ? printerValue : null,
                });
                setEditOrder(null);
              }}
            >
              <div className="grid gap-2">
                <Label>Cliente Cadastrado</Label>
                <Select name="clientId" defaultValue={editOrder.clientId ?? NO_CLIENT_SELECTED}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem vínculo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CLIENT_SELECTED}>Sem vínculo</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Cliente</Label>
                <Input name="client" defaultValue={editOrder.client} />
              </div>
              <div className="grid gap-2">
                <Label>Projeto</Label>
                <Input name="projectName" defaultValue={editOrder.projectName} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Quantidade</Label>
                  <Input name="quantity" type="number" min={1} defaultValue={editOrder.quantity} />
                </div>
                <div className="grid gap-2">
                  <Label>
                    {editOrder.parts?.length ? "Tempo total (calculado)" : "Tempo (min)"}
                  </Label>
                  <Input
                    name="timeMinutes"
                    type="number"
                    min={1}
                    defaultValue={editOrder.timeMinutes}
                    disabled={Boolean(editOrder.parts?.length)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Filamento</Label>
                  <Select name="filamentoId" defaultValue={editOrder.filamentoId ?? ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {filamentos.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>
                    {editOrder.parts?.length ? "Gramas totais (calculado)" : "Gramas / unidade"}
                  </Label>
                  <Input
                    name="gramsPerUnit"
                    type="number"
                    min={0}
                    defaultValue={editOrder.gramsPerUnit ?? ""}
                    disabled={Boolean(editOrder.parts?.length)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Impressora</Label>
                <Select name="printer" defaultValue={editOrder.printer ?? NO_PRINTER}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem impressora" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PRINTER}>Sem impressora</SelectItem>
                    {PRINTERS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editOrder.parts?.length ? (
                <p className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  Este pedido usa multi-partes. Tempo e consumo total sao recalculados
                  automaticamente a partir das partes no detalhe do pedido.
                </p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Preço de Venda (R$)</Label>
                  <Input
                    name="precoVenda"
                    type="number"
                    min={0}
                    step={0.01}
                    defaultValue={editOrder.precoVenda ?? ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Link do Projeto</Label>
                  <Input
                    name="linkProjeto"
                    type="text"
                    defaultValue={
                      isOrderAssetReference(editOrder.linkProjeto)
                        ? ""
                        : (editOrder.linkProjeto ?? "")
                    }
                    placeholder={
                      isOrderAssetReference(editOrder.linkProjeto)
                        ? "Arquivo STL/3MF ja salvo neste pedido"
                        : ""
                    }
                  />
                  {isOrderAssetReference(editOrder.linkProjeto) && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
                      onClick={() => void openProjectReference(editOrder.linkProjeto)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Abrir {getOrderAssetFileName(editOrder.linkProjeto) ?? "arquivo salvo"}
                    </button>
                  )}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Forma de Pagamento</Label>
                  <Select name="formaPagamento" defaultValue={editOrder.formaPagamento ?? ""}>
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
                    name="dataPagamento"
                    type="date"
                    defaultValue={editOrder.dataPagamento ?? ""}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOrder(null)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="btn-filament"
                  disabled={mutateUpdateOrder.isPending}
                >
                  {mutateUpdateOrder.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Project dialog ── */}
      <Dialog
        open={!!editProject}
        onOpenChange={(open) => {
          if (!open) setEditProject(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Projeto</DialogTitle>
          </DialogHeader>
          {editProject && (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
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
                  tempoMin:
                    Number(fd.get("tempoHours")) * 60 + Number(fd.get("tempoMinutes")) ||
                    editProject.tempoMin,
                  quantidade: Number(fd.get("quantidade")) || editProject.quantidade,
                  precoVenda: Number(fd.get("precoVenda")) || editProject.precoVenda,
                  perdaPercent: Number(fd.get("perdaPercent")) || 0,
                  isPublic: editProject.isPublic ?? false,
                  imageUrls: editImages,
                });
                setEditProject(null);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Nome</Label>
                  <Input name="nome" defaultValue={editProject.nome} />
                </div>
                <div className="grid gap-2">
                  <Label>Categoria</Label>
                  <Select name="categoria" defaultValue={editProject.categoria}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Link do Modelo</Label>
                <Input name="linkModelo" type="url" defaultValue={editProject.linkModelo ?? ""} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Custo do Rolo (R$)</Label>
                  <Input
                    name="custoRolo"
                    type="number"
                    step={0.01}
                    defaultValue={editProject.custoRolo}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Peso do Rolo (g)</Label>
                  <Input name="pesoRolo" type="number" defaultValue={editProject.pesoRolo} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="grid gap-2">
                  <Label>Peso Peça (g)</Label>
                  <Input
                    name="pesoPeca"
                    type="number"
                    step={0.01}
                    defaultValue={editProject.pesoPeca}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Horas</Label>
                  <Input
                    name="tempoHours"
                    type="number"
                    min={0}
                    defaultValue={Math.floor(editProject.tempoMin / 60)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Minutos</Label>
                  <Input
                    name="tempoMinutes"
                    type="number"
                    min={0}
                    max={59}
                    defaultValue={editProject.tempoMin % 60}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Quantidade</Label>
                  <Input
                    name="quantidade"
                    type="number"
                    min={1}
                    defaultValue={editProject.quantidade}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Preço Venda (R$)</Label>
                  <Input
                    name="precoVenda"
                    type="number"
                    step={0.01}
                    defaultValue={editProject.precoVenda}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>% Desperdício</Label>
                  <Input
                    name="perdaPercent"
                    type="number"
                    step={1}
                    defaultValue={editProject.perdaPercent ?? 0}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Imagens do site (galeria "Nossos trabalhos")</Label>
                <ProjectImagesPicker images={editImages} onChange={setEditImages} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditProject(null)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="btn-filament"
                  disabled={mutateUpdateProject.isPending}
                >
                  {mutateUpdateProject.isPending ? "Salvando..." : "Salvar"}
                </Button>
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
      <TooltipProvider delayDuration={150}>
        <div className="space-y-8">
          {/* Form + Results */}
          <form
            onSubmit={submitProject}
            className="filament-top space-y-6 rounded-2xl border border-border bg-card p-6"
          >
            {/* ── Bloco 1: Identificação do projeto ── */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <Field
                label="Nome do Projeto"
                tip="Como esse modelo será identificado nos pedidos e relatórios. Ex.: 'Chaveiro logo Bambu'."
                className="md:col-span-2"
              >
                <Input
                  value={form.nome}
                  onChange={(e) => setField("nome", e.target.value)}
                  placeholder="Chaveiro logo Bambu"
                  maxLength={100}
                />
              </Field>
              <Field
                label="Categoria"
                tip="Tipo da peça — usado para agrupar nos relatórios. Ex.: Chaveiro, Miniatura, Decoração."
                className="md:col-span-2"
              >
                <Select
                  value={form.categoria}
                  onValueChange={(v) => setField("categoria", v as Category)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Link do Modelo (MakerWorld/STL)"
                tip="URL do modelo 3D (MakerWorld, Printables, Thingiverse). Opcional — facilita reimprimir depois."
                className="md:col-span-2"
              >
                <Input
                  value={form.linkModelo}
                  onChange={(e) => setField("linkModelo", e.target.value)}
                  placeholder="https://makerworld.com/en/models/..."
                  type="url"
                />
              </Field>
              <Field
                label="Fotos do Projeto (site)"
                tip='Até 10 fotos exibidas na galeria "Nossos trabalhos" do site. A primeira é a capa do card.'
                className="md:col-span-2 lg:col-span-4"
              >
                <ProjectImagesPicker images={projectImages} onChange={setProjectImages} />
              </Field>
            </div>

            {/* ── Bloco 2: Impressora (preset Bambu Lab) ── */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Calculator className="h-3.5 w-3.5" /> Impressora e Amortização
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                <Field
                  label="Modelo Bambu Lab"
                  tip="Preset oficial Bambu Lab. Define a wattagem usada no cálculo de energia. Ex.: A1 + AMS = 150W, A1 Mini = 100W."
                >
                  <Select
                    value={form.modeloPreset}
                    onValueChange={(v) => {
                      const presetId = v as BambuPresetId;
                      const preset = BAMBU_PRESETS.find((m) => m.id === presetId);
                      setForm((f) => ({
                        ...f,
                        modeloPreset: presetId,
                        precoImpressora: String(
                          settings.printerPrices?.[presetId] ?? preset?.defaultPreco ?? 0,
                        ),
                        vidaUtilHoras: String(
                          settings.printerVidaUtil?.[presetId] ?? preset?.defaultVidaUtilHoras ?? 0,
                        ),
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BAMBU_PRESETS.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.label} — {m.watts}W
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <NumberField
                  label="Preço da Impressora (R$)"
                  value={form.precoImpressora}
                  onChange={(v) => setField("precoImpressora", v)}
                  placeholder="2999,00"
                  tip="Quanto você pagou pela impressora. Usado para calcular a amortização (desgaste) por hora. Ex.: A1 ≈ R$ 2.999."
                />
                <NumberField
                  label="Vida Útil (horas)"
                  value={form.vidaUtilHoras}
                  onChange={(v) => setField("vidaUtilHoras", v)}
                  placeholder="2000"
                  step="100"
                  tip="Quantas horas você espera que a impressora dure antes de precisar trocar partes principais. Padrão: 2000h (~2-3 anos de uso intenso)."
                />
                <NumberField
                  label="% Margem de Lucro"
                  value={form.margemPercent}
                  onChange={(v) => setField("margemPercent", v)}
                  placeholder="30"
                  step="1"
                  tip="Percentual de lucro sobre o custo. Ex.: custo R$ 2, margem 30% → preço sugerido R$ 2,60. O bambucostpro.com usa 30% como padrão."
                />
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Amortização calculada:{" "}
                <strong className="filament-text">{brl(results.amortHora)}/h</strong> (Preço ÷ Vida
                útil) · Consumo: <strong>{(results.consumoKw * 1000).toFixed(0)}W</strong>
              </p>
            </div>

            {/* ── Bloco 3: Peça, tempo e lote ── */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <Field
                label="Modo de Entrada"
                tip="Use 'Dados do Fatiador' quando for copiar peso e tempo direto do Bambu Studio/OrcaSlicer. Use 'Ja tenho media por unidade' se voce ja sabe os valores medios por nome."
                className="md:col-span-2"
              >
                <Select
                  value={form.entryMode}
                  onValueChange={(v) => setField("entryMode", v as PortfolioCalculatorEntryMode)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slicer">Dados do Fatiador</SelectItem>
                    <SelectItem value="unit">Ja tenho media por unidade</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <NumberField
                label={isSlicerMode ? "Peso do Fatiamento (g)" : "Peso Medio por Unidade (g)"}
                value={form.pesoPeca}
                onChange={(v) => setField("pesoPeca", v)}
                placeholder={isSlicerMode ? "64,05" : "6"}
                tip={
                  isSlicerMode
                    ? "Copie o peso total mostrado pelo fatiador para esta placa/impressao. Ex.: no Bambu Studio, painel 'Filament/Modelo': 64,05g."
                    : "Informe o peso medio de UMA unidade pronta. Ex.: um nome medio pesa 6g."
                }
              />
              <TimeInput
                label={isSlicerMode ? "Tempo do Fatiamento" : "Tempo Medio por Unidade"}
                tip={
                  isSlicerMode
                    ? "Copie o tempo total do fatiamento dessa placa. Ex.: 'Tempo total' de 1h45 = 105 minutos."
                    : "Informe o tempo medio para produzir UMA unidade. Se voce ja calculou manualmente, use este modo."
                }
                totalMinutes={Number(form.tempoMin) || 0}
                onChange={(minutes) => setField("tempoMin", String(minutes))}
              />
              <NumberField
                label={isSlicerMode ? "Unidades nesse Fatiamento" : "Unidades por Impressao"}
                value={form.unidadesPorImpressao}
                onChange={(v) => setField("unidadesPorImpressao", v)}
                placeholder="1"
                step="1"
                tip={
                  isSlicerMode
                    ? "Quantos nomes/pecas estao representados nesse peso e nesse tempo do fatiador. Para o seu exemplo com 1 nome medio por vez, deixe 1."
                    : "Se voce costuma imprimir mais de uma unidade por vez, informe aqui para estimar quantas impressoes serao necessarias no lote."
                }
              />
              <NumberField
                label="Quantidade do Pedido/Lote"
                value={form.quantidade}
                onChange={(v) => setField("quantidade", v)}
                placeholder="25"
                step="1"
                tip="Total de unidades que o cliente pediu. No seu caso, para 25 nomes diferentes, informe 25."
              />
              <NumberField
                label="% Desperdício"
                value={form.perdaPercent}
                onChange={(v) => setField("perdaPercent", v)}
                placeholder="0"
                step="1"
                tip="Percentual estimado de impressões que falham, descolam ou saem com defeito. Comece com 0%. Depois de imprimir um tempo, se 1 em 20 falha = 5%. Cobre prejuízos no preço final."
              />
              <div className="lg:col-span-2">
                <NumberField
                  label="Preço de Venda (R$)"
                  value={form.precoVenda}
                  onChange={(v) => setField("precoVenda", v)}
                  placeholder="15,00"
                  tip="Quanto você cobra por UMA peça. Use o 'Aplicar sugerido' ao lado para preencher automaticamente com base na sua margem."
                />
              </div>
            </div>

            {/* ═══════ LISTA DINAMICA DE FILAMENTOS ═══════ */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Layers className="h-3.5 w-3.5" /> Filamentos
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const novo = buildEmptyFilamentoItem();
                    setField("filamentos", [...form.filamentos, novo]);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar Filamento
                </Button>
              </div>
              <p className="mb-3 text-[11px] text-muted-foreground">
                Adicone quantos filamentos forem necessarios. O custo de material e a soma de (Peso
                Usado x Custo por grama) de todos os itens.
              </p>
              <div className="space-y-3">
                {form.filamentos.map((fil, idx) => {
                  return (
                    <div key={fil.id} className="rounded-xl border border-border bg-background p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">
                          Filamento {idx + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (form.filamentos.length <= 1) return;
                            setField(
                              "filamentos",
                              form.filamentos.filter((_, i) => i !== idx),
                            );
                          }}
                          disabled={form.filamentos.length <= 1}
                          aria-label="Remover filamento"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="sm:col-span-1">
                          <Field label="Marca" tip="Ex.: Voolt, Creality, eSun">
                            <Input
                              value={fil.marca ?? ""}
                              onChange={(e) => {
                                const updated = [...form.filamentos];
                                updated[idx] = { ...updated[idx], marca: e.target.value };
                                setField("filamentos", updated);
                              }}
                              placeholder="Voolt"
                            />
                          </Field>
                        </div>
                        <div className="sm:col-span-1">
                          <Field label="Cor" tip="Ex.: Preto, Azul, Arco-Íris">
                            <Input
                              value={fil.cor ?? ""}
                              onChange={(e) => {
                                const updated = [...form.filamentos];
                                updated[idx] = { ...updated[idx], cor: e.target.value };
                                setField("filamentos", updated);
                              }}
                              placeholder="Preto"
                            />
                          </Field>
                        </div>
                        <NumberField
                          label="Preco do Rolo (R$)"
                          value={String(fil.precoRolo || "")}
                          onChange={(v) => {
                            const updated = [...form.filamentos];
                            updated[idx] = { ...updated[idx], precoRolo: Number(v) || 0 };
                            setField("filamentos", updated);
                          }}
                          placeholder="120,00"
                          tip="Quanto voce pagou pelo rolo inteiro."
                        />
                        <NumberField
                          label="Peso do Rolo (g)"
                          value={String(fil.pesoRolo || "")}
                          onChange={(v) => {
                            const updated = [...form.filamentos];
                            updated[idx] = { ...updated[idx], pesoRolo: Number(v) || 0 };
                            setField("filamentos", updated);
                          }}
                          placeholder="1000"
                          tip="Peso total do rolo (ex.: 1kg = 1000g)."
                        />
                        <NumberField
                          label="Peso Usado na Impressao (g)"
                          value={String(fil.pesoUsado || "")}
                          onChange={(v) => {
                            const updated = [...form.filamentos];
                            updated[idx] = { ...updated[idx], pesoUsado: Number(v) || 0 };
                            setField("filamentos", updated);
                          }}
                          placeholder="45"
                          tip="Quantos gramas deste filamento serao usados na impressao final."
                        />
                        {fil.pesoRolo > 0 && fil.pesoUsado > 0 && (
                          <div className="flex items-end pb-2">
                            <span className="text-xs text-muted-foreground">
                              Custo:{" "}
                              <strong className="filament-text">
                                {brl((fil.precoRolo / fil.pesoRolo) * fil.pesoUsado)}
                              </strong>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {results.custoFilamentosDetalhado !== undefined &&
                results.custoFilamentosDetalhado > 0 && (
                  <div className="mt-3 flex justify-end border-t border-border pt-3">
                    <span className="text-xs font-semibold">
                      Custo total dos filamentos:{" "}
                      <strong className="filament-text">
                        {brl(results.custoFilamentosDetalhado)}
                      </strong>
                    </span>
                  </div>
                )}
            </div>

            {/* ═══════ CUSTOS EXTRAS ═══════ */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Package className="h-3.5 w-3.5" /> Custos Adicionais
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setField("custosExtras", [...form.custosExtras, buildEmptyExtraCost()]);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar Custo
                </Button>
              </div>
              <p className="mb-3 text-[11px] text-muted-foreground">
                Custos extras como embalagem, cola, post-processamento, etc.
              </p>
              {form.custosExtras.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4">
                  Nenhum custo adicional cadastrado. Clique em "Adicionar Custo" para incluir.
                </p>
              ) : (
                <div className="space-y-3">
                  {form.custosExtras.map((ec, idx) => (
                    <div
                      key={ec.id}
                      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-background p-3"
                    >
                      <div className="flex-1 min-w-[120px]">
                        <Field label="Nome">
                          <Input
                            value={ec.nome}
                            onChange={(e) => {
                              const updated = [...form.custosExtras];
                              updated[idx] = { ...updated[idx], nome: e.target.value };
                              setField("custosExtras", updated);
                            }}
                            placeholder="Ex.: Embalagem"
                          />
                        </Field>
                      </div>
                      <NumberField
                        label="Custo Unit. (R$)"
                        value={String(ec.custo || "")}
                        onChange={(v) => {
                          const updated = [...form.custosExtras];
                          updated[idx] = { ...updated[idx], custo: Number(v) || 0 };
                          setField("custosExtras", updated);
                        }}
                        placeholder="2,50"
                      />
                      <NumberField
                        label="Quantidade"
                        value={String(ec.quantidade || "")}
                        onChange={(v) => {
                          const updated = [...form.custosExtras];
                          updated[idx] = { ...updated[idx], quantidade: Number(v) || 0 };
                          setField("custosExtras", updated);
                        }}
                        placeholder="1"
                        step="1"
                      />
                      {ec.custo > 0 && ec.quantidade > 0 && (
                        <div className="flex items-end pb-2">
                          <span className="text-xs text-muted-foreground">
                            Total: <strong>{brl(ec.custo * ec.quantidade)}</strong>
                          </span>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setField(
                            "custosExtras",
                            form.custosExtras.filter((_, i) => i !== idx),
                          )
                        }
                        aria-label="Remover custo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {results.custoExtraTotal !== undefined && results.custoExtraTotal > 0 && (
                <div className="mt-3 flex justify-end border-t border-border pt-3">
                  <span className="text-xs font-semibold">
                    Total custos adicionais:{" "}
                    <strong className="filament-text">{brl(results.custoExtraTotal)}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* ═══════ ENERGIA + MAO DE OBRA + TAXA ═══════ */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Calculator className="h-3.5 w-3.5" /> Energia, Mao de Obra e Taxas
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                <NumberField
                  label="Custo do kWh (R$)"
                  value={form.custoKwh}
                  onChange={(v) => setField("custoKwh", v)}
                  placeholder={String(settings.tarifaEnergiaKwh)}
                  tip="Deixe em branco para usar o valor das Configuracoes (R$ {settings.tarifaEnergiaKwh})."
                />
                <NumberField
                  label="Horas de Mao de Obra"
                  value={form.custoTrabalhoHoras}
                  onChange={(v) => setField("custoTrabalhoHoras", v)}
                  placeholder="0"
                  step="0.5"
                  tip="Horas trabalhadas no processo (preparacao, pos-processamento, embalagem)."
                />
                <NumberField
                  label="Valor da Hora (R$)"
                  value={form.custoTrabalhoValorHora}
                  onChange={(v) => setField("custoTrabalhoValorHora", v)}
                  placeholder="25,00"
                  tip="Quanto voce cobra por hora de trabalho. Ex.: R$ 25/h."
                />
                <NumberField
                  label="Taxa do Gateway/Marketplace (%)"
                  value={form.taxaGateway}
                  onChange={(v) => setField("taxaGateway", v)}
                  placeholder="0"
                  step="0.5"
                  tip="Percentual de taxa da plataforma de venda (Shopee, Mercado Livre, etc.). Ex.: 10%."
                />
              </div>
              {results.custoTrabalho !== undefined && results.custoTrabalho > 0 && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Custo de mao de obra: <strong>{brl(results.custoTrabalho)}</strong>
                  {Number(form.custoKwh) > 0 && (
                    <>
                      {" "}
                      · Custo de energia (com kWh informado):{" "}
                      <strong>{brl(results.custoEnergia * numeric.quantidade)}</strong>
                    </>
                  )}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Leitura do Fatiador
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isSlicerMode
                      ? "A calculadora esta convertendo o peso/tempo total do fatiador para uma media por unidade e para o lote inteiro."
                      : "A calculadora esta usando os valores medios por unidade que voce informou manualmente."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">Media: {results.pesoUnitario.toFixed(2)}g/un.</Badge>
                  <Badge variant="secondary">
                    Media: {results.tempoUnitario.toFixed(1)} min/un.
                  </Badge>
                  <Badge variant="secondary">Impressoes no lote: {results.impressoesLote}</Badge>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Exemplo para o seu caso: se a peca pesa <strong>{form.pesoPeca || "64,05"}g</strong>{" "}
                e leva <strong>{form.tempoMin || "105"} min</strong> no fatiador, com{" "}
                <strong>{form.unidadesPorImpressao || "1"}</strong> unidade por impressao e pedido
                de <strong>{form.quantidade || "25"}</strong> pecas, o sistema usa essa media para
                sugerir um preco unitario e calcula o lote completo.
              </p>
            </div>

            {/* Results Panel — Donut + KPIs */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Calculator className="h-3.5 w-3.5" /> Resumo do Orçamento
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
                {/* Left: Donut Chart */}
                <div className="flex items-center justify-center">
                  <CalculatorDonutChart results={results} numeric={numeric} />
                </div>

                {/* Right: BIG highlight cards */}
                <div className="flex flex-col gap-3 min-w-[220px]">
                  <div className="relative overflow-hidden rounded-xl border-2 border-green-500/30 bg-green-50/30 p-4">
                    <div className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
                      Preco Sugerido /un.{" "}
                      <InfoTip
                        text={`Custo medio por unidade + ${form.margemPercent || 0}% de margem${Number(form.taxaGateway) > 0 ? ` + ${form.taxaGateway}% de taxa do gateway` : ""}.`}
                      />
                    </div>
                    <div
                      className="mt-1 font-display text-3xl font-bold tabular-nums"
                      style={{ color: ACCENT_COLORS.green }}
                    >
                      {brl(results.precoSugerido)}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 gap-1 text-xs"
                      onClick={() => setField("precoVenda", results.precoSugerido.toFixed(2))}
                    >
                      <Wand2 className="h-3 w-3" /> Aplicar
                    </Button>
                  </div>

                  <div
                    className={`relative overflow-hidden rounded-xl border-2 p-4 ${effectiveLotProfit >= 0 ? "border-green-500/30 bg-green-50/30" : "border-red-500/30 bg-red-50/30"}`}
                  >
                    <div className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
                      Lucro Liquido do Lote{" "}
                      <InfoTip
                        text={
                          numeric.precoVenda > 0
                            ? "Lucro do lote usando o Preco de Venda informado."
                            : "Lucro estimado do lote usando o Preco Sugerido, ja que ainda nao ha um Preco de Venda informado."
                        }
                      />
                    </div>
                    <div
                      className="mt-1 font-display text-3xl font-bold tabular-nums"
                      style={{
                        color:
                          effectiveLotProfit >= 0 ? ACCENT_COLORS.green : ACCENT_COLORS.magenta,
                      }}
                    >
                      {brl(effectiveLotProfit)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini cards grid */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ResultCard
                  label="Filamentos"
                  value={brl(
                    results.custoFilamentosDetalhado ?? results.custoFilamento * numeric.quantidade,
                  )}
                  accent="cyan"
                  tip="Custo total de todos os filamentos usados no lote."
                />
                <ResultCard
                  label="Energia"
                  value={brl(results.custoEnergia * numeric.quantidade)}
                  accent="yellow"
                  tip="Custo total de energia eletrica para o lote inteiro."
                />
                <ResultCard
                  label="Depreciacao"
                  value={brl(results.custoDepreciacao * numeric.quantidade)}
                  accent="orange"
                  tip="Custo de desgaste da maquina (amortizacao) para o lote inteiro."
                />
                <ResultCard
                  label="Custos Extras"
                  value={brl(results.custoExtraTotal ?? 0)}
                  accent="pink"
                  tip="Soma de todos os custos adicionais (embalagem, cola, etc.)"
                />
                <ResultCard
                  label="Mao de Obra"
                  value={brl(results.custoTrabalho ?? 0)}
                  accent="magenta"
                  tip="Custo de mao de obra (horas x valor hora)."
                />
                <ResultCard
                  label="Desperdicio"
                  value={brl(results.custoPerda * numeric.quantidade)}
                  accent="pink"
                  tip="Acrescimo para cobrir perdas, falhas ou retrabalho."
                />
                <ResultCard
                  label="Custo Total do Lote"
                  value={brl(results.custoLote)}
                  accent="magenta"
                  tip="Custo total estimado para entregar todo o pedido/lote informado."
                />
                {results.taxaGatewayAplicada ? (
                  <ResultCard
                    label="Taxa Gateway"
                    value={brl(results.taxaGatewayAplicada * numeric.quantidade)}
                    accent="orange"
                    tip="Valor da taxa de marketplace/gateway repassada ao preco."
                  />
                ) : null}
              </div>
            </div>

            {/* Sticky CTA bar */}
            <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex flex-wrap justify-end gap-3 rounded-b-2xl border-t border-border bg-card/95 px-6 py-4 backdrop-blur-sm">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleProjectAction("save-private")}
                      disabled={mutateAddProject.isPending}
                    >
                      {mutateAddProject.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                      Salvar Privado
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Salvar projeto sem publicar no site</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      className="gap-2"
                      onClick={() => handleProjectAction("save-publish")}
                      disabled={mutateAddProject.isPending}
                    >
                      {mutateAddProject.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Globe className="h-4 w-4" />
                      )}
                      Salvar e Publicar no Site
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Salvar e exibir no portfólio público</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="lg"
                      className="btn-filament gap-2 px-6"
                      onClick={() => handleProjectAction("create-order")}
                      disabled={mutateAddProject.isPending}
                    >
                      {mutateAddProject.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShoppingCart className="h-4 w-4" />
                      )}
                      Criar Pedido
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Salvar projeto e criar pedido imediatamente</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="gap-2 px-6"
                      onClick={() => handlePrintQuote()}
                    >
                      <Printer className="h-4 w-4" />
                      Imprimir Orçamento
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Gerar orçamento em PDF para enviar ao cliente</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </form>

          {/* Saved Projects */}
          <div className="filament-top rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-lg font-semibold">Projetos salvos</h2>
              <div className="flex items-center gap-3">
                <SearchInput
                  value={projectSearch}
                  onChange={setProjectSearch}
                  placeholder="Buscar projeto..."
                />
                <span className="text-xs text-muted-foreground">
                  {filteredProjects.length} de {projects.length}
                </span>
              </div>
            </div>
            {projects.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                Nenhum projeto ainda. Calcule e salve seu primeiro lote acima.
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                Nenhum projeto encontrado para “{projectSearch}”.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">Custo/un.</TableHead>
                    <TableHead className="text-right">Perda</TableHead>
                    <TableHead className="text-right">Custo lote</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                    <TableHead className="w-40" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((p) => {
                    // P2-2: esta tabela usava calcPortfolioPricing (versão sem
                    // multi-filamento/custos extras/taxa de gateway/mão de
                    // obra), enquanto o resumo de totais logo abaixo já usava
                    // calcAdvancedPortfolioPricing com os mesmos dados — as
                    // duas podiam mostrar lucro diferente para o mesmo
                    // projeto sempre que ele usasse algum desses campos.
                    const r = calcAdvancedPortfolioPricing({
                      custoRolo: p.custoRolo,
                      pesoRolo: p.pesoRolo,
                      pesoEntrada: p.pesoPeca,
                      tempoEntradaMin: p.tempoMin,
                      quantidade: p.quantidade,
                      precoVenda: p.precoVenda,
                      perdaPercent: p.perdaPercent ?? 0,
                      entryMode: "unit",
                      unidadesPorImpressao: 1,
                      settings,
                      filamentos: p.filamentos,
                      custosExtras: p.custosExtras,
                      taxaGateway: p.taxaGateway ?? 0,
                      custoTrabalhoHoras: p.custoTrabalhoHoras ?? 0,
                      custoTrabalhoValorHora: p.custoTrabalhoValorHora ?? 0,
                      custoKwhOverride: p.custoKwh ?? 0,
                    });
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {p.nome}
                            <VisibilityBadge isPublic={p.isPublic ?? true} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{p.categoria}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              mutateUpdateProject.mutate({
                                id: p.id,
                                nome: p.nome,
                                categoria: p.categoria,
                                linkModelo: p.linkModelo ?? null,
                                filamentoId: p.filamentoId ?? null,
                                custoRolo: p.custoRolo,
                                pesoRolo: p.pesoRolo,
                                pesoPeca: p.pesoPeca,
                                tempoMin: p.tempoMin,
                                quantidade: p.quantidade,
                                precoVenda: p.precoVenda,
                                perdaPercent: p.perdaPercent ?? null,
                                isPublic: !(p.isPublic ?? true),
                                filamentos: p.filamentos,
                                custosExtras: p.custosExtras,
                                custoKwh: p.custoKwh ?? null,
                                custoTrabalhoHoras: p.custoTrabalhoHoras ?? null,
                                custoTrabalhoValorHora: p.custoTrabalhoValorHora ?? null,
                                taxaGateway: p.taxaGateway ?? null,
                              });
                            }}
                            aria-label={p.isPublic ? "Tornar privado" : "Tornar público"}
                            title={p.isPublic ? "Tornar privado" : "Tornar público"}
                          >
                            {p.isPublic ? (
                              <Globe className="h-4 w-4" />
                            ) : (
                              <Lock className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {p.linkModelo ? (
                            <a
                              href={p.linkModelo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Ver modelo</span>
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{p.quantidade}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {brl(r.custoUnidade)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {p.perdaPercent ? `${p.perdaPercent}%` : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {brl(r.custoLote)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {brl(r.receitaTotal)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums font-semibold",
                            r.lucroLiquido >= 0 ? "filament-text" : "text-destructive",
                          )}
                        >
                          {brl(r.lucroLiquido)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setOrderDialog({
                                  open: true,
                                  projectId: p.id,
                                  client: "",
                                  clientId: "",
                                  quantity: String(p.quantidade ?? 1),
                                })
                              }
                            >
                              Criar pedido
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditProject(p)}
                              aria-label="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => mutateRemoveProject.mutate(p.id)}
                              aria-label="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
      </TooltipProvider>
    );
  }

  /* ═══════════ ORDERS TAB ═══════════ */
  function renderOrdersTab() {
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
          <SearchInput
            value={orderSearch}
            onChange={setOrderSearch}
            placeholder="Buscar pedido..."
          />
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
              {terminalOrders.map((o) => {
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
                      <span className="text-muted-foreground">
                        Custo: R$ {cost.total.toFixed(2)}
                      </span>
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
          </div>
        )}
      </div>
    );
  }
}
