import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { toast } from "sonner";
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
import type { Order, OrderPartStatus, Status, PortfolioProject } from "@/lib/domain/types";
import { DEFAULT_APP_SETTINGS } from "@/lib/domain/types";
import { calcAdvancedPortfolioPricing, type BambuPresetId } from "@/lib/domain/portfolio-pricing";
import { isOrderAssetReference } from "@/lib/domain/order-asset";
import { computeOrderTotalsFromParts, summarizeOrderParts } from "@/lib/domain/order-parts";
import { openPrintQuote, type QuoteInput } from "@/lib/domain/quote-print";
import { useOrders } from "@/lib/hooks/use-orders";
import { useFilamentos } from "@/lib/hooks/use-filamentos";
import { usePortfolio } from "@/lib/hooks/use-portfolio";
import { useClients } from "@/lib/hooks/use-clients";
import { useSettings } from "@/lib/hooks/use-settings";
import { useToastErrorHandler } from "@/lib/hooks/use-toast-error-handler";
import { invalidarPor, type OperacaoDeNegocio } from "@/lib/query-keys";
import { normalizeText } from "@/lib/utils/normalization";
import { PRINTERS } from "./calc-pedidos-shared";
import {
  FALLBACK_CUSTO_ROLO,
  FALLBACK_PESO_ROLO,
  FALLBACK_QUANTIDADE,
  buildEmptyFilamentoItem,
  buildEmptyOrderPart,
  fileToBase64,
  initialForm,
  projectSchema,
  type FormState,
  type NewOrderPartForm,
} from "./calc-pedidos-shared";

/**
 * Estado completo de Calculadora e Pedidos: dados, calculadora ao vivo,
 * dialogs de pedido/projeto, drag-and-drop do kanban e mutations. Abas e
 * dialogs recebem este objeto como `ctx` e apenas renderizam — nenhuma
 * logica de dominio vive nos componentes.
 */
