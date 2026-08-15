import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import {
  archiveFilamento,
  addInsumo,
  createFilamentoPayment,
  deleteFilamentoPayment,
  payInstallment,
  removeFilamento,
  removeInsumo,
  restoreFilamento,
  revertInstallment,
  settlePayment,
  updateInsumo,
  updateFilamentoPayment,
  updateInstallment,
  updateArchivedFilamento,
  upsertFilamento,
} from "@/lib/api/data.functions";
import { addCalendarMonthsIso, todayIso } from "@/lib/domain/installments";
import type {
  Filamento,
  FilamentoHistory,
  FilamentoPayment,
  FilamentoPaymentInstallment,
  FilamentoQualidade,
  FormaPagamento,
  Insumo,
  InsumoPayment,
  InsumoPaymentInstallment,
} from "@/lib/domain/types";
import { brl } from "@/lib/utils";
import { useFilamentos } from "@/lib/hooks/use-filamentos";
import { useInsumos } from "@/lib/hooks/use-insumos";
import { useFilamentoPayments } from "@/lib/hooks/use-filamento-payments";
import { useInsumoPayments } from "@/lib/hooks/use-insumo-payments";
import { invalidarPor, type OperacaoDeNegocio } from "@/lib/query-keys";
import { normalizeText } from "@/lib/utils/normalization";
import { getFilamentoAlertLevel, getInsumoAlertLevel } from "@/lib/domain/stock-alert";
import {
  filamentoSchema,
  generateSku,
  initialFilamentoForm,
  initialInsumoForm,
  insumoSchema,
  makeBatchId,
  type EditFilamentoForm,
  type FilamentoForm,
  type FilamentoView,
  type InsumoForm,
  type Material,
} from "./stock-shared";

/**
 * Estado completo da pagina de estoque: dados, filtros, dialogs, mutacoes e
 * metricas derivadas. As abas recebem este objeto como `ctx` e apenas
 * renderizam — nenhuma logica de dominio vive nos componentes de aba.
 */
