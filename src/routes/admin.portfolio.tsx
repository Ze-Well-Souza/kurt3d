import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  Clock, Package, User, Plus, MapPin, ExternalLink, Layers, CreditCard, CalendarDays,
  Trash2, Calculator, ListChecks, Eye, AlertTriangle, Pencil, Search, Info, Wand2, Download,
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
import { brl } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  addOrder, finalizarDestino, updateOrderStatus, removeOrder,
  addPortfolioProject, createOrderFromPortfolio, removePortfolioProject,
  updateOrder, updatePortfolioProject, uploadOrderAsset, resolveOrderAssetUrl, updateOrderPartStatus,
} from "@/lib/api/data.functions";
import type { Order, OrderPart, OrderPartStatus, Status, Filamento, AppSettings, PortfolioProject, CalculatorFilamentoInput, CalculatorExtraCost } from "@/lib/domain/types";
import { DEFAULT_APP_SETTINGS } from "@/lib/domain/types";
import { SearchInput } from "@/components/SearchInput";
import { calcOrderCostHybrid } from "@/lib/domain/cost";
import { getOrderAssetFileName, isOrderAssetReference } from "@/lib/domain/order-asset";
import { computeOrderTotalsFromParts, summarizeOrderParts } from "@/lib/domain/order-parts";
import { getOrderTrackingSummary } from "@/lib/domain/order-tracking";
import {
  type BambuPresetId,
  calcPortfolioPricing,
  calcAdvancedPortfolioPricing,
  type PortfolioCalculatorEntryMode,
} from "@/lib/domain/portfolio-pricing";
import { useOrders } from "@/lib/hooks/use-orders";
import { useFilamentos } from "@/lib/hooks/use-filamentos";
import { usePortfolio } from "@/lib/hooks/use-portfolio";
import { useClients } from "@/lib/hooks/use-clients";
import { useSettings } from "@/lib/hooks/use-settings";
import { useToastErrorHandler } from "@/lib/hooks/use-toast-error-handler";
import { normalizeText } from "@/lib/utils/normalization";

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

function getPaymentBadge(order: Order) {
  const hasFinancialIntent = order.status === "vendido" || !!order.formaPagamento || order.valorRecebido !== undefined;
  if (!hasFinancialIntent) return null;
  if (order.dataPagamento) {
    return { label: "Pago", className: "border-green-600/30 bg-green-50 text-green-700" };
  }
  return { label: "Pendente", className: "border-yellow-600/30 bg-yellow-50 text-yellow-700" };
}

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
  entryMode: PortfolioCalculatorEntryMode;
  unidadesPorImpressao: string;
  modeloPreset: BambuPresetId; precoImpressora: string; vidaUtilHoras: string; margemPercent: string;
  // New multi-filament + cost fields
  filamentos: CalculatorFilamentoInput[];
  custosExtras: CalculatorExtraCost[];
  custoKwh: string;
  consumoKw: string;
  custoTrabalhoHoras: string;
  custoTrabalhoValorHora: string;
  taxaGateway: string;
};
const FALLBACK_CUSTO_ROLO = 120;
const FALLBACK_PESO_ROLO = 1000;
const FALLBACK_QUANTIDADE = 10;

function buildEmptyFilamentoItem(): CalculatorFilamentoInput {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `fil-${Date.now()}-${Math.random()}`;
  return { id, source: "stock", precoRolo: 0, pesoRolo: 0, pesoUsado: 0 };
}

function buildEmptyExtraCost(): CalculatorExtraCost {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `ec-${Date.now()}-${Math.random()}`;
  return { id, nome: "", custo: 0, quantidade: 1 };
}

const initialForm: FormState = {
  nome: "", categoria: "Chaveiro", linkModelo: "", filamentoId: "",
  custoRolo: String(FALLBACK_CUSTO_ROLO), pesoRolo: String(FALLBACK_PESO_ROLO), pesoPeca: "", tempoMin: "",
  quantidade: String(FALLBACK_QUANTIDADE), precoVenda: "", perdaPercent: "0",
  entryMode: "slicer", unidadesPorImpressao: "1",
  modeloPreset: "A1", precoImpressora: "5299", vidaUtilHoras: "2000", margemPercent: "30",
  filamentos: [buildEmptyFilamentoItem()],
  custosExtras: [],
  custoKwh: "",
  consumoKw: "",
  custoTrabalhoHoras: "",
  custoTrabalhoValorHora: "",
  taxaGateway: "0",
};

const NO_CLIENT_SELECTED = "__none__";
const MAX_ORDER_ASSET_SIZE = 25 * 1024 * 1024;
const ORDER_ASSET_ACCEPT = ".stl,.3mf,model/stl,application/sla,application/vnd.ms-package.3dmanufacturing-3dmodel+xml";
const ORDER_PART_STATUS_LABEL: Record<OrderPartStatus, string> = {
  todo: "A fazer",
  printing: "Imprimindo",
  done: "Concluida",
  falha: "Falha",
};

type NewOrderPartForm = {
  id: string;
  nome: string;
  quantity: string;
  timeMinutes: string;
  gramsPerUnit: string;
  linkProjeto: string;
  notes: string;
  file: File | null;
};