export function useCalcPedidosState() {
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
  const [form, setForm] = useState<FormState>({
    ...initialForm,
    custoRolo: initialForm.custoRolo,
    pesoRolo: String(settings.defaultPesoRolo || FALLBACK_PESO_ROLO),
    quantidade: String(settings.defaultQuantidade || FALLBACK_QUANTIDADE),
    modeloPreset: (settings.selectedPrinterPreset as BambuPresetId) || initialForm.modeloPreset,
    precoImpressora: String(
      settings.printerPrices?.[settings.selectedPrinterPreset || "A1"] ??
        initialForm.precoImpressora,
    ),
    vidaUtilHoras: String(
      settings.printerVidaUtil?.[settings.selectedPrinterPreset || "A1"] ??
        initialForm.vidaUtilHoras,
    ),
  });

  // P1-2: os efeitos colaterais de cada operacao ficam em query-keys.ts.
  // Finalizar destino, por exemplo, grava venda e (em falha) despesa — antes
  // so ["orders"] era invalidada e Financas seguia defasada por ate 60s.
  const invalidar = (operacao: OperacaoDeNegocio) => invalidarPor(qc, operacao);

  /* ── mutations ── */
  const mutateAddProject = useMutation({
    mutationFn: (input: Parameters<typeof addPortfolioProject>[0]["data"]) =>
      addPortfolioProject({ data: input }),
    onSuccess: () => invalidar("salvarProjeto"),
  });
  const mutateRemoveProject = useMutation({
    mutationFn: (id: string) => removePortfolioProject({ data: { id } }),
    onSuccess: () => invalidar("removerProjeto"),
  });
  const mutateCreateOrder = useMutation({
    mutationFn: (input: {
      portfolioProjectId: string;
      client: string;
      clientId?: string;
      quantity: number;
    }) => createOrderFromPortfolio({ data: input }),
    onSuccess: () => {
      invalidar("criarPedido");
      toast.success("Pedido criado na fila.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o pedido."),
  });
  const mutateStatus = useMutation({
    mutationFn: (input: { orderId: string; status: "todo" | "printing" | "acabamento" | "done" }) =>
      updateOrderStatus({ data: input }),
    onSuccess: () => invalidar("mudarStatusPedido"),
  });
  const mutateAddOrder = useMutation({
    mutationFn: (input: Parameters<typeof addOrder>[0]["data"]) => addOrder({ data: input }),
    onSuccess: () => invalidar("criarPedido"),
  });
  const mutateFinalizar = useMutation({
    mutationFn: (input: Parameters<typeof finalizarDestino>[0]["data"]) =>
      finalizarDestino({ data: input }),
    onSuccess: () => invalidar("finalizarPedido"),
  });
  const mutateRemoveOrder = useMutation({
    mutationFn: (input: { orderId: string; reason: string }) => removeOrder({ data: input }),
    onSuccess: () => {
      invalidar("removerPedido");
      toast.success("Pedido excluído.");
    },
  });
  const mutateUpdateOrder = useMutation({
    mutationFn: (input: Parameters<typeof updateOrder>[0]["data"]) => updateOrder({ data: input }),
    onSuccess: () => {
      invalidar("editarPedido");
      toast.success("Pedido atualizado.");
    },
    onError: handleUpdateError,
  });
  const mutateUpdateProject = useMutation({
    mutationFn: (input: Parameters<typeof updatePortfolioProject>[0]["data"]) =>
      updatePortfolioProject({ data: input }),
    onSuccess: () => {
      invalidar("salvarProjeto");
      toast.success("Projeto atualizado.");
    },
    onError: handleUpdateError,
  });
  const mutateUploadOrderAsset = useMutation({
    mutationFn: (input: { fileName: string; contentType: string; dataBase64: string }) =>
      uploadOrderAsset({ data: input }),
  });
  const mutateResolveOrderAssetUrl = useMutation({
    mutationFn: (reference: string) => resolveOrderAssetUrl({ data: { reference } }),
  });
  const mutateUpdateOrderPartStatus = useMutation({
    mutationFn: (input: { orderId: string; partId: string; status: OrderPartStatus }) =>
      updateOrderPartStatus({ data: input }),
    onError: handleUpdateError,
    onSuccess: () => invalidar("editarPedido"),
  });

  /* ── calculator state ── */
  const numeric = useMemo(() => {
    const parsedPesoRolo = Number(form.pesoRolo) || settings.defaultPesoRolo || FALLBACK_PESO_ROLO;
    const parsedQuantidade =
      Number(form.quantidade) || settings.defaultQuantidade || FALLBACK_QUANTIDADE;
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
    };
  }, [form, settings]);
  const results = useMemo(
    () => calcAdvancedPortfolioPricing({ ...numeric, settings }),
    [numeric, settings],
  );
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const isSlicerMode = form.entryMode === "slicer";
  const effectiveUnitPrice = numeric.precoVenda > 0 ? numeric.precoVenda : results.precoSugerido;
  const effectiveLotProfit =
    results.lucroLiquidoEfetivo ?? effectiveUnitPrice * numeric.quantidade - results.custoLote;

  const totals = useMemo(
    () =>
      projects.reduce(
        (acc, p) => {
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
          acc.lucro += r.lucroLiquido;
          acc.receita += r.receitaTotal;
          return acc;
        },
        { lucro: 0, receita: 0 },
      ),
    [projects, settings],
  );

  /* ── order dialogs ── */
  const [orderDialog, setOrderDialog] = useState<{
    open: boolean;
    projectId: string;
    client: string;
    clientId: string;
    quantity: string;
  }>({ open: false, projectId: "", client: "", clientId: "", quantity: "1" });
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newOrder, setNewOrder] = useState({
    client: "",
    clientId: "",
    projectName: "",
    quantity: "1",
    timeMinutes: "60",
    filamentoId: "",
    filamentoIds: [] as string[],
    gramsPerUnit: "5",
    linkProjeto: "",
    multiPart: false,
    precoVenda: "",
    formaPagamento: "",
    dataPagamento: "",
    printer: "",
  });
  const [newOrderAsset, setNewOrderAsset] = useState<File | null>(null);
  const [newOrderParts, setNewOrderParts] = useState<NewOrderPartForm[]>([buildEmptyOrderPart()]);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    orderId: string;
    reason: string;
  }>({ open: false, orderId: "", reason: "" });
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editProject, setEditProject] = useState<PortfolioProject | null>(null);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [projectImages, setProjectImages] = useState<string[]>([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [updatingPartId, setUpdatingPartId] = useState<string | null>(null);

  function resetNewOrderForm() {
    setNewOrder({
      client: "",
      clientId: "",
      projectName: "",
      quantity: "1",
      timeMinutes: "60",
      filamentoId: "",
      filamentoIds: [],
      gramsPerUnit: "5",
      linkProjeto: "",
      multiPart: false,
      precoVenda: "",
      formaPagamento: "",
      dataPagamento: "",
      printer: "",
    });
    setNewOrderAsset(null);
    setNewOrderParts([buildEmptyOrderPart()]);
  }

  function openEditProject(project: PortfolioProject) {
    setEditImages(
      project.imageUrls?.length ? project.imageUrls : project.imageUrl ? [project.imageUrl] : [],
    );
    setEditProject(project);
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
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel abrir a referencia do projeto.",
      );
    }
  }

  /* ── drag state ── */
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const grouped = useMemo(() => {
    const g: Record<Status, Order[]> = {
      todo: [],
      printing: [],
      acabamento: [],
      done: [],
      vendido: [],
      presente: [],
      falha: [],
    };
    const searchLower = normalizeText(orderSearch);
    for (const o of orders) {
      if (
        searchLower &&
        !normalizeText(o.projectName).includes(searchLower) &&
        !normalizeText(o.client).includes(searchLower)
      )
        continue;
      g[o.status]?.push(o);
    }
    return g;
  }, [orders, orderSearch]);
  const printingByPrinter = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const p of PRINTERS) map.set(p, []);
    for (const o of grouped.printing ?? []) {
      const key = o.printer && map.has(o.printer) ? o.printer : PRINTERS[0];
      map.get(key)!.push(o);
    }
    return map;
  }, [grouped.printing]);
  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const s = normalizeText(projectSearch);
    return projects.filter(
      (p) => normalizeText(p.nome).includes(s) || normalizeText(p.categoria).includes(s),
    );
  }, [projects, projectSearch]);
  const activeOrder = activeId ? (orders.find((o) => o.id === activeId) ?? null) : null;
  const terminalOrders = [
    ...(grouped.vendido ?? []),
    ...(grouped.presente ?? []),
    ...(grouped.falha ?? []),
  ];
  const newOrderPartsTotals = useMemo(
    () =>
      computeOrderTotalsFromParts(
        newOrderParts.map((part) => ({
          quantity: Math.max(0, Number(part.quantity) || 0),
          timeMinutes: Math.max(0, Number(part.timeMinutes) || 0),
          gramsPerUnit: Math.max(0, Number(part.gramsPerUnit) || 0),
        })),
      ),
    [newOrderParts],
  );
  const newOrderPartSummary = useMemo(
    () => summarizeOrderParts(newOrderParts.map(() => ({ status: "todo" as const }))),
    [newOrderParts],
  );

  function updateNewOrderPartField(
    partId: string,
    field: keyof NewOrderPartForm,
    value: string | File | null,
  ) {
    setNewOrderParts((current) =>
      current.map((part) => (part.id === partId ? { ...part, [field]: value } : part)),
    );
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
  function handlePrintQuote(clientName?: string) {
    const effectivePrice = numeric.precoVenda > 0 ? numeric.precoVenda : results.precoSugerido;
    const totalTime = results.tempoUnitario * numeric.quantidade;
    const input: QuoteInput = {
      clientName: clientName ?? "",
      items: [
        {
          name: form.nome.trim() || "Projeto 3D",
          category: form.categoria,
          quantity: numeric.quantidade,
          unitPrice: effectivePrice,
          total: effectivePrice * numeric.quantidade,
          timeMinutes: results.tempoUnitario,
          gramsPerUnit: results.pesoUnitario,
        },
      ],
      validityDays: 7,
      observations: form.linkModelo?.trim()
        ? `Modelo de referência: ${form.linkModelo.trim()}`
        : undefined,
      studioNome: settings.studioNome || "Kurti 3D",
      whatsappNumero: settings.whatsappNumero || "",
    };
    openPrintQuote(input);
  }

  async function handleProjectAction(action: "save-private" | "save-publish" | "create-order") {
    try {
      const totalMinutes = Number(form.tempoMin) || 0;
      if (totalMinutes < 1) {
        toast.error("Informe pelo menos 1 minuto de impressão");
        return;
      }
      if (!form.nome.trim()) {
        toast.error("Informe o nome do projeto");
        return;
      }
      if (results.pesoUnitario < 0.1) {
        toast.error(
          "O peso da peça deve ser pelo menos 0.1g. Preencha o Peso do Fatiamento ou os pesos usados nos filamentos.",
        );
        return;
      }

      const effectiveCustoRolo = numeric.custoRolo > 0 ? numeric.custoRolo : FALLBACK_CUSTO_ROLO;
      const effectivePesoRolo = numeric.pesoRolo > 0 ? numeric.pesoRolo : FALLBACK_PESO_ROLO;

      const projectData = {
        nome: form.nome.trim(),
        categoria: form.categoria,
        linkModelo: form.linkModelo || undefined,
        custoRolo: effectiveCustoRolo,
        pesoRolo: effectivePesoRolo,
        pesoPeca: results.pesoUnitario,
        tempoMin: results.tempoUnitario,
        quantidade: numeric.quantidade,
        precoVenda: numeric.precoVenda,
        perdaPercent: numeric.perdaPercent,
        isPublic: action === "save-publish",
        filamentos: form.filamentos.filter((f) => f.pesoUsado > 0),
        custosExtras: form.custosExtras.filter((c) => c.nome.trim() && c.custo > 0),
        custoKwh: numeric.custoKwhOverride > 0 ? numeric.custoKwhOverride : null,
        custoTrabalhoHoras: numeric.custoTrabalhoHoras > 0 ? numeric.custoTrabalhoHoras : null,
        custoTrabalhoValorHora:
          numeric.custoTrabalhoValorHora > 0 ? numeric.custoTrabalhoValorHora : null,
        taxaGateway: numeric.taxaGateway > 0 ? numeric.taxaGateway : null,
        imageDataUrls: projectImages,
      };

      const result = await mutateAddProject.mutateAsync(projectData);

      // Persist printer settings for next time
      const printerPrice = Number(form.precoImpressora) || 0;
      const printerVida = Number(form.vidaUtilHoras) || 0;
      if (printerPrice > 0 && printerVida > 0) {
        saveSettings({
          data: {
            ...settings,
            selectedPrinterPreset: form.modeloPreset,
            printerPrices: { ...(settings.printerPrices ?? {}), [form.modeloPreset]: printerPrice },
            printerVidaUtil: {
              ...(settings.printerVidaUtil ?? {}),
              [form.modeloPreset]: printerVida,
            },
          },
        }).catch(() => {});
      }

      if (action === "save-private") {
        toast.success("Projeto salvo como privado");
        setProjectImages([]);
        setForm({
          ...initialForm,
          pesoRolo: String(settings.defaultPesoRolo),
          quantidade: String(settings.defaultQuantidade),
          filamentos: [buildEmptyFilamentoItem()],
          custosExtras: [],
        });
      } else if (action === "save-publish") {
        toast.success("Projeto publicado no site");
        setProjectImages([]);
        setForm({
          ...initialForm,
          pesoRolo: String(settings.defaultPesoRolo),
          quantidade: String(settings.defaultQuantidade),
          filamentos: [buildEmptyFilamentoItem()],
          custosExtras: [],
        });
      } else if (action === "create-order") {
        toast.success("Projeto salvo. Criando pedido...");
        setOrderDialog({
          open: true,
          projectId: result.projectId,
          client: "",
          clientId: "",
          quantity: String(form.quantidade),
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar projeto");
    }
  }

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
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    mutateAddProject.mutate({
      ...parsed.data,
      filamentos: form.filamentos.filter((f) => f.pesoUsado > 0),
      custosExtras: form.custosExtras.filter((c) => c.nome.trim() && c.custo > 0),
      custoKwh: Number(form.custoKwh) || null,
      custoTrabalhoHoras: Number(form.custoTrabalhoHoras) || null,
      custoTrabalhoValorHora: Number(form.custoTrabalhoValorHora) || null,
      taxaGateway: Number(form.taxaGateway) || null,
      imageDataUrls: projectImages,
    });
    setProjectImages([]);
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
      let partsPayload:
        | Array<{
            nome: string;
            quantity: number;
            timeMinutes: number;
            gramsPerUnit: number;
            linkProjeto?: string;
            notes?: string;
          }>
        | undefined;

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
        client: (selectedClient?.nome ?? newOrder.client.trim()) || "Cliente",
        clientId: selectedClient?.id,
        projectName: newOrder.projectName.trim() || "Pedido",
        quantity: Number(newOrder.quantity) || 1,
        timeMinutes: partsPayload?.length
          ? newOrderPartsTotals.timeMinutes
          : Number(newOrder.timeMinutes) || 60,
        filamentoId:
          newOrder.filamentoIds.length > 0
            ? newOrder.filamentoIds[0]
            : newOrder.filamentoId || undefined,
        filamentoIds: newOrder.filamentoIds.length > 0 ? newOrder.filamentoIds : undefined,
        gramsPerUnit: partsPayload?.length
          ? newOrderPartsTotals.gramsPerUnit
          : newOrder.gramsPerUnit
            ? Number(newOrder.gramsPerUnit)
            : undefined,
        linkProjeto,
        multiPart: newOrder.multiPart,
        precoVenda: newOrder.precoVenda ? Number(newOrder.precoVenda) : undefined,
        formaPagamento: newOrder.formaPagamento || undefined,
        dataPagamento: newOrder.dataPagamento || undefined,
        printer: newOrder.printer || undefined,
        parts: partsPayload,
      });
      setShowNewOrder(false);
      resetNewOrderForm();
      toast.success("Pedido criado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel criar o pedido.");
    }
  }

  return {
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
  };
}

export type CalcPedidosCtx = ReturnType<typeof useCalcPedidosState>;