export function useStockPageState() {
  const qc = useQueryClient();
  const { data: filamentosData } = useFilamentos();
  const { data: insumosData } = useInsumos();
  const { data: fpData } = useFilamentoPayments();
  const { data: ipData } = useInsumoPayments();
  const filamentos = (filamentosData?.filamentos ?? []) as FilamentoView[];
  const filamentosHistory = (filamentosData?.filamentosHistory ?? []) as FilamentoHistory[];
  const insumos = (insumosData ?? []) as Insumo[];
  const filamentoPayments = (fpData?.filamentoPayments ?? []) as FilamentoPayment[];
  const filamentoInstallments = (fpData?.filamentoInstallments ??
    []) as FilamentoPaymentInstallment[];
  const insumoPayments = (ipData?.insumoPayments ?? []) as InsumoPayment[];
  const insumoInstallments = (ipData?.insumoInstallments ?? []) as InsumoPaymentInstallment[];

  // P1-2: cada operacao declara TODAS as chaves que afeta em query-keys.ts.
  // Antes, salvar/remover insumo mexia em `expenses` no servidor mas so
  // invalidava ["insumos"] — a aba Despesas seguia mostrando a despesa de um
  // insumo ja excluido.
  const invalidar = (operacao: OperacaoDeNegocio) => invalidarPor(qc, operacao);

  const mutateFilamento = useMutation({
    mutationFn: (
      input: z.infer<typeof filamentoSchema> & {
        id?: string;
        batchId?: string;
        paymentId?: string;
      },
    ) => upsertFilamento({ data: input as z.input<typeof filamentoSchema> }),
    onSuccess: () => invalidar("salvarFilamento"),
  });

  const mutateRemoveFilamento = useMutation({
    mutationFn: (id: string) => removeFilamento({ data: { id } }),
    onSuccess: () => invalidar("removerFilamento"),
  });

  const mutateArchive = useMutation({
    mutationFn: (input: {
      id: string;
      qualidade?: FilamentoQualidade;
      observacao?: string;
      dataFim?: string;
    }) => archiveFilamento({ data: input }),
    onSuccess: () => {
      invalidar("arquivarFilamento");
      toast.success("Filamento arquivado no histórico.");
    },
  });

  const mutateUpdateArchived = useMutation({
    mutationFn: (input: z.infer<typeof filamentoSchema> & { id: string; pesoAtual: number }) =>
      updateArchivedFilamento({ data: input }),
    onSuccess: () => invalidar("salvarFilamento"),
  });

  const mutateRestore = useMutation({
    mutationFn: (id: string) => restoreFilamento({ data: { id } }),
    onSuccess: () => invalidar("restaurarFilamento"),
  });

  const mutateInsumo = useMutation({
    mutationFn: (input: z.infer<typeof insumoSchema>) =>
      addInsumo({ data: input as z.input<typeof insumoSchema> }),
    onSuccess: () => invalidar("salvarInsumo"),
  });

  const mutateUpdateInsumo = useMutation({
    mutationFn: (input: z.infer<typeof insumoSchema> & { id: string }) =>
      updateInsumo({ data: input as z.input<typeof insumoSchema> & { id: string } }),
    onSuccess: () => invalidar("salvarInsumo"),
  });

  const mutateRemoveInsumo = useMutation({
    mutationFn: (id: string) => removeInsumo({ data: { id } }),
    onSuccess: () => invalidar("removerInsumo"),
  });

  const mutateCreatePayment = useMutation({
    mutationFn: (input: {
      batchId: string;
      formaPagamento: FormaPagamento;
      custoTotal: number;
      parcelas: number;
      dataParaPagamento: string;
    }) => createFilamentoPayment({ data: input }),
    onSuccess: () => invalidar("pagamentoFilamento"),
  });

  const mutateUpdatePayment = useMutation({
    mutationFn: (input: {
      paymentId: string;
      formaPagamento: FormaPagamento;
      custoTotal: number;
      parcelas: number;
      dataParaPagamento: string;
    }) => updateFilamentoPayment({ data: input }),
    onSuccess: () => invalidar("pagamentoFilamento"),
  });

  const mutateDeletePayment = useMutation({
    mutationFn: (paymentId: string) => deleteFilamentoPayment({ data: { paymentId } }),
    onSuccess: () => invalidar("pagamentoFilamento"),
  });

  const mutatePayInstallment = useMutation({
    mutationFn: (input: {
      installmentId: string;
      dataPagamento: string;
      valorPago?: number;
      observacao?: string;
    }) => payInstallment({ data: input }),
    onSuccess: () => invalidar("pagamentoFilamento"),
  });

  const mutateRevertInstallment = useMutation({
    mutationFn: (installmentId: string) => revertInstallment({ data: { installmentId } }),
    onSuccess: () => invalidar("pagamentoFilamento"),
  });

  const mutateUpdateInstallment = useMutation({
    mutationFn: (input: {
      installmentId: string;
      vencimento?: string;
      valor?: number;
      observacao?: string;
    }) => updateInstallment({ data: input }),
    onSuccess: () => invalidar("pagamentoFilamento"),
  });

  const mutateSettlePayment = useMutation({
    mutationFn: (input: { paymentId: string; totalPago?: number; dataPagamento?: string }) =>
      settlePayment({ data: input }),
    onSuccess: () => invalidar("pagamentoFilamento"),
  });

  const allUsedSkus = useMemo(
    () => [...filamentos.map((f) => f.sku), ...filamentosHistory.map((f) => f.sku)],
    [filamentos, filamentosHistory],
  );

  const [fForm, setFForm] = useState<FilamentoForm>(() => ({
    ...initialFilamentoForm,
    sku: "",
    dataCompra: todayIso(),
    dataParaPagamento: addCalendarMonthsIso(todayIso(), 1),
  }));

  // Atualiza o SKU automaticamente quando os dados carregam (allUsedSkus muda)
  // e o formulario esta no estado inicial (SKU vazio) ou foi resetado.
  useEffect(() => {
    if (allUsedSkus.length > 0 && !fForm.sku) {
      setFForm((f) => ({ ...f, sku: generateSku(allUsedSkus) }));
    }
  }, [allUsedSkus]);
  const [iForm, setIForm] = useState<InsumoForm>({
    ...initialInsumoForm,
    dataCompra: todayIso(),
    dataParaPagamento: todayIso(),
  });
  const [editInsumo, setEditInsumo] = useState<(InsumoForm & { id: string }) | null>(null);
  const [createInsumoOpen, setCreateInsumoOpen] = useState(false);
  const [createFilamentOpen, setCreateFilamentOpen] = useState(false);

  const [filSearch, setFilSearch] = useState("");
  const [filMarcaFilter, setFilMarcaFilter] = useState("all");
  const [filCorFilter, setFilCorFilter] = useState("all");
  const [filMaterialFilter, setFilMaterialFilter] = useState("all");
  const [filDataCompraFilter, setFilDataCompraFilter] = useState("");
  const [filDataEntregaFilter, setFilDataEntregaFilter] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [insSearch, setInsSearch] = useState("");
  const [stockView, setStockViewState] = useState<"cards" | "table">(
    () => (localStorage.getItem("stock-view-preference") as "cards" | "table") ?? "cards",
  );
  const setStockView = (view: "cards" | "table") => {
    setStockViewState(view);
    localStorage.setItem("stock-view-preference", view);
  };
  const [detailFilament, setDetailFilament] = useState<Filamento | null>(null);
  const [editForm, setEditForm] = useState<EditFilamentoForm | null>(null);
  const [editMode, setEditMode] = useState<"active" | "archived">("active");
  const [restoreTarget, setRestoreTarget] = useState<FilamentoHistory | null>(null);

  const openEdit = (f: Filamento) => {
    setEditMode("active");
    const payment = f.paymentId ? filamentoPayments.find((p) => p.id === f.paymentId) : null;
    const insts = payment ? filamentoInstallments.filter((i) => i.paymentId === payment.id) : [];
    const first = insts.sort((a, b) => a.numero - b.numero)[0];
    setEditForm({
      id: f.id,
      sku: f.sku,
      marca: f.marca,
      cor: f.cor,
      material: f.material as Material,
      pesoInicial: String(f.pesoInicial),
      pesoAtual: String(f.pesoAtual),
      precoPago: String(f.precoPago),
      dataCompra: f.dataCompra,
      dataEntrega: f.dataEntrega ?? "",
      qualidade: f.qualidade ?? "",
      observacao: f.observacao ?? f.comentario ?? "",
      linkProduto: f.linkProduto ?? "",
      quantidade: "1",
      formaPagamento: payment?.formaPagamento ?? "a_vista",
      custoTotal: payment ? String(payment.custoTotal) : String(f.precoPago),
      parcelas: payment ? String(payment.parcelas) : "1",
      dataParaPagamento:
        payment?.dataParaPagamento ?? first?.vencimento ?? (f.dataCompra || todayIso()),
    });
  };

  const setEditField = <K extends keyof EditFilamentoForm>(key: K, value: EditFilamentoForm[K]) =>
    setEditForm((f) => (f ? { ...f, [key]: value } : f));

  // Edicao de filamento arquivado: sem bloco de pagamento (nao mexe no financeiro).
  const openEditArchived = (h: FilamentoHistory) => {
    setEditMode("archived");
    setEditForm({
      id: h.id,
      sku: h.sku,
      marca: h.marca,
      cor: h.cor,
      material: h.material as Material,
      pesoInicial: String(h.pesoInicial),
      pesoAtual: String(h.pesoAtual),
      precoPago: String(h.precoPago),
      dataCompra: h.dataCompra,
      dataEntrega: h.dataEntrega ?? "",
      qualidade: h.qualidade ?? "",
      observacao: h.observacao ?? h.comentario ?? "",
      linkProduto: h.linkProduto ?? "",
      quantidade: "1",
      formaPagamento: "a_vista",
      custoTotal: String(h.precoPago),
      parcelas: "1",
      dataParaPagamento: h.dataCompra || todayIso(),
    });
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    const parsed = filamentoSchema.safeParse({
      sku: editForm.sku,
      marca: editForm.marca,
      cor: editForm.cor,
      material: editForm.material,
      pesoInicial: Number(editForm.pesoInicial),
      pesoAtual: Number(editForm.pesoAtual),
      precoPago: Number(editForm.precoPago),
      dataCompra: editForm.dataCompra,
      dataEntrega: editForm.dataEntrega || null,
      qualidade: editForm.qualidade || null,
      observacao: editForm.observacao || null,
      linkProduto: editForm.linkProduto || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    const formaPagamento: FormaPagamento =
      editForm.formaPagamento === "parcelado" ? "parcelado" : "a_vista";
    const custoTotalNum = Number(editForm.custoTotal) || Number(editForm.precoPago) || 0;
    const parcelas =
      formaPagamento === "parcelado" ? Math.max(1, Math.floor(Number(editForm.parcelas) || 1)) : 1;
    const dataParaPagamento = editForm.dataParaPagamento || editForm.dataCompra || todayIso();

    const existingFilamento = filamentos.find((x) => x.id === editForm.id);
    const batchId = existingFilamento?.batchId ?? makeBatchId();
    // Evita duplicar pagamento na edicao: se o filamento ainda nao tem paymentId
    // vinculado, reutiliza o pagamento existente do lote em vez de criar outro.
    const existingPaymentId =
      existingFilamento?.paymentId ??
      filamentoPayments.find((p) => p.batchId === batchId)?.id ??
      null;

    try {
      if (existingPaymentId) {
        // Update existing payment + filamento
        await mutateUpdatePayment.mutateAsync({
          paymentId: existingPaymentId,
          formaPagamento,
          custoTotal: custoTotalNum,
          parcelas,
          dataParaPagamento,
        });
        await mutateFilamento.mutateAsync({
          ...parsed.data,
          id: editForm.id,
          batchId,
          paymentId: existingPaymentId,
        });
      } else {
        // Create new payment, then update filamento with batchId+paymentId
        const created = await mutateCreatePayment.mutateAsync({
          batchId,
          formaPagamento,
          custoTotal: custoTotalNum,
          parcelas,
          dataParaPagamento,
        });
        const paymentId = (created as { ok?: boolean; paymentId?: string })?.paymentId ?? batchId;
        await mutateFilamento.mutateAsync({
          ...parsed.data,
          id: editForm.id,
          batchId,
          paymentId,
        });
      }
      toast.success(`Filamento [${parsed.data.sku}] atualizado.`);
      setEditForm(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar filamento.");
    }
  };

  const submitEditArchived = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    const parsed = filamentoSchema.safeParse({
      sku: editForm.sku,
      marca: editForm.marca,
      cor: editForm.cor,
      material: editForm.material,
      pesoInicial: Number(editForm.pesoInicial),
      pesoAtual: Number(editForm.pesoAtual),
      precoPago: Number(editForm.precoPago),
      dataCompra: editForm.dataCompra,
      dataEntrega: editForm.dataEntrega || null,
      qualidade: editForm.qualidade || null,
      observacao: editForm.observacao || null,
      linkProduto: editForm.linkProduto || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    try {
      await mutateUpdateArchived.mutateAsync({
        ...parsed.data,
        id: editForm.id,
        pesoAtual: Number(editForm.pesoAtual) || 0,
      });
      toast.success(`Filamento arquivado [${parsed.data.sku}] atualizado.`);
      setEditForm(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar filamento arquivado.");
    }
  };

  const submitRestore = async () => {
    if (!restoreTarget) return;
    const sku = restoreTarget.sku;
    try {
      await mutateRestore.mutateAsync(restoreTarget.id);
      toast.success(`Filamento [${sku}] reativado no estoque.`);
      setRestoreTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao reativar filamento.");
    }
  };

  const [archiveDialog, setArchiveDialog] = useState<{
    open: boolean;
    filamentId: string;
    qualidade: FilamentoQualidade;
    observacao: string;
    dataFim: string;
  }>({
    open: false,
    filamentId: "",
    qualidade: "bom",
    observacao: "",
    dataFim: new Date().toISOString().slice(0, 10),
  });

  const setFField = <K extends keyof FilamentoForm>(key: K, value: FilamentoForm[K]) =>
    setFForm((f) => ({ ...f, [key]: value }));

  const setIField = <K extends keyof InsumoForm>(key: K, value: InsumoForm[K]) =>
    setIForm((f) => ({ ...f, [key]: value }));

  const setEditInsumoField = <K extends keyof InsumoForm>(key: K, value: InsumoForm[K]) =>
    setEditInsumo((current) => (current ? { ...current, [key]: value } : current));

  // ── Filament submit ──
  const submitFilamento = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Math.max(1, Math.floor(Number(fForm.quantidade) || 1));
    const parsed = filamentoSchema.safeParse({
      sku: fForm.sku,
      marca: fForm.marca,
      cor: fForm.cor,
      material: fForm.material,
      pesoInicial: Number(fForm.pesoInicial),
      precoPago: Number(fForm.precoPago),
      dataCompra: fForm.dataCompra,
      dataEntrega: fForm.dataEntrega || null,
      qualidade: fForm.qualidade || null,
      observacao: fForm.observacao || null,
      linkProduto: fForm.linkProduto || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    // Validate payment inputs
    const formaPagamento = fForm.formaPagamento;
    const custoTotalNum =
      Number(fForm.custoTotal) > 0 ? Number(fForm.custoTotal) : parsed.data.precoPago * qty;
    const parcelas =
      formaPagamento === "parcelado" ? Math.max(1, Math.floor(Number(fForm.parcelas) || 1)) : 1;
    const dataParaPagamento = fForm.dataParaPagamento || parsed.data.dataCompra;
    if (!dataParaPagamento) {
      toast.error("Informe a data para pagamento.");
      return;
    }

    // Build SKU list for this batch (auto-increment when qty > 1; verify uniqueness against existing)
    const usedLower = new Set(allUsedSkus.map((s) => normalizeText(s)));
    const skus: string[] = [];
    const firstSku = parsed.data.sku.trim();
    if (usedLower.has(firstSku.toLowerCase())) {
      toast.error(`SKU "${firstSku}" já está cadastrado. Use outro código.`);
      return;
    }
    skus.push(firstSku);
    usedLower.add(firstSku.toLowerCase());
    for (let i = 1; i < qty; i++) {
      const next = generateSku([...usedLower]);
      skus.push(next);
      usedLower.add(next.toLowerCase());
    }

    const batchId = makeBatchId();

    try {
      for (const sku of skus) {
        await mutateFilamento.mutateAsync({ ...parsed.data, sku, batchId });
      }
      await mutateCreatePayment.mutateAsync({
        batchId,
        formaPagamento,
        custoTotal: custoTotalNum,
        parcelas,
        dataParaPagamento,
      });
      toast.success(
        qty === 1
          ? `Rolo [${skus[0]}] cadastrado${formaPagamento === "parcelado" ? ` · ${parcelas}× de ${brl(custoTotalNum / parcelas)}` : " · à vista"}.`
          : `${qty} rolos cadastrados (${skus[0]} → ${skus[skus.length - 1]}) · ${formaPagamento === "parcelado" ? `${parcelas}×` : "à vista"}.`,
      );
      setFForm({
        ...initialFilamentoForm,
        sku: "",
        dataCompra: todayIso(),
        dataParaPagamento: addCalendarMonthsIso(todayIso(), 1),
      });
      setCreateFilamentOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao cadastrar rolo.");
    }
  };

  // ── Archive submit ──
  const submitArchive = () => {
    mutateArchive.mutate({
      id: archiveDialog.filamentId,
      qualidade: archiveDialog.qualidade,
      observacao: archiveDialog.observacao || undefined,
      dataFim: archiveDialog.dataFim || undefined,
    });
    setArchiveDialog({
      open: false,
      filamentId: "",
      qualidade: "bom",
      observacao: "",
      dataFim: todayIso(),
    });
  };

  // ── Insumo submit ──
  const submitInsumo = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = insumoSchema.safeParse({
      nome: iForm.nome,
      dataCompra: iForm.dataCompra,
      quantidade: iForm.quantidade,
      precoTotal: Number(iForm.precoTotal),
      linkProduto: iForm.linkProduto || null,
      classificacaoFinanceira: iForm.classificacaoFinanceira,
      formaPagamento: iForm.formaPagamento,
      parcelas:
        iForm.formaPagamento === "parcelado"
          ? Math.max(1, Math.floor(Number(iForm.parcelas) || 1))
          : 1,
      dataParaPagamento: iForm.dataParaPagamento || iForm.dataCompra,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    mutateInsumo.mutate(parsed.data);
    setIForm({
      ...initialInsumoForm,
      dataCompra: todayIso(),
      dataParaPagamento: todayIso(),
    });
    setCreateInsumoOpen(false);
    toast.success(`Insumo "${parsed.data.nome}" cadastrado.`);
  };

  const submitEditInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInsumo) return;

    const parsed = insumoSchema.safeParse({
      nome: editInsumo.nome,
      dataCompra: editInsumo.dataCompra,
      quantidade: editInsumo.quantidade,
      precoTotal: Number(editInsumo.precoTotal),
      linkProduto: editInsumo.linkProduto || null,
      classificacaoFinanceira: editInsumo.classificacaoFinanceira,
      formaPagamento: editInsumo.formaPagamento,
      parcelas:
        editInsumo.formaPagamento === "parcelado"
          ? Math.max(1, Math.floor(Number(editInsumo.parcelas) || 1))
          : 1,
      dataParaPagamento: editInsumo.dataParaPagamento || editInsumo.dataCompra,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    try {
      await mutateUpdateInsumo.mutateAsync({ id: editInsumo.id, ...parsed.data });
      toast.success(`Insumo "${parsed.data.nome}" atualizado.`);
      setEditInsumo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar insumo.");
    }
  };

  // ── Summary stats ──
  const totalGramas = filamentos.reduce((sum, f) => sum + f.pesoAtual, 0);
  const totalInicial = filamentos.reduce((sum, f) => sum + f.pesoInicial, 0);
  const totalFilamentos = filamentos.reduce((sum, f) => sum + f.precoPago, 0);
  const totalInsumos = insumos.reduce((sum, i) => sum + i.precoTotal, 0);
  const totalInvestido = totalFilamentos + totalInsumos;
  const percentualGeral = totalInicial > 0 ? (totalGramas / totalInicial) * 100 : 0;
  const totalConsumido = filamentos.reduce((sum, f) => {
    const custoPorGrama = f.pesoInicial > 0 ? f.precoPago / f.pesoInicial : 0;
    const used = f.pesoInicial - f.pesoAtual;
    return sum + used * custoPorGrama;
  }, 0);
  const totalEmEstoque = filamentos.reduce((sum, f) => {
    const custoPorGrama = f.pesoInicial > 0 ? f.precoPago / f.pesoInicial : 0;
    return sum + f.pesoAtual * custoPorGrama;
  }, 0);

  // ── Filtered lists ──
  const filteredFilamentos = useMemo(() => {
    const s = normalizeText(filSearch);
    return filamentos
      .filter((f) => {
        const matchesSearch =
          !s ||
          normalizeText(f.sku).includes(s) ||
          normalizeText(f.marca).includes(s) ||
          normalizeText(f.cor).includes(s) ||
          normalizeText(f.material).includes(s);
        const matchesMarca =
          filMarcaFilter === "all" || normalizeText(f.marca) === normalizeText(filMarcaFilter);
        const matchesCor =
          filCorFilter === "all" || normalizeText(f.cor) === normalizeText(filCorFilter);
        const matchesMaterial = filMaterialFilter === "all" || f.material === filMaterialFilter;
        const matchesDataCompra = !filDataCompraFilter || f.dataCompra === filDataCompraFilter;
        const matchesDataEntrega =
          !filDataEntregaFilter || f.dataEntrega === filDataEntregaFilter;
        return (
          matchesSearch &&
          matchesMarca &&
          matchesCor &&
          matchesMaterial &&
          matchesDataCompra &&
          matchesDataEntrega
        );
      })
      .sort((a, b) => a.sku.localeCompare(b.sku, "pt-BR", { numeric: true }));
  }, [
    filDataCompraFilter,
    filDataEntregaFilter,
    filMarcaFilter,
    filCorFilter,
    filMaterialFilter,
    filamentos,
    filSearch,
  ]);

  const marcaOptions = useMemo(
    () =>
      Array.from(new Set(filamentos.map((f) => f.marca.trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [filamentos],
  );
  const corOptions = useMemo(
    () =>
      Array.from(new Set(filamentos.map((f) => f.cor.trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [filamentos],
  );

  const filteredInsumos = useMemo(() => {
    if (!insSearch.trim()) return insumos;
    const s = normalizeText(insSearch);
    return insumos.filter((i) => normalizeText(i.nome).includes(s));
  }, [insumos, insSearch]);

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return filamentosHistory;
    const s = normalizeText(historySearch);
    return filamentosHistory.filter(
      (h) =>
        normalizeText(h.sku).includes(s) ||
        normalizeText(h.marca).includes(s) ||
        normalizeText(h.cor).includes(s),
    );
  }, [filamentosHistory, historySearch]);

  const lowFilamentosCount = filteredFilamentos.filter(
    (f) => getFilamentoAlertLevel(f) === "low",
  ).length;
  const lowInsumosCount = filteredInsumos.filter((i) => getInsumoAlertLevel(i) === "low").length;
  const unknownInsumosCount = filteredInsumos.filter(
    (i) => getInsumoAlertLevel(i) === "unknown",
  ).length;

  const getInsumoPaymentMeta = (insumo: Insumo) => {
    const payment = insumo.paymentId ? insumoPayments.find((p) => p.id === insumo.paymentId) : null;
    const installments = payment
      ? insumoInstallments.filter((item) => item.paymentId === payment.id)
      : [];
    const firstInstallment = [...installments].sort((a, b) => a.numero - b.numero)[0];
    const paidCount = installments.filter((item) => item.pago).length;
    return {
      payment,
      installments,
      paidCount,
      dataParaPagamento: payment?.dataParaPagamento ?? firstInstallment?.vencimento ?? null,
    };
  };

  return {
    // Data
    filamentos,
    filamentosHistory,
    insumos,
    filamentoPayments,
    filamentoInstallments,
    insumoPayments,
    insumoInstallments,

    // Mutations
    mutateFilamento,
    mutateRemoveFilamento,
    mutateArchive,
    mutateUpdateArchived,
    mutateRestore,
    mutateInsumo,
    mutateUpdateInsumo,
    mutateRemoveInsumo,
    mutateCreatePayment,
    mutateUpdatePayment,
    mutateDeletePayment,
    mutatePayInstallment,
    mutateRevertInstallment,
    mutateUpdateInstallment,
    mutateSettlePayment,

    // Forms & dialogs
    fForm,
    setFField,
    iForm,
    setIField,
    editInsumo,
    setEditInsumo,
    setEditInsumoField,
    createInsumoOpen,
    setCreateInsumoOpen,
    createFilamentOpen,
    setCreateFilamentOpen,
    detailFilament,
    setDetailFilament,
    editForm,
    setEditForm,
    editMode,
    restoreTarget,
    setRestoreTarget,
    archiveDialog,
    setArchiveDialog,

    // Filters & view
    filSearch,
    setFilSearch,
    filMarcaFilter,
    setFilMarcaFilter,
    filCorFilter,
    setFilCorFilter,
    filMaterialFilter,
    setFilMaterialFilter,
    filDataCompraFilter,
    setFilDataCompraFilter,
    filDataEntregaFilter,
    setFilDataEntregaFilter,
    historySearch,
    setHistorySearch,
    insSearch,
    setInsSearch,
    stockView,
    setStockView,

    // Handlers
    openEdit,
    openEditArchived,
    setEditField,
    submitEdit,
    submitEditArchived,
    submitRestore,
    submitFilamento,
    submitArchive,
    submitInsumo,
    submitEditInsumo,

    // Derived
    allUsedSkus,
    totalGramas,
    totalInicial,
    totalInsumos,
    totalInvestido,
    percentualGeral,
    totalConsumido,
    totalEmEstoque,
    filteredFilamentos,
    marcaOptions,
    corOptions,
    filteredInsumos,
    filteredHistory,
    lowFilamentosCount,
    lowInsumosCount,
    unknownInsumosCount,
    getInsumoPaymentMeta,
  };
}

export type StockCtx = ReturnType<typeof useStockPageState>;