function formatTime(min: number) {
  const h = Math.floor(min / 60); const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.ceil(bytes / 1024)} KB`;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

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

function buildEmptyOrderPart(): NewOrderPartForm {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `part-${Date.now()}-${Math.random()}`;
  return {
    id,
    nome: "",
    quantity: "1",
    timeMinutes: "",
    gramsPerUnit: "",
    linkProjeto: "",
    notes: "",
    file: null,
  };
}

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */
function CalcPedidos() {
  const qc = useQueryClient();
  const { data: ordersData } = useOrders();
  const { data: filamentosData } = useFilamentos();
  const { data: portfolioData } = usePortfolio();
  const { data: clientsData } = useClients();
  const { data: settingsData } = useSettings();
  const handleUpdateError = useToastErrorHandler({ fallbackMessage: "Erro ao atualizar." });
  const orders = ordersData ?? [];
  const filamentos = filamentosData?.filamentos ?? [];
  const projects = portfolioData ?? [];
  const clients = clientsData ?? [];
  const settings = settingsData ?? DEFAULT_APP_SETTINGS;
  const [activeTab, setActiveTab] = useState<"calc" | "orders">("calc");
  const [form, setForm] = useState<FormState>({
    ...initialForm,
    custoRolo: initialForm.custoRolo,
    pesoRolo: String(settings.defaultPesoRolo || FALLBACK_PESO_ROLO),
    quantidade: String(settings.defaultQuantidade || FALLBACK_QUANTIDADE),
  });

  const invalidateOrders = () => qc.invalidateQueries({ queryKey: ["orders"] });
  const invalidatePortfolio = () => qc.invalidateQueries({ queryKey: ["portfolio"] });

  /* ── mutations ── */
  const mutateAddProject = useMutation({ mutationFn: (input: any) => addPortfolioProject({ data: input }), onSuccess: () => invalidatePortfolio() });
  const mutateRemoveProject = useMutation({ mutationFn: (id: string) => removePortfolioProject({ data: { id } }), onSuccess: () => invalidatePortfolio() });
  const mutateCreateOrder = useMutation({ mutationFn: (input: { portfolioProjectId: string; client: string; clientId?: string; quantity: number }) => createOrderFromPortfolio({ data: input }), onSuccess: () => invalidateOrders() });
  const mutateStatus = useMutation({ mutationFn: (input: { orderId: string; status: "todo" | "printing" | "done" }) => updateOrderStatus({ data: input }), onSuccess: () => invalidateOrders() });
  const mutateAddOrder = useMutation({ mutationFn: (input: any) => addOrder({ data: input }), onSuccess: () => invalidateOrders() });
  const mutateFinalizar = useMutation({ mutationFn: (input: any) => finalizarDestino({ data: input }), onSuccess: () => invalidateOrders() });
  const mutateRemoveOrder = useMutation({ mutationFn: (input: { orderId: string; reason: string }) => removeOrder({ data: input }), onSuccess: () => { invalidateOrders(); toast.success("Pedido excluído."); } });
  const mutateUpdateOrder = useMutation({ mutationFn: (input: any) => updateOrder({ data: input }), onSuccess: () => { invalidateOrders(); toast.success("Pedido atualizado."); }, onError: handleUpdateError });
  const mutateUpdateProject = useMutation({ mutationFn: (input: any) => updatePortfolioProject({ data: input }), onSuccess: () => { invalidatePortfolio(); toast.success("Projeto atualizado."); }, onError: handleUpdateError });
  const mutateUploadOrderAsset = useMutation({
    mutationFn: (input: { fileName: string; contentType: string; dataBase64: string }) => uploadOrderAsset({ data: input }),
  });
  const mutateResolveOrderAssetUrl = useMutation({
    mutationFn: (reference: string) => resolveOrderAssetUrl({ data: { reference } }),
  });
  const mutateUpdateOrderPartStatus = useMutation({
    mutationFn: (input: { orderId: string; partId: string; status: OrderPartStatus }) => updateOrderPartStatus({ data: input }),
    onError: handleUpdateError,
    onSuccess: () => invalidateOrders(),
  });

  /* ── calculator state ── */
  const numeric = useMemo(() => {
    const parsedPesoRolo = Number(form.pesoRolo) || settings.defaultPesoRolo || FALLBACK_PESO_ROLO;
    const parsedQuantidade = Number(form.quantidade) || settings.defaultQuantidade || FALLBACK_QUANTIDADE;
    const parsedCustoRolo = Number(form.custoRolo) || FALLBACK_CUSTO_ROLO;
    return {
      custoRolo: parsedCustoRolo,
      pesoRolo: parsedPesoRolo,
      pesoEntrada: Number(form.pesoPeca) || 0,
      tempoEntradaMin: Number(form.tempoMin) || 0,
      quantidade: parsedQuantidade,
      precoVenda: Number(form.precoVenda) || 0,
      perdaPercent: Number(form.perdaPercent) || 0,
      entryMode: form.entryMode,
      unidadesPorImpressao: Number(form.unidadesPorImpressao) || 1,
      modeloPreset: form.modeloPreset,
      precoImpressora: Number(form.precoImpressora) || 0,
      vidaUtilHoras: Number(form.vidaUtilHoras) || 0,
      margemPercent: Number(form.margemPercent) || 0,
      filamentos: form.filamentos,
      custosExtras: form.custosExtras,
      taxaGateway: Number(form.taxaGateway) || 0,
      custoTrabalhoHoras: Number(form.custoTrabalhoHoras) || 0,
      custoTrabalhoValorHora: Number(form.custoTrabalhoValorHora) || 0,
      custoKwhOverride: Number(form.custoKwh) || 0,
      consumoKwOverride: Number(form.consumoKw) || 0,
    };
  }, [form, settings]);
  const results = useMemo(() => calcAdvancedPortfolioPricing({ ...numeric, settings }), [numeric, settings]);
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const isSlicerMode = form.entryMode === "slicer";
  const effectiveUnitPrice = numeric.precoVenda > 0 ? numeric.precoVenda : results.precoSugerido;
  const effectiveLotProfit = effectiveUnitPrice * numeric.quantidade - results.custoLote;

  const totals = useMemo(() => projects.reduce((acc, p) => {
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
      consumoKwOverride: p.custoKwOverride ?? 0,
    });
    acc.lucro += r.lucroLiquido; acc.receita += r.receitaTotal; return acc;
  }, { lucro: 0, receita: 0 }), [projects, settings]);

  /* ── order dialogs ── */
  const [orderDialog, setOrderDialog] = useState<{ open: boolean; projectId: string; client: string; clientId: string; quantity: string }>({ open: false, projectId: "", client: "", clientId: "", quantity: "1" });
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newOrder, setNewOrder] = useState({ client: "", clientId: "", projectName: "", quantity: "1", timeMinutes: "60", filamentoId: "", gramsPerUnit: "5", linkProjeto: "", multiPart: false, precoVenda: "", formaPagamento: "", dataPagamento: "" });
  const [newOrderAsset, setNewOrderAsset] = useState<File | null>(null);
  const [newOrderParts, setNewOrderParts] = useState<NewOrderPartForm[]>([buildEmptyOrderPart()]);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; orderId: string; reason: string }>({ open: false, orderId: "", reason: "" });
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editProject, setEditProject] = useState<PortfolioProject | null>(null);
  const [projectSearch, setProjectSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [updatingPartId, setUpdatingPartId] = useState<string | null>(null);

  function resetNewOrderForm() {
    setNewOrder({ client: "", clientId: "", projectName: "", quantity: "1", timeMinutes: "60", filamentoId: "", gramsPerUnit: "5", linkProjeto: "", multiPart: false, precoVenda: "", formaPagamento: "", dataPagamento: "" });
    setNewOrderAsset(null);
    setNewOrderParts([buildEmptyOrderPart()]);
  }

  async function openProjectReference(reference?: string | null) {
    if (!reference) return;
    try {
      let resolvedUrl = reference;
      if (isOrderAssetReference(reference)) {
        const response = await mutateResolveOrderAssetUrl.mutateAsync(reference);
        resolvedUrl = response.url;
      }
      window.open(resolvedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel abrir a referencia do projeto.");
    }
  }

  /* ── drag state ── */
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const grouped = useMemo(() => {
    const g: Record<Status, Order[]> = { todo: [], printing: [], done: [], vendido: [], presente: [], falha: [] };
    const searchLower = normalizeText(orderSearch);
    for (const o of orders) {
      if (searchLower && !normalizeText(o.projectName).includes(searchLower) && !normalizeText(o.client).includes(searchLower)) continue;
      g[o.status]?.push(o);
    }
    return g;
  }, [orders, orderSearch]);
  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const s = normalizeText(projectSearch);
    return projects.filter((p) => normalizeText(p.nome).includes(s) || normalizeText(p.categoria).includes(s));
  }, [projects, projectSearch]);
  const activeOrder = activeId ? orders.find((o) => o.id === activeId) ?? null : null;
  const terminalOrders = [...(grouped.vendido ?? []), ...(grouped.presente ?? []), ...(grouped.falha ?? [])];
  const newOrderPartsTotals = useMemo(() => computeOrderTotalsFromParts(
    newOrderParts.map((part) => ({
      quantity: Math.max(0, Number(part.quantity) || 0),
      timeMinutes: Math.max(0, Number(part.timeMinutes) || 0),
      gramsPerUnit: Math.max(0, Number(part.gramsPerUnit) || 0),
    })),
  ), [newOrderParts]);
  const newOrderPartSummary = useMemo(() => summarizeOrderParts(newOrderParts.map(() => ({ status: "todo" as const }))), [newOrderParts]);

  function updateNewOrderPartField(partId: string, field: keyof NewOrderPartForm, value: string | File | null) {
    setNewOrderParts((current) => current.map((part) => (part.id === partId ? { ...part, [field]: value } : part)));
  }

  function addNewOrderPart() {
    setNewOrderParts((current) => [...current, buildEmptyOrderPart()]);
  }

  function removeNewOrderPart(partId: string) {
    setNewOrderParts((current) => {
      if (current.length <= 1) return current;
      return current.filter((part) => part.id !== partId);
    });
  }

  /* ── handlers ── */
  function submitProject(e: React.FormEvent) {
    e.preventDefault();
    const parsed = projectSchema.safeParse({
      ...form,
      custoRolo: Number(form.custoRolo),
      pesoRolo: Number(form.pesoRolo),
      pesoPeca: results.pesoUnitario,
      tempoMin: results.tempoUnitario,
      quantidade: Number(form.quantidade),
      precoVenda: Number(form.precoVenda),
      perdaPercent: Number(form.perdaPercent) || 0,
      linkModelo: form.linkModelo || undefined,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos"); return; }
    mutateAddProject.mutate({
      ...parsed.data,
      filamentoId: form.filamentoId || undefined,
      filamentos: form.filamentos.filter((f) => f.pesoUsado > 0),
      custosExtras: form.custosExtras.filter((c) => c.nome.trim() && c.custo > 0),
      custoKwh: Number(form.custoKwh) || null,
      custoKwOverride: Number(form.consumoKw) || null,
      custoTrabalhoHoras: Number(form.custoTrabalhoHoras) || null,
      custoTrabalhoValorHora: Number(form.custoTrabalhoValorHora) || null,
      taxaGateway: Number(form.taxaGateway) || null,
    });
    setForm({
      ...initialForm,
      pesoRolo: String(settings.defaultPesoRolo),
      quantidade: String(settings.defaultQuantidade),
      filamentos: [buildEmptyFilamentoItem()],
      custosExtras: [],
    });
    toast.success("Projeto salvo.");
  }
  async function submitNewOrder(e: React.FormEvent) {
    e.preventDefault();
    const selectedClient = clients.find((client) => client.id === newOrder.clientId);
    try {
      let partsPayload: Array<{
        nome: string;
        quantity: number;
        timeMinutes: number;
        gramsPerUnit: number;
        linkProjeto?: string;
        notes?: string;
      }> | undefined;

      if (newOrder.multiPart) {
        if (newOrderParts.length === 0) {
          toast.error("Adicione pelo menos uma parte ao pedido multi-partes.");
          return;
        }

        partsPayload = [];
        for (const [index, part] of newOrderParts.entries()) {
          const nome = part.nome.trim();
          const quantity = Number(part.quantity);
          const timeMinutes = Number(part.timeMinutes);
          const gramsPerUnit = Number(part.gramsPerUnit);
          if (!nome) {
            toast.error(`Informe o nome da parte ${index + 1}.`);
            return;
          }
          if (!Number.isInteger(quantity) || quantity < 1) {
            toast.error(`Informe uma quantidade valida para a parte ${index + 1}.`);
            return;
          }
          if (!Number.isFinite(timeMinutes) || timeMinutes <= 0) {
            toast.error(`Informe o tempo de impressao da parte ${index + 1}.`);
            return;
          }
          if (!Number.isFinite(gramsPerUnit) || gramsPerUnit <= 0) {
            toast.error(`Informe o peso em gramas da parte ${index + 1}.`);
            return;
          }

          let partLink = part.linkProjeto.trim() || undefined;
          if (part.file) {
            const dataBase64 = await fileToBase64(part.file);
            const uploaded = await mutateUploadOrderAsset.mutateAsync({
              fileName: part.file.name,
              contentType: part.file.type || "application/octet-stream",
              dataBase64,
            });
            partLink = uploaded.reference;
          }

          partsPayload.push({
            nome,
            quantity,
            timeMinutes,
            gramsPerUnit,
            linkProjeto: partLink,
            notes: part.notes.trim() || undefined,
          });
        }
      }

      let linkProjeto = newOrder.linkProjeto || undefined;
      if (newOrderAsset) {
        const dataBase64 = await fileToBase64(newOrderAsset);
        const uploaded = await mutateUploadOrderAsset.mutateAsync({
          fileName: newOrderAsset.name,
          contentType: newOrderAsset.type || "application/octet-stream",
          dataBase64,
        });
        linkProjeto = uploaded.reference;
      }

      await mutateAddOrder.mutateAsync({
        client: (selectedClient?.nome ?? newOrder.client.trim()) || "Cliente", clientId: selectedClient?.id,
        projectName: newOrder.projectName.trim() || "Pedido",
        quantity: Number(newOrder.quantity) || 1,
        timeMinutes: partsPayload?.length ? newOrderPartsTotals.timeMinutes : (Number(newOrder.timeMinutes) || 60),
        filamentoId: newOrder.filamentoId || undefined,
        gramsPerUnit: partsPayload?.length ? newOrderPartsTotals.gramsPerUnit : (newOrder.gramsPerUnit ? Number(newOrder.gramsPerUnit) : undefined),
        linkProjeto, multiPart: newOrder.multiPart,
        precoVenda: newOrder.precoVenda ? Number(newOrder.precoVenda) : undefined,
        formaPagamento: newOrder.formaPagamento || undefined, dataPagamento: newOrder.dataPagamento || undefined,
        parts: partsPayload,
      });
      setShowNewOrder(false);
      resetNewOrderForm();
      toast.success("Pedido criado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel criar o pedido.");
    }
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
          <form className="grid gap-4" onSubmit={(e) => {
            e.preventDefault();
            const selectedClient = clients.find((client) => client.id === orderDialog.clientId);
            mutateCreateOrder.mutate({
              portfolioProjectId: orderDialog.projectId,
              client: (selectedClient?.nome ?? orderDialog.client.trim()) || "Cliente",
              clientId: selectedClient?.id,
              quantity: Number(orderDialog.quantity) || 1,
            });
            setOrderDialog((s) => ({ ...s, open: false }));
            toast.success("Pedido criado na fila.");
          }}>
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
                <SelectTrigger><SelectValue placeholder="Sem vínculo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CLIENT_SELECTED}>Sem vínculo</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
      <Dialog open={showNewOrder} onOpenChange={(open) => { setShowNewOrder(open); if (!open) resetNewOrderForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Novo pedido</DialogTitle></DialogHeader>
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
                <SelectTrigger><SelectValue placeholder="Sem vínculo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CLIENT_SELECTED}>Sem vínculo</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>Cliente</Label><Input value={newOrder.client} onChange={(e) => setNewOrder((s) => ({ ...s, client: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Projeto</Label><Input value={newOrder.projectName} onChange={(e) => setNewOrder((s) => ({ ...s, projectName: e.target.value }))} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Quantidade</Label><Input type="number" min={1} value={newOrder.quantity} onChange={(e) => setNewOrder((s) => ({ ...s, quantity: e.target.value }))} /></div>
              <div className="grid gap-2">
                <Label>{newOrder.multiPart ? "Tempo total (calculado)" : "Tempo (min)"}</Label>
                <Input
                  type="number"
                  min={1}
                  value={newOrder.multiPart ? (newOrderPartsTotals.timeMinutes > 0 ? String(newOrderPartsTotals.timeMinutes) : "") : newOrder.timeMinutes}
                  onChange={(e) => setNewOrder((s) => ({ ...s, timeMinutes: e.target.value }))}
                  disabled={newOrder.multiPart}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Filamento</Label>
                <Select value={newOrder.filamentoId} onValueChange={(v) => setNewOrder((s) => ({ ...s, filamentoId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{filamentos.map((f) => (<SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{newOrder.multiPart ? "Gramas totais (calculado)" : "Gramas / unidade"}</Label>
                <Input
                  type="number"
                  min={0}
                  value={newOrder.multiPart ? (newOrderPartsTotals.gramsPerUnit > 0 ? String(newOrderPartsTotals.gramsPerUnit) : "") : newOrder.gramsPerUnit}
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
                O arquivo fica salvo em Storage para reimpressao futura. Se enviar um arquivo, ele sera a referencia principal do pedido.
              </p>
              {newOrderAsset && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                  <span className="truncate font-medium">{newOrderAsset.name}</span>
                  <span className="shrink-0 text-muted-foreground">{formatFileSize(newOrderAsset.size)}</span>
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Preço de Venda (R$)</Label><Input type="number" min={0} step={0.01} value={newOrder.precoVenda} onChange={(e) => setNewOrder((s) => ({ ...s, precoVenda: e.target.value }))} placeholder="0,00" /></div>
              <div className="flex items-end"><Button type="button" variant={newOrder.multiPart ? "default" : "outline"} className="flex-1 gap-2" onClick={() => {
                setNewOrder((s) => ({ ...s, multiPart: !s.multiPart }));
                setNewOrderParts((current) => (current.length > 0 ? current : [buildEmptyOrderPart()]));
              }}><Layers className="h-4 w-4" />{newOrder.multiPart ? "Multi-partes" : "Peça única"}</Button></div>
            </div>
            {newOrder.multiPart && (
              <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Partes do pedido</p>
                    <p className="text-xs text-muted-foreground">
                      Cadastre cada parte com seu tempo, peso e arquivo opcional. Os totais do pedido sao somados automaticamente.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addNewOrderPart}>
                    <Plus className="h-4 w-4" />
                    Adicionar parte
                  </Button>
                </div>
                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    <span className="font-medium text-foreground">{newOrderPartSummary.total}</span> partes
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    <span className="font-medium text-foreground">{formatTime(Math.round(newOrderPartsTotals.timeMinutes))}</span> tempo total
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    <span className="font-medium text-foreground">{newOrderPartsTotals.gramsPerUnit.toFixed(2)}g</span> consumo total
                  </div>
                </div>
                <div className="space-y-4">
                  {newOrderParts.map((part, index) => (
                    <div key={part.id} className="space-y-3 rounded-xl border border-border bg-background p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">Parte {index + 1}</p>
                          <p className="text-xs text-muted-foreground">Cada linha representa uma subpeca do pedido final.</p>
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
                          <Input value={part.nome} onChange={(e) => updateNewOrderPartField(part.id, "nome", e.target.value)} placeholder="Ex.: Cabeca, Base, Braço esquerdo" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Quantidade desta parte</Label>
                          <Input type="number" min={1} value={part.quantity} onChange={(e) => updateNewOrderPartField(part.id, "quantity", e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                          <Label>Tempo por unidade (min)</Label>
                          <Input type="number" min={0.1} step={0.1} value={part.timeMinutes} onChange={(e) => updateNewOrderPartField(part.id, "timeMinutes", e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                          <Label>Gramas por unidade</Label>
                          <Input type="number" min={0.01} step={0.01} value={part.gramsPerUnit} onChange={(e) => updateNewOrderPartField(part.id, "gramsPerUnit", e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                          <Label>Link externo da parte</Label>
                          <Input type="url" value={part.linkProjeto} onChange={(e) => updateNewOrderPartField(part.id, "linkProjeto", e.target.value)} placeholder="https://..." />
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
                              <span className="shrink-0 text-muted-foreground">{formatFileSize(part.file.size)}</span>
                            </div>
                          )}
                        </div>
                        <div className="grid gap-2 sm:col-span-2">
                          <Label>Observacoes</Label>
                          <Textarea rows={2} value={part.notes} onChange={(e) => updateNewOrderPartField(part.id, "notes", e.target.value)} placeholder="Observacoes de encaixe, orientacao, cor, suporte..." />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              <Button type="button" variant="outline" onClick={() => { setShowNewOrder(false); resetNewOrderForm(); }}>Cancelar</Button>
              <Button type="submit" className="btn-filament" disabled={mutateAddOrder.isPending || mutateUploadOrderAsset.isPending}>
                {mutateAddOrder.isPending || mutateUploadOrderAsset.isPending ? "Salvando..." : "Criar"}
              </Button>
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
            const tracking = getOrderTrackingSummary(detailOrder);
            const trackingPath = `/acompanhar`;
            const parts = detailOrder.parts ?? [];
            const partsSummary = summarizeOrderParts(parts);
            const partsTotals = parts.length > 0 ? computeOrderTotalsFromParts(parts) : null;
            const partStatusLocked = ["vendido", "presente", "falha"].includes(detailOrder.status);
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
                  {parts.length > 0 && <DetailItem label="Partes" value={`${partsSummary.total} cadastradas`} />}
                  <DetailItem label="Preço de Venda" value={detailOrder.precoVenda ? brl(detailOrder.precoVenda) : "—"} />
                  <DetailItem label="Custo Total" value={brl(cost.total)} />
                  {detailOrder.precoVenda && <DetailItem label="Lucro" value={brl((detailOrder.precoVenda * detailOrder.quantity) - cost.total)} accent={(detailOrder.precoVenda * detailOrder.quantity) - cost.total >= 0} />}
                  <DetailItem label="Forma Pagamento" value={detailOrder.formaPagamento ?? "—"} />
                  <DetailItem label="Data Pagamento" value={detailOrder.dataPagamento ? new Date(detailOrder.dataPagamento).toLocaleDateString("pt-BR") : "—"} />
                  {detailOrder.valorRecebido !== undefined && <DetailItem label="Valor Recebido" value={brl(detailOrder.valorRecebido)} />}
                  {detailOrder.destino && <DetailItem label="Destino" value={detailOrder.destino} />}
                  <DetailItem label="Codigo de acompanhamento" value={tracking.trackingCode} mono />
                  <DetailItem label="Previsao operacional" value={tracking.estimatedDeliveryAt ? new Date(tracking.estimatedDeliveryAt).toLocaleDateString("pt-BR") : "—"} />
                  <DetailItem label="Criado em" value={new Date(detailOrder.createdAt).toLocaleDateString("pt-BR")} />
                </div>
                {parts.length > 0 && (
                  <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Partes do pedido</p>
                        <p className="text-xs text-muted-foreground">
                          {partsSummary.done} concluidas, {partsSummary.printing} imprimindo, {partsSummary.todo} a fazer, {partsSummary.failed} com falha.
                        </p>
                      </div>
                      {partsTotals && (
                        <div className="text-xs text-muted-foreground">
                          Total: <span className="font-medium text-foreground">{formatTime(Math.round(partsTotals.timeMinutes))}</span>
                          {" · "}
                          <span className="font-medium text-foreground">{partsTotals.gramsPerUnit.toFixed(2)}g</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      {parts.map((part) => (
                        <div key={part.id} className="rounded-xl border border-border bg-background p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">{part.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {part.quantity}x · {formatTime(Math.round(part.timeMinutes))}/un. · {part.gramsPerUnit.toFixed(2)}g/un.
                              </p>
                            </div>
                            <Select
                              value={part.status}
                              disabled={partStatusLocked || updatingPartId === part.id}
                              onValueChange={(value) => {
                                const nextStatus = value as OrderPartStatus;
                                setUpdatingPartId(part.id);
                                void mutateUpdateOrderPartStatus.mutateAsync({
                                  orderId: detailOrder.id,
                                  partId: part.id,
                                  status: nextStatus,
                                }).then(() => {
                                  setDetailOrder((current) => current && current.id === detailOrder.id
                                    ? {
                                      ...current,
                                      updatedAt: new Date().toISOString(),
                                      parts: (current.parts ?? []).map((currentPart) => (
                                        currentPart.id === part.id
                                          ? { ...currentPart, status: nextStatus, updatedAt: new Date().toISOString() }
                                          : currentPart
                                      )),
                                    }
                                    : current);
                                  toast.success("Status da parte atualizado.");
                                }).catch(() => {
                                  // handled by mutation onError
                                }).finally(() => {
                                  setUpdatingPartId(null);
                                });
                              }}
                            >
                              <SelectTrigger className="w-[170px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(ORDER_PART_STATUS_LABEL).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {part.notes && <p className="mt-2 text-xs text-muted-foreground">{part.notes}</p>}
                          {part.linkProjeto && (
                            <Button
                              type="button"
                              variant="ghost"
                              className="mt-2 h-auto px-0 text-xs text-blue-500 hover:text-blue-600"
                              onClick={() => void openProjectReference(part.linkProjeto)}
                            >
                              {isOrderAssetReference(part.linkProjeto) ? <Download className="mr-1 h-3 w-3" /> : <ExternalLink className="mr-1 h-3 w-3" />}
                              {isOrderAssetReference(part.linkProjeto) ? `Abrir ${getOrderAssetFileName(part.linkProjeto) ?? "arquivo da parte"}` : "Ver referencia da parte"}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
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
                    {isOrderAssetReference(detailOrder.linkProjeto) ? <Download className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                    {isOrderAssetReference(detailOrder.linkProjeto) ? `Abrir ${getOrderAssetFileName(detailOrder.linkProjeto) ?? "arquivo"}` : "Ver projeto"}
                  </Button>
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
              const selectedClientId = (fd.get("clientId") as string) || "";
              const selectedClient = clients.find((client) => client.id === selectedClientId);
              mutateUpdateOrder.mutate({
                orderId: editOrder.id,
                client: (selectedClient?.nome ?? (fd.get("client") as string)?.trim()) || editOrder.client,
                projectName: (fd.get("projectName") as string)?.trim() || editOrder.projectName,
                quantity: Number(fd.get("quantity")) || editOrder.quantity,
                timeMinutes: Number(fd.get("timeMinutes")) || editOrder.timeMinutes,
                filamentoId: (fd.get("filamentoId") as string) || null,
                gramsPerUnit: Number(fd.get("gramsPerUnit")) || null,
                precoVenda: Number(fd.get("precoVenda")) || null,
                linkProjeto: ((fd.get("linkProjeto") as string)?.trim()) || (isOrderAssetReference(editOrder.linkProjeto) ? editOrder.linkProjeto : null),
                multiPart: editOrder.parts?.length ? true : (editOrder.multiPart ?? false),
                formaPagamento: (fd.get("formaPagamento") as string) || null,
                dataPagamento: (fd.get("dataPagamento") as string) || null,
                clientId: selectedClient?.id ?? null,
              });
              setEditOrder(null);
            }}>
              <div className="grid gap-2">
                <Label>Cliente Cadastrado</Label>
                <Select name="clientId" defaultValue={editOrder.clientId ?? NO_CLIENT_SELECTED}>
                  <SelectTrigger><SelectValue placeholder="Sem vínculo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CLIENT_SELECTED}>Sem vínculo</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>{client.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Cliente</Label>
                <Input name="client" defaultValue={editOrder.client} />
              </div>
              <div className="grid gap-2"><Label>Projeto</Label>
                <Input name="projectName" defaultValue={editOrder.projectName} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2"><Label>Quantidade</Label><Input name="quantity" type="number" min={1} defaultValue={editOrder.quantity} /></div>
                <div className="grid gap-2"><Label>{editOrder.parts?.length ? "Tempo total (calculado)" : "Tempo (min)"}</Label><Input name="timeMinutes" type="number" min={1} defaultValue={editOrder.timeMinutes} disabled={Boolean(editOrder.parts?.length)} /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2"><Label>Filamento</Label>
                  <Select name="filamentoId" defaultValue={editOrder.filamentoId ?? ""}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{filamentos.map((f) => (<SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>{editOrder.parts?.length ? "Gramas totais (calculado)" : "Gramas / unidade"}</Label><Input name="gramsPerUnit" type="number" min={0} defaultValue={editOrder.gramsPerUnit ?? ""} disabled={Boolean(editOrder.parts?.length)} /></div>
              </div>
              {editOrder.parts?.length ? (
                <p className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  Este pedido usa multi-partes. Tempo e consumo total sao recalculados automaticamente a partir das partes no detalhe do pedido.
                </p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2"><Label>Preço de Venda (R$)</Label><Input name="precoVenda" type="number" min={0} step={0.01} defaultValue={editOrder.precoVenda ?? ""} /></div>
                <div className="grid gap-2">
                  <Label>Link do Projeto</Label>
                  <Input name="linkProjeto" type="text" defaultValue={isOrderAssetReference(editOrder.linkProjeto) ? "" : (editOrder.linkProjeto ?? "")} placeholder={isOrderAssetReference(editOrder.linkProjeto) ? "Arquivo STL/3MF ja salvo neste pedido" : ""} />
                  {isOrderAssetReference(editOrder.linkProjeto) && (
                    <button type="button" className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline" onClick={() => void openProjectReference(editOrder.linkProjeto)}>
                      <Download className="h-3.5 w-3.5" />
                      Abrir {getOrderAssetFileName(editOrder.linkProjeto) ?? "arquivo salvo"}
                    </button>
                  )}
                </div>
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
          </div>

          {/* ── Bloco 2: Impressora (Bambu Lab A1) ── */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Calculator className="h-3.5 w-3.5" /> Impressora e Amortização
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <div className="md:col-span-1">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Modelo</label>
                <div className="flex h-10 items-center rounded-md border border-border bg-background px-3 text-sm">
                  Bambu Lab A1 — 150W
                </div>
              </div>
              <NumberField label="Preço da Impressora (R$)" value={form.precoImpressora} onChange={(v) => setField("precoImpressora", v)} placeholder="5299,00" tip="Quanto você pagou pela impressora. Usado para calcular a amortização (desgaste) por hora. Sua A1: R$ 5.299." />
              <NumberField label="Vida Útil (horas)" value={form.vidaUtilHoras} onChange={(v) => setField("vidaUtilHoras", v)} placeholder="2000" step="100" tip="Quantas horas você espera que a impressora dure antes de precisar trocar partes principais. Padrão: 2000h (~2-3 anos de uso intenso)." />
              <NumberField label="% Margem de Lucro" value={form.margemPercent} onChange={(v) => setField("margemPercent", v)} placeholder="30" step="1" tip="Percentual de lucro sobre o custo. Ex.: custo R$ 2, margem 30% → preço sugerido R$ 2,60. O bambucostpro.com usa 30% como padrão." />
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Amortização calculada: <strong className="filament-text">{brl(results.amortHora)}/h</strong> (Preço ÷ Vida útil) · Consumo: <strong>{(Number(form.consumoKw) || results.consumoKw * 1000).toFixed(0)}W</strong>
              {Number(form.consumoKw) > 0 && " (manual)"}
            </p>
          </div>

          {/* ── Bloco 3: Peça, tempo e lote ── */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Modo de Entrada"
              tip="Use 'Dados do Fatiador' quando for copiar peso e tempo direto do Bambu Studio/OrcaSlicer. Use 'Ja tenho media por unidade' se voce ja sabe os valores medios por nome."
              className="md:col-span-2"
            >
              <Select value={form.entryMode} onValueChange={(v) => setField("entryMode", v as PortfolioCalculatorEntryMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <NumberField
              label={isSlicerMode ? "Tempo do Fatiamento (min)" : "Tempo Medio por Unidade (min)"}
              value={form.tempoMin}
              onChange={(v) => setField("tempoMin", v)}
              placeholder={isSlicerMode ? "105" : "35"}
              tip={
                isSlicerMode
                  ? "Copie o tempo total do fatiamento dessa placa. Ex.: 'Tempo total' de 1h45 = 105 minutos."
                  : "Informe o tempo medio para produzir UMA unidade. Se voce ja calculou manualmente, use este modo."
              }
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
            <NumberField label="% Desperdício" value={form.perdaPercent} onChange={(v) => setField("perdaPercent", v)} placeholder="0" step="1" tip="Percentual estimado de impressões que falham, descolam ou saem com defeito. Comece com 0%. Depois de imprimir um tempo, se 1 em 20 falha = 5%. Cobre prejuízos no preço final." />
            <div className="lg:col-span-2">
              <NumberField label="Preço de Venda (R$)" value={form.precoVenda} onChange={(v) => setField("precoVenda", v)} placeholder="15,00" tip="Quanto você cobra por UMA peça. Use o 'Aplicar sugerido' ao lado para preencher automaticamente com base na sua margem." />
            </div>
          </div>

          {/* ═══════ LISTA DINAMICA DE FILAMENTOS ═══════ */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Layers className="h-3.5 w-3.5" /> Filamentos
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => {
                const novo = buildEmptyFilamentoItem();
                setField("filamentos", [...form.filamentos, novo]);
              }}>
                <Plus className="h-3.5 w-3.5" /> Adicionar Filamento
              </Button>
            </div>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Adicone quantos filamentos forem necessarios. O custo de material e a soma de (Peso Usado x Custo por grama) de todos os itens.
            </p>
            <div className="space-y-3">
              {form.filamentos.map((fil, idx) => {
                const filFromStock = fil.source === "stock" && fil.filamentoId
                  ? filamentos.find((f) => f.id === fil.filamentoId)
                  : undefined;
                return (
                  <div key={fil.id} className="rounded-xl border border-border bg-background p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Filamento {idx + 1}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (form.filamentos.length <= 1) return;
                          setField("filamentos", form.filamentos.filter((_, i) => i !== idx));
                        }}
                        disabled={form.filamentos.length <= 1}
                        aria-label="Remover filamento">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="mb-2 flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground">Origem:</span>
                      <button type="button"
                        className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-colors", fil.source === "stock" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                        onClick={() => {
                          const updated = [...form.filamentos];
                          updated[idx] = { ...updated[idx], source: "stock", filamentoId: undefined, sku: undefined, marca: undefined, cor: undefined, precoRolo: 0, pesoRolo: 0 };
                          setField("filamentos", updated);
                        }}>
                        Puxar do Estoque
                      </button>
                      <button type="button"
                        className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-colors", fil.source === "manual" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                        onClick={() => {
                          const updated = [...form.filamentos];
                          updated[idx] = { ...updated[idx], source: "manual", filamentoId: undefined };
                          setField("filamentos", updated);
                        }}>
                        Insercao Manual
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {fil.source === "stock" ? (
                        <div className="sm:col-span-2 lg:col-span-2">
                          <Field label="Filamento (Rolo)" tip="Selecione um rolo do estoque. Preco e peso sao preenchidos automaticamente.">
                            <Select value={fil.filamentoId ?? ""} onValueChange={(v) => {
                              const f = filamentos.find((x) => x.id === v);
                              const updated = [...form.filamentos];
                              updated[idx] = {
                                ...updated[idx],
                                filamentoId: v,
                                sku: f?.sku ?? null,
                                marca: f?.marca ?? null,
                                cor: f?.cor ?? null,
                                precoRolo: f?.precoPago ?? 0,
                                pesoRolo: f?.pesoInicial ?? 0,
                              };
                              setField("filamentos", updated);
                            }}>
                              <SelectTrigger><SelectValue placeholder="Selecione o rolo" /></SelectTrigger>
                              <SelectContent>{filamentos.map((f: any) => (<SelectItem key={f.id} value={f.id}>[{f.sku}] {f.marca} - {f.cor} (Disponivel {(f.disponivelGrams ?? f.pesoAtual)}g)</SelectItem>))}</SelectContent>
                            </Select>
                          </Field>
                          {filFromStock && (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              Rolo: R$ {filFromStock.precoPago.toFixed(2)} · {filFromStock.pesoInicial}g · R$ {(filFromStock.precoPago / filFromStock.pesoInicial).toFixed(4)}/g
                            </p>
                          )}
                        </div>
                      ) : (
                        <>
                          <NumberField label="Preco do Rolo (R$)" value={String(fil.precoRolo || "")} onChange={(v) => {
                            const updated = [...form.filamentos];
                            updated[idx] = { ...updated[idx], precoRolo: Number(v) || 0 };
                            setField("filamentos", updated);
                          }} placeholder="120,00" />
                          <NumberField label="Peso do Rolo (g)" value={String(fil.pesoRolo || "")} onChange={(v) => {
                            const updated = [...form.filamentos];
                            updated[idx] = { ...updated[idx], pesoRolo: Number(v) || 0 };
                            setField("filamentos", updated);
                          }} placeholder="1000" />
                        </>
                      )}
                      <NumberField label="Peso Usado na Impressao (g)" value={String(fil.pesoUsado || "")} onChange={(v) => {
                        const updated = [...form.filamentos];
                        updated[idx] = { ...updated[idx], pesoUsado: Number(v) || 0 };
                        setField("filamentos", updated);
                      }} placeholder="45" tip="Quantos gramas deste filamento serao usados na impressao final." />
                      {fil.pesoRolo > 0 && fil.pesoUsado > 0 && (
                        <div className="flex items-end pb-2">
                          <span className="text-xs text-muted-foreground">
                            Custo: <strong className="filament-text">{brl((fil.precoRolo / fil.pesoRolo) * fil.pesoUsado)}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {results.custoFilamentosDetalhado !== undefined && results.custoFilamentosDetalhado > 0 && (
              <div className="mt-3 flex justify-end border-t border-border pt-3">
                <span className="text-xs font-semibold">Custo total dos filamentos: <strong className="filament-text">{brl(results.custoFilamentosDetalhado)}</strong></span>
              </div>
            )}
          </div>

          {/* ═══════ CUSTOS EXTRAS ═══════ */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Package className="h-3.5 w-3.5" /> Custos Adicionais
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => {
                setField("custosExtras", [...form.custosExtras, buildEmptyExtraCost()]);
              }}>
                <Plus className="h-3.5 w-3.5" /> Adicionar Custo
              </Button>
            </div>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Custos extras como embalagem, cola, post-processamento, etc.
            </p>
            {form.custosExtras.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4">Nenhum custo adicional cadastrado. Clique em "Adicionar Custo" para incluir.</p>
            ) : (
              <div className="space-y-3">
                {form.custosExtras.map((ec, idx) => (
                  <div key={ec.id} className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-background p-3">
                    <div className="flex-1 min-w-[120px]">
                      <Field label="Nome">
                        <Input value={ec.nome} onChange={(e) => {
                          const updated = [...form.custosExtras];
                          updated[idx] = { ...updated[idx], nome: e.target.value };
                          setField("custosExtras", updated);
                        }} placeholder="Ex.: Embalagem" />
                      </Field>
                    </div>
                    <NumberField label="Custo Unit. (R$)" value={String(ec.custo || "")} onChange={(v) => {
                      const updated = [...form.custosExtras];
                      updated[idx] = { ...updated[idx], custo: Number(v) || 0 };
                      setField("custosExtras", updated);
                    }} placeholder="2,50" />
                    <NumberField label="Quantidade" value={String(ec.quantidade || "")} onChange={(v) => {
                      const updated = [...form.custosExtras];
                      updated[idx] = { ...updated[idx], quantidade: Number(v) || 0 };
                      setField("custosExtras", updated);
                    }} placeholder="1" step="1" />
                    {ec.custo > 0 && ec.quantidade > 0 && (
                      <div className="flex items-end pb-2">
                        <span className="text-xs text-muted-foreground">
                          Total: <strong>{brl(ec.custo * ec.quantidade)}</strong>
                        </span>
                      </div>
                    )}
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() => setField("custosExtras", form.custosExtras.filter((_, i) => i !== idx))}
                      aria-label="Remover custo">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {results.custoExtraTotal !== undefined && results.custoExtraTotal > 0 && (
              <div className="mt-3 flex justify-end border-t border-border pt-3">
                <span className="text-xs font-semibold">Total custos adicionais: <strong className="filament-text">{brl(results.custoExtraTotal)}</strong></span>
              </div>
            )}
          </div>

          {/* ═══════ ENERGIA + MAO DE OBRA + TAXA ═══════ */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Calculator className="h-3.5 w-3.5" /> Energia, Mao de Obra e Taxas
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
              <NumberField label="Custo do kWh (R$)" value={form.custoKwh} onChange={(v) => setField("custoKwh", v)} placeholder={String(settings.tarifaEnergiaKwh)} tip="Valor pago por kWh. Deixe em branco para usar o padrao das Configuracoes." />
              <NumberField label="Consumo da Impressora (kW)" value={form.consumoKw} onChange={(v) => setField("consumoKw", v)} placeholder="0,15" step="0.01" tip="Consumo em kW (ex.: 0,15 = 150W). Deixe em branco para usar o valor automatico do preset A1." />
              <NumberField label="Horas de Mao de Obra" value={form.custoTrabalhoHoras} onChange={(v) => setField("custoTrabalhoHoras", v)} placeholder="0" step="0.5" tip="Horas trabalhadas no processo (preparacao, pos-processamento, embalagem)." />
              <NumberField label="Valor da Hora (R$)" value={form.custoTrabalhoValorHora} onChange={(v) => setField("custoTrabalhoValorHora", v)} placeholder="25,00" tip="Quanto voce cobra por hora de trabalho. Ex.: R$ 25/h." />
              <NumberField label="Taxa do Gateway/Marketplace (%)" value={form.taxaGateway} onChange={(v) => setField("taxaGateway", v)} placeholder="0" step="0.5" tip="Percentual de taxa da plataforma de venda (Shopee, Mercado Livre, etc.). Ex.: 10%." />
            </div>
            {(Number(form.custoKwh) > 0 || Number(form.consumoKw) > 0) && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {results.custoTrabalho !== undefined && results.custoTrabalho > 0 && (<>Custo de mao de obra: <strong>{brl(results.custoTrabalho)}</strong> · </>)}
                Custo de energia no lote: <strong>{brl(results.custoEnergia * numeric.quantidade)}</strong>
                {Number(form.consumoKw) > 0 && <> (consumo manual: {form.consumoKw} kW)</>}
                {Number(form.custoKwh) > 0 && <> (tarifa manual: R$ {form.custoKwh}/kWh)</>}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leitura do Fatiador</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isSlicerMode
                    ? "A calculadora esta convertendo o peso/tempo total do fatiador para uma media por unidade e para o lote inteiro."
                    : "A calculadora esta usando os valores medios por unidade que voce informou manualmente."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">Media: {results.pesoUnitario.toFixed(2)}g/un.</Badge>
                <Badge variant="secondary">Media: {results.tempoUnitario.toFixed(1)} min/un.</Badge>
                <Badge variant="secondary">Impressoes no lote: {results.impressoesLote}</Badge>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Exemplo para o seu caso: se a peca pesa <strong>{form.pesoPeca || "64,05"}g</strong> e leva <strong>{form.tempoMin || "105"} min</strong> no fatiador,
              com <strong>{form.unidadesPorImpressao || "1"}</strong> unidade por impressao e pedido de <strong>{form.quantidade || "25"}</strong> pecas,
              o sistema usa essa media para sugerir um preco unitario e calcula o lote completo.
            </p>
          </div>

          {/* Results */}
          <div className="grid gap-4 rounded-xl border border-border bg-muted/40 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <ResultCard label="Filamentos" value={brl(results.custoFilamentosDetalhado ?? results.custoFilamento * numeric.quantidade)} accent="cyan" tip="Custo total de todos os filamentos usados no lote." />
            <ResultCard label="Energia + Depreciacao" value={brl((results.custoEnergia + results.custoDepreciacao) * numeric.quantidade)} accent="yellow" tip="Custo total de energia e desgaste da maquina para o lote inteiro." />
            <ResultCard label="Custos Extras" value={brl(results.custoExtraTotal ?? 0)} accent="pink" tip="Soma de todos os custos adicionais (embalagem, cola, etc.)" />
            <ResultCard label="Mao de Obra" value={brl(results.custoTrabalho ?? 0)} accent="orange" tip="Custo de mao de obra (horas x valor hora)." />
            <ResultCard label="Desperdicio" value={brl(results.custoPerda * numeric.quantidade)} accent="pink" tip="Acrescimo para cobrir perdas, falhas ou retrabalho." />
            <ResultCard label="Custo Total do Lote" value={brl(results.custoLote)} accent="pink" tip="Custo total estimado para entregar todo o pedido/lote informado." />
            <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4">
              <div aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: ACCENT_COLORS.green }} />
              <div className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
                Preco Sugerido /un. <InfoTip text={`Custo medio por unidade + ${form.margemPercent || 0}% de margem${Number(form.taxaGateway) > 0 ? ` + ${form.taxaGateway}% de taxa do gateway` : ""}. Clique em "Aplicar" para usar como Preco de Venda por unidade.`} />
              </div>
              <div className="mt-2 font-display text-2xl font-bold tabular-nums" style={{ color: ACCENT_COLORS.green }}>{brl(results.precoSugerido)}</div>
              <Button type="button" size="sm" variant="outline" className="mt-2 h-7 gap-1 text-xs" onClick={() => setField("precoVenda", results.precoSugerido.toFixed(2))}>
                <Wand2 className="h-3 w-3" /> Aplicar
              </Button>
            </div>
            <ResultCard
              label="Lucro Liquido do Lote"
              value={brl(effectiveLotProfit)}
              accent={effectiveLotProfit >= 0 ? "green" : "magenta"}
              emphasize
              tip={
                numeric.precoVenda > 0
                  ? "Lucro do lote usando o Preco de Venda informado."
                  : "Lucro estimado do lote usando o Preco Sugerido, ja que ainda nao ha um Preco de Venda informado."
              }
            />
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
                  const r = calcPortfolioPricing({
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
                  });
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
                          <Button size="sm" variant="outline" onClick={() => setOrderDialog({ open: true, projectId: p.id, client: "", clientId: "", quantity: String(p.quantidade ?? 1) })}>Criar pedido</Button>
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
      </TooltipProvider>
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
                onDetail={(o) => setDetailOrder(o)} onEdit={(o) => setEditOrder(o)} orderSettings={settings} onOpenProjectReference={openProjectReference} />
            ))}
          </div>
          <DragOverlay>{activeOrder ? (<div className="w-[280px]"><OrderCardView order={activeOrder} dragging onFinalizar={async (args) => mutateFinalizar.mutateAsync(args)} filamentos={filamentos} onDelete={(id) => setDeleteDialog({ open: true, orderId: id, reason: "" })} onDetail={(o) => setDetailOrder(o)} orderSettings={settings} onOpenProjectReference={openProjectReference} /></div>) : null}</DragOverlay>
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
                    {o.linkProjeto && (
                      <button type="button" className="mt-1 inline-flex items-center gap-1 text-[11px] text-blue-500 hover:underline" onClick={() => void openProjectReference(o.linkProjeto)}>
                        {isOrderAssetReference(o.linkProjeto) ? <Download className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                        {isOrderAssetReference(o.linkProjeto) ? "Arquivo" : "Projeto"}
                      </button>
                    )}
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

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center text-muted-foreground/70 hover:text-foreground" aria-label="Mais informações">
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-left leading-relaxed">{text}</TooltipContent>
    </Tooltip>
  );
}

function Field({ label, children, className = "", tip }: { label: string; children: React.ReactNode; className?: string; tip?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-1.5">
        <Label>{label}</Label>
        {tip && <InfoTip text={tip} />}
      </div>
      {children}
    </div>
  );
}

function NumberField({ label, value, onChange, placeholder, step = "0.01", tip }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; step?: string; tip?: string }) {
  return <Field label={label} tip={tip}><Input type="number" inputMode="decimal" min={0} step={step} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></Field>;
}

const ACCENT_COLORS: Record<string, string> = { cyan: "#5fa8a3", green: "#8aab6e", yellow: "#e0a93b", pink: "#d98ca0", magenta: "#8a3a52", orange: "#e8914a" };

function ResultCard({ label, value, accent, emphasize = false, tip }: { label: string; value: string; accent: keyof typeof ACCENT_COLORS; emphasize?: boolean; tip?: string }) {
  const color = ACCENT_COLORS[accent];
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4" style={{ boxShadow: `0 8px 24px -16px ${color}` }}>
      <div aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
      <div className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
        {tip && <InfoTip text={tip} />}
      </div>
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

function OrderCardView({ order, dragging = false, onFinalizar, filamentos, onDelete, onDetail, onEdit, orderSettings, onOpenProjectReference }: {
  order: Order; dragging?: boolean;
  onFinalizar: (args: { orderId: string; destino: string; valorRecebido?: number; formaPagamento?: string; dataPagamento?: string }) => Promise<unknown>;
  filamentos?: Filamento[];
  onDelete?: (orderId: string) => void;
  onDetail?: (order: Order) => void;
  onEdit?: (order: Order) => void;
  orderSettings?: AppSettings;
  onOpenProjectReference?: (reference?: string | null) => Promise<void> | void;
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
  const paymentBadge = getPaymentBadge(order);
  const partSummary = order.parts?.length ? summarizeOrderParts(order.parts) : null;

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
        {partSummary && (
          <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
            <Badge variant="secondary">Partes: {partSummary.total}</Badge>
            {partSummary.todo > 0 && <Badge variant="outline">A fazer: {partSummary.todo}</Badge>}
            {partSummary.printing > 0 && <Badge variant="outline">Imprimindo: {partSummary.printing}</Badge>}
            {partSummary.done > 0 && <Badge variant="outline">Concluidas: {partSummary.done}</Badge>}
            {partSummary.failed > 0 && <Badge variant="outline">Falha: {partSummary.failed}</Badge>}
          </div>
        )}
        {order.linkProjeto && (
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              void onOpenProjectReference?.(order.linkProjeto);
            }}
          >
            {isOrderAssetReference(order.linkProjeto) ? <Download className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
            {isOrderAssetReference(order.linkProjeto) ? "Abrir arquivo" : "Ver projeto"}
          </button>
        )}
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
        {paymentBadge && (
          <Badge variant="outline" className={cn("mt-2 text-[10px] font-semibold", paymentBadge.className)}>
            {paymentBadge.label}
          </Badge>
        )}
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

function DraggableCard({ order, onFinalizar, filamentos, onDelete, onDetail, onEdit, orderSettings, onOpenProjectReference }: { order: Order; onFinalizar: (args: { orderId: string; destino: string; valorRecebido?: number; formaPagamento?: string; dataPagamento?: string }) => Promise<unknown>; filamentos?: Filamento[]; onDelete?: (orderId: string) => void; onDetail?: (order: Order) => void; onEdit?: (order: Order) => void; orderSettings?: AppSettings; onOpenProjectReference?: (reference?: string | null) => Promise<void> | void }) {
  const isTerminal = ["vendido", "presente", "falha"].includes(order.status);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: order.id, disabled: isTerminal });
  return <div ref={setNodeRef} {...attributes} {...listeners} className={cn("touch-none", isDragging && "opacity-40")}><OrderCardView order={order} onFinalizar={onFinalizar} filamentos={filamentos} onDelete={onDelete} onDetail={onDetail} onEdit={onEdit} orderSettings={orderSettings} onOpenProjectReference={onOpenProjectReference} /></div>;
}

function KanbanColumn({ id, title, hint, orders, onFinalizar, filamentos, onDelete, onDetail, onEdit, orderSettings, onOpenProjectReference }: { id: Status; title: string; hint: string; orders: Order[]; onFinalizar: (args: { orderId: string; destino: string; valorRecebido?: number; formaPagamento?: string; dataPagamento?: string }) => Promise<unknown>; filamentos?: Filamento[]; onDelete?: (orderId: string) => void; onDetail?: (order: Order) => void; onEdit?: (order: Order) => void; orderSettings?: AppSettings; onOpenProjectReference?: (reference?: string | null) => Promise<void> | void }) {
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
        {orders.map((o) => (<DraggableCard key={o.id} order={o} onFinalizar={onFinalizar} filamentos={filamentos} onDelete={onDelete} onDetail={onDetail} onEdit={onEdit} orderSettings={orderSettings} onOpenProjectReference={onOpenProjectReference} />))}
        {orders.length === 0 && (<p className="grid flex-1 place-items-center text-center text-xs text-muted-foreground">Solte um pedido aqui</p>)}
      </div>
    </div>
  );
}

function DetailItem({ label, value, accent, mono }: { label: string; value: string; accent?: boolean; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={cn("text-sm font-medium", mono && "font-mono", accent === true && "filament-text", accent === false && "text-destructive")}>{value}</dd>
    </div>
  );
}
