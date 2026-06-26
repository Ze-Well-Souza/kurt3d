import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Package, Wrench, Archive, ThumbsUp, ThumbsDown, Minus, ExternalLink, Eye, Pencil, LayoutGrid, Table as TableIcon, CreditCard, Banknote, Check, Undo2, CalendarClock } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  archiveFilamento,
  addInsumo,
  createFilamentoPayment,
  deleteFilamentoPayment,
  payInstallment,
  removeFilamento,
  removeInsumo,
  revertInstallment,
  settlePayment,
  updateInsumo,
  updateFilamentoPayment,
  updateInstallment,
  upsertFilamento,
} from "@/lib/api/data.functions";
import { addCalendarMonthsIso, todayIso } from "@/lib/domain/installments";
import type { Filamento, FilamentoHistory, FilamentoPayment, FilamentoPaymentInstallment, FilamentoQualidade, FormaPagamento, Insumo } from "@/lib/domain/types";
import { SearchInput } from "@/components/SearchInput";
import { useSnapshot } from "@/lib/hooks/use-snapshot";
import { normalizeText } from "@/lib/utils/normalization";
import { PaymentSchedule } from "@/components/admin/PaymentSchedule";
import { DetailRow, Field, NumberField } from "@/components/admin/stock-fields";

export const Route = createFileRoute("/admin/stock")({
  component: Stock,
});

const MATERIALS = ["PLA", "PETG", "ABS", "TPU"] as const;
type Material = (typeof MATERIALS)[number];

const filamentoSchema = z.object({
  sku: z.string().trim().min(1, "SKU obrigatório").max(50),
  marca: z.string().trim().min(1, "Informe a marca").max(100),
  cor: z.string().trim().min(1, "Informe a cor").max(100),
  material: z.enum(MATERIALS),
  pesoInicial: z.number().min(1, "Peso inicial inválido").max(100000),
  precoPago: z.number().min(0.01, "Preço pago inválido").max(100000),
  dataCompra: z.string().min(1, "Data da compra obrigatória"),
});

type FilamentoForm = {
  sku: string;
  marca: string;
  cor: string;
  material: Material;
  pesoInicial: string;
  precoPago: string;
  dataCompra: string;
  linkProduto: string;
  quantidade: string;
  formaPagamento: FormaPagamento;
  custoTotal: string;
  parcelas: string;
  primeiraVencimento: string;
};

type EditFilamentoForm = FilamentoForm & {
  id: string;
  pesoAtual: string;
};

const initialFilamentoForm: FilamentoForm = {
  sku: "",
  marca: "",
  cor: "",
  material: "PLA",
  pesoInicial: "1000",
  precoPago: "",
  dataCompra: "",
  linkProduto: "",
  quantidade: "1",
  formaPagamento: "a_vista",
  custoTotal: "",
  parcelas: "1",
  primeiraVencimento: "",
};


const insumoSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do item").max(200),
  dataCompra: z.string().min(1, "Data da compra obrigatória"),
  quantidade: z.string().trim().min(1, "Informe a quantidade").max(100),
  precoTotal: z.number().min(0.01, "Preço total inválido").max(1000000),
});

type InsumoForm = {
  nome: string;
  dataCompra: string;
  quantidade: string;
  precoTotal: string;
  linkProduto: string;
};

const initialInsumoForm: InsumoForm = {
  nome: "",
  dataCompra: "",
  quantidade: "",
  precoTotal: "",
  linkProduto: "",
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const QUALIDADE_CONFIG: Record<FilamentoQualidade, { label: string; color: string; icon: typeof ThumbsUp }> = {
  bom: { label: "Bom", color: "var(--filament-green)", icon: ThumbsUp },
  medio: { label: "Médio", color: "var(--filament-yellow)", icon: Minus },
  ruim: { label: "Ruim", color: "var(--filament-magenta)", icon: ThumbsDown },
};

function generateSku(usedSkus: string[]): string {
  let max = 0;
  for (const sku of usedSkus) {
    const match = sku.match(/^FIL-(\d+)$/i);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `FIL-${String(max + 1).padStart(3, "0")}`;
}

// Browser-safe batch id (no node:crypto dependency on client)
function makeBatchId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "b-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}


type FilamentoView = Filamento & { reservedGrams?: number; disponivelGrams?: number; label?: string };

function Stock() {
  const qc = useQueryClient();
  const snap = useSnapshot();
  const filamentos = (snap.data?.filamentos ?? []) as FilamentoView[];
  const filamentosHistory = (snap.data?.filamentosHistory ?? []) as FilamentoHistory[];
  const insumos = (snap.data?.insumos ?? []) as Insumo[];
  const filamentoPayments = (snap.data?.filamentoPayments ?? []) as FilamentoPayment[];
  const filamentoInstallments = (snap.data?.filamentoInstallments ?? []) as FilamentoPaymentInstallment[];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["snapshot"] });

  const mutateFilamento = useMutation({
    mutationFn: (input: z.infer<typeof filamentoSchema> & { id?: string; batchId?: string; paymentId?: string }) => upsertFilamento({ data: input as any }),
    onSuccess: invalidate,
  });

  const mutateRemoveFilamento = useMutation({
    mutationFn: (id: string) => removeFilamento({ data: { id } }),
    onSuccess: invalidate,
  });

  const mutateArchive = useMutation({
    mutationFn: (input: { id: string; qualidade?: FilamentoQualidade; comentario?: string }) =>
      archiveFilamento({ data: input }),
    onSuccess: () => {
      invalidate();
      toast.success("Filamento arquivado no histórico.");
    },
  });

  const mutateInsumo = useMutation({
    mutationFn: (input: z.infer<typeof insumoSchema>) => addInsumo({ data: input as any }),
    onSuccess: invalidate,
  });

  const mutateUpdateInsumo = useMutation({
    mutationFn: (input: z.infer<typeof insumoSchema> & { id: string }) => updateInsumo({ data: input as any }),
    onSuccess: invalidate,
  });

  const mutateRemoveInsumo = useMutation({
    mutationFn: (id: string) => removeInsumo({ data: { id } }),
    onSuccess: invalidate,
  });

  const mutateCreatePayment = useMutation({
    mutationFn: (input: { batchId: string; formaPagamento: FormaPagamento; custoTotal: number; parcelas: number; primeiraVencimento: string }) =>
      createFilamentoPayment({ data: input }),
    onSuccess: invalidate,
  });

  const mutateUpdatePayment = useMutation({
    mutationFn: (input: { paymentId: string; formaPagamento: FormaPagamento; custoTotal: number; parcelas: number; primeiraVencimento: string }) =>
      updateFilamentoPayment({ data: input }),
    onSuccess: invalidate,
  });

  const mutateDeletePayment = useMutation({
    mutationFn: (paymentId: string) => deleteFilamentoPayment({ data: { paymentId } }),
    onSuccess: invalidate,
  });

  const mutatePayInstallment = useMutation({
    mutationFn: (input: { installmentId: string; dataPagamento: string; valorPago?: number; observacao?: string }) =>
      payInstallment({ data: input }),
    onSuccess: invalidate,
  });

  const mutateRevertInstallment = useMutation({
    mutationFn: (installmentId: string) => revertInstallment({ data: { installmentId } }),
    onSuccess: invalidate,
  });

  const mutateUpdateInstallment = useMutation({
    mutationFn: (input: { installmentId: string; vencimento?: string; valor?: number; observacao?: string }) =>
      updateInstallment({ data: input }),
    onSuccess: invalidate,
  });

  const mutateSettlePayment = useMutation({
    mutationFn: (input: { paymentId: string; totalPago?: number; dataPagamento?: string }) =>
      settlePayment({ data: input }),
    onSuccess: invalidate,
  });

  const allUsedSkus = useMemo(
    () => [...filamentos.map((f) => f.sku), ...filamentosHistory.map((f) => f.sku)],
    [filamentos, filamentosHistory],
  );

  const [fForm, setFForm] = useState<FilamentoForm>(() => ({
    ...initialFilamentoForm,
    sku: generateSku(allUsedSkus),
    dataCompra: todayIso(),
    primeiraVencimento: addCalendarMonthsIso(todayIso(), 1),
  }));
  const [iForm, setIForm] = useState<InsumoForm>(initialInsumoForm);
  const [editInsumo, setEditInsumo] = useState<(InsumoForm & { id: string }) | null>(null);

  const [filSearch, setFilSearch] = useState("");
  const [insSearch, setInsSearch] = useState("");
  const [stockView, setStockView] = useState<"cards" | "table">(
    () => (localStorage.getItem("stock-view-preference") as "cards" | "table") ?? "cards"
  );
  const [detailFilament, setDetailFilament] = useState<Filamento | null>(null);
  const [editForm, setEditForm] = useState<EditFilamentoForm | null>(null);

  const openEdit = (f: Filamento) => {
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
      linkProduto: f.linkProduto ?? "",
      quantidade: "1",
      formaPagamento: payment?.formaPagamento ?? "a_vista",
      custoTotal: payment ? String(payment.custoTotal) : String(f.precoPago),
      parcelas: payment ? String(payment.parcelas) : "1",
      primeiraVencimento: first?.vencimento ?? (f.dataCompra || new Date().toISOString().slice(0, 10)),
    });
  };

  const setEditField = <K extends keyof EditFilamentoForm>(key: K, value: EditFilamentoForm[K]) =>
    setEditForm((f) => (f ? { ...f, [key]: value } : f));

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
      linkProduto: editForm.linkProduto || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    const formaPagamento: FormaPagamento = editForm.formaPagamento === "parcelado" ? "parcelado" : "a_vista";
    const custoTotalNum = Number(editForm.custoTotal) || Number(editForm.precoPago) || 0;
    const parcelas = formaPagamento === "parcelado" ? Math.max(1, Math.floor(Number(editForm.parcelas) || 1)) : 1;
    const primeiraVencimento = editForm.primeiraVencimento || editForm.dataCompra || new Date().toISOString().slice(0, 10);

    const existingFilamento = filamentos.find((x) => x.id === editForm.id);
    const existingPaymentId = existingFilamento?.paymentId ?? null;
    const batchId = existingFilamento?.batchId ?? makeBatchId();

    try {
      if (existingPaymentId) {
        // Update existing payment + filamento
        await mutateUpdatePayment.mutateAsync({
          paymentId: existingPaymentId,
          formaPagamento,
          custoTotal: custoTotalNum,
          parcelas,
          primeiraVencimento,
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
          primeiraVencimento,
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

  const [archiveDialog, setArchiveDialog] = useState<{
    open: boolean;
    filamentId: string;
    qualidade: FilamentoQualidade;
    comentario: string;
    dataFim: string;
  }>({
    open: false,
    filamentId: "",
    qualidade: "bom",
    comentario: "",
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
      linkProduto: fForm.linkProduto || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    // Validate payment inputs
    const formaPagamento = fForm.formaPagamento;
    const custoTotalNum =
      Number(fForm.custoTotal) > 0
        ? Number(fForm.custoTotal)
        : parsed.data.precoPago * qty;
    const parcelas = formaPagamento === "parcelado" ? Math.max(1, Math.floor(Number(fForm.parcelas) || 1)) : 1;
    const primeiraVencimento = fForm.primeiraVencimento || parsed.data.dataCompra;
    if (formaPagamento === "parcelado" && !fForm.primeiraVencimento) {
      toast.error("Informe a data do primeiro vencimento.");
      return;
    }

    // Build SKU list for this batch (auto-increment when qty > 1; verify uniqueness against existing)
    const usedLower = new Set(allUsedSkus.map((s) => normalizeText(s)));
    const skus: string[] = [];
    let firstSku = parsed.data.sku.trim();
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
        primeiraVencimento,
      });
      toast.success(
        qty === 1
          ? `Rolo [${skus[0]}] cadastrado${formaPagamento === "parcelado" ? ` · ${parcelas}× de ${brl(custoTotalNum / parcelas)}` : " · à vista"}.`
          : `${qty} rolos cadastrados (${skus[0]} → ${skus[skus.length - 1]}) · ${formaPagamento === "parcelado" ? `${parcelas}×` : "à vista"}.`,
      );
      setFForm({
        ...initialFilamentoForm,
        sku: generateSku([...usedLower]),
        dataCompra: todayIso(),
        primeiraVencimento: addCalendarMonthsIso(todayIso(), 1),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao cadastrar rolo.");
    }
  };


  // ── Archive submit ──
  const submitArchive = () => {
    mutateArchive.mutate({
      id: archiveDialog.filamentId,
      qualidade: archiveDialog.qualidade,
      comentario: archiveDialog.comentario || undefined,
    });
    setArchiveDialog({ open: false, filamentId: "", qualidade: "bom", comentario: "", dataFim: new Date().toISOString().slice(0, 10) });
  };

  // ── Insumo submit ──
  const submitInsumo = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = insumoSchema.safeParse({
      nome: iForm.nome,
      dataCompra: iForm.dataCompra,
      quantidade: iForm.quantidade,
      precoTotal: Number(iForm.precoTotal),
      linkProduto: iForm.linkProduto || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    mutateInsumo.mutate(parsed.data);
    setIForm(initialInsumoForm);
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
      linkProduto: editInsumo.linkProduto || undefined,
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

  // ── Filtered lists ──
  const filteredFilamentos = useMemo(() => {
    if (!filSearch.trim()) return filamentos;
    const s = normalizeText(filSearch);
    return filamentos.filter((f) => normalizeText(f.sku).includes(s) || normalizeText(f.marca).includes(s) || normalizeText(f.cor).includes(s) || normalizeText(f.material).includes(s));
  }, [filamentos, filSearch]);

  const filteredInsumos = useMemo(() => {
    if (!insSearch.trim()) return insumos;
    const s = normalizeText(insSearch);
    return insumos.filter((i) => normalizeText(i.nome).includes(s));
  }, [insumos, insSearch]);

  return (
    <div className="space-y-8">
      <Toaster />

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Estoque & Insumos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestão completa de filamentos, ferramentas e materiais de apoio.
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Rolos ativos
            </div>
            <div className="font-display text-xl font-bold">{filamentos.length}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Estoque geral
            </div>
            <div className="font-display text-xl font-bold filament-text">
              {percentualGeral.toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Total investido
            </div>
            <div className="font-display text-xl font-bold">{brl(totalInvestido)}</div>
          </div>
        </div>
      </div>

      {/* ═══════════ FILAMENT FORM ═══════════ */}
      <form
        onSubmit={submitFilamento}
        className="filament-top space-y-6 rounded-2xl border border-border bg-card p-6"
      >
        <h2 className="font-display text-lg font-semibold">Cadastrar Novo Rolo</h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Field label="SKU (Código)" className="md:col-span-1">
            <Input
              value={fForm.sku}
              onChange={(e) => setFField("sku", e.target.value.toUpperCase())}
              placeholder="FIL-004"
              maxLength={50}
            />
          </Field>
          <Field label="Marca">
            <Input
              value={fForm.marca}
              onChange={(e) => setFField("marca", e.target.value)}
              placeholder="Creality, Bambu Lab..."
              maxLength={100}
            />
          </Field>
          <Field label="Cor">
            <Input
              value={fForm.cor}
              onChange={(e) => setFField("cor", e.target.value)}
              placeholder="Cyan, Magenta, Black..."
              maxLength={100}
            />
          </Field>
          <Field label="Material">
            <Select
              value={fForm.material}
              onValueChange={(v) => setFField("material", v as Material)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIALS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <NumberField
            label="Peso Inicial (g)"
            value={fForm.pesoInicial}
            onChange={(v) => setFField("pesoInicial", v)}
            placeholder="1000"
            step="1"
          />
          <NumberField
            label="Preço Pago por Rolo (R$)"
            value={fForm.precoPago}
            onChange={(v) => setFField("precoPago", v)}
            placeholder="120,00"
          />

          <Field label="Data da Compra">
            <Input
              type="date"
              value={fForm.dataCompra}
              onChange={(e) => setFField("dataCompra", e.target.value)}
            />
          </Field>
          <NumberField
            label="Quantidade (rolos)"
            value={fForm.quantidade}
            onChange={(v) => setFField("quantidade", v)}
            placeholder="1"
            step="1"
          />

          <Field label="Link do Produto (opcional)" className="md:col-span-2 lg:col-span-4">
            <Input
              type="url"
              value={fForm.linkProduto}
              onChange={(e) => setFField("linkProduto", e.target.value)}
              placeholder="https://www.amazon.com.br/... ou link do vendedor"
              maxLength={500}
            />
          </Field>
        </div>

        {/* ─── PAYMENT DETAILS ─── */}
        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-display text-sm font-semibold">Detalhes do Pagamento</h3>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Forma de Pagamento" className="md:col-span-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={fForm.formaPagamento === "a_vista" ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => setFField("formaPagamento", "a_vista")}
                >
                  <Banknote className="h-4 w-4" /> À vista
                </Button>
                <Button
                  type="button"
                  variant={fForm.formaPagamento === "parcelado" ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => setFField("formaPagamento", "parcelado")}
                >
                  <CreditCard className="h-4 w-4" /> Parcelado
                </Button>
              </div>
            </Field>
            {fForm.formaPagamento === "parcelado" ? (
              <>
                <NumberField
                  label="Número de Parcelas"
                  value={fForm.parcelas}
                  onChange={(v) => setFField("parcelas", v)}
                  placeholder="1"
                  step="1"
                />
                <NumberField
                  label="Custo Total (R$)"
                  value={fForm.custoTotal}
                  onChange={(v) => setFField("custoTotal", v)}
                  placeholder={
                    fForm.precoPago
                      ? String((Number(fForm.precoPago) * Math.max(1, Number(fForm.quantidade) || 1)).toFixed(2))
                      : "0,00"
                  }
                />
                <Field label="Primeiro Vencimento" className="md:col-span-2 lg:col-span-4">
                  <Input
                    type="date"
                    value={fForm.primeiraVencimento}
                    onChange={(e) => setFField("primeiraVencimento", e.target.value)}
                  />
                </Field>
              </>
            ) : (
              <NumberField
                label="Custo Total (R$)"
                value={fForm.custoTotal}
                onChange={(v) => setFField("custoTotal", v)}
                placeholder={
                  fForm.precoPago
                    ? String((Number(fForm.precoPago) * Math.max(1, Number(fForm.quantidade) || 1)).toFixed(2))
                    : "0,00"
                }
              />
            )}
          </div>
          {(() => {
            const qty = Math.max(1, Number(fForm.quantidade) || 1);
            const preco = Number(fForm.precoPago) || 0;
            const custoTotal = Number(fForm.custoTotal) || preco * qty;
            const parcelas = Math.max(1, Math.floor(Number(fForm.parcelas) || 1));
            const perParcel = parcelas > 0 ? custoTotal / parcelas : 0;
            const juros = custoTotal - preco * qty;
            if (!preco) return null;
            return (
              <p className="mt-3 text-xs text-muted-foreground">
                {fForm.formaPagamento === "parcelado" ? (
                  <>
                    <span className="font-semibold tabular-nums text-foreground">
                      {parcelas}× de {brl(perParcel)}
                    </span>
                    {juros > 0.01 && (
                      <span className="ml-1">· juros de {brl(juros)} sobre o preço à vista</span>
                    )}
                  </>
                ) : (
                  <>
                    Pagamento à vista: <span className="font-semibold tabular-nums">{brl(custoTotal)}</span>
                    {qty > 1 && <span> para {qty} rolos</span>}
                  </>
                )}
              </p>
            );
          })()}
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="lg" className="btn-filament gap-2 px-6">
            <Plus className="h-4 w-4" /> Adicionar Rolo
          </Button>
        </div>
      </form>

      {/* ═══════════ FILAMENT LIST ═══════════ */}
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Estoque Atual de Filamentos</h2>
            <p className="text-xs text-muted-foreground">
              {filteredFilamentos.length} rolo(s) · {totalGramas}g de {totalInicial}g restantes
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput value={filSearch} onChange={setFilSearch} placeholder="Buscar filamento..." />
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
              <Button
                size="sm"
                variant={stockView === "cards" ? "default" : "ghost"}
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={() => { setStockView("cards"); localStorage.setItem("stock-view-preference", "cards"); }}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cards
              </Button>
              <Button
                size="sm"
                variant={stockView === "table" ? "default" : "ghost"}
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={() => { setStockView("table"); localStorage.setItem("stock-view-preference", "table"); }}
              >
                <TableIcon className="h-3.5 w-3.5" />
                Tabela
              </Button>
            </div>
          </div>
        </div>
        {filamentos.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            Nenhum filamento cadastrado. Adicione seu primeiro rolo acima.
          </div>
        ) : stockView === "table" ? (
          /* ───────── TABLE VIEW ───────── */
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-center">Pagamento</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-center">Nível</TableHead>
                  <TableHead className="text-right">Custo/g</TableHead>
                  <TableHead className="text-right">Investido</TableHead>
                  <TableHead>Data Compra</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFilamentos.map((f) => {
                  const percent = f.pesoInicial > 0 ? (f.pesoAtual / f.pesoInicial) * 100 : 0;
                  const custoPorGrama = f.pesoInicial > 0 ? f.precoPago / f.pesoInicial : 0;
                  const isLow = percent < 20;
                  const isMedium = percent >= 20 && percent < 50;
                  const levelColor = isLow
                    ? "#ef4444"
                    : isMedium
                      ? "#e0a93b"
                      : "#5fa8a3";
                  const payment = f.paymentId ? filamentoPayments.find((p) => p.id === f.paymentId) : null;
                  const insts = payment ? filamentoInstallments.filter((i) => i.paymentId === payment.id) : [];
                  const paidCount = insts.filter((i) => i.pago).length;
                  const totalInsts = insts.length;
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs">{f.sku}</TableCell>
                      <TableCell className="font-medium">{f.marca}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-3 w-3 rounded-full border border-border"
                            style={{ background: levelColor }}
                          />
                          {f.cor}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {f.material}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!payment ? (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        ) : payment.formaPagamento === "a_vista" ? (
                          <Badge variant="outline" className="gap-1 border-green-600/30 bg-green-50 text-green-700 text-[10px]">
                            <Banknote className="h-3 w-3" /> À vista
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 border-blue-500/30 bg-blue-50 text-blue-700 text-[10px]">
                            <CreditCard className="h-3 w-3" />
                            {paidCount}/{totalInsts}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div className="font-semibold">
                          {f.pesoAtual}g
                          <span className="text-muted-foreground"> / {f.pesoInicial}g</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, percent)}%`,
                                background: levelColor,
                              }}
                            />
                          </div>
                          <span
                            className="w-10 text-right text-xs font-semibold tabular-nums"
                            style={{ color: isLow ? "#ef4444" : undefined }}
                          >
                            {percent.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {brl(custoPorGrama)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {brl(f.precoPago)}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {new Date(f.dataCompra).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        {f.linkProduto ? (
                          <a
                            href={f.linkProduto}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ver
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setDetailFilament(f as Filamento)}
                            title="Ver detalhes"
                            aria-label="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEdit(f as Filamento)}
                            title="Editar"
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() =>
                              setArchiveDialog({
                                open: true,
                                filamentId: f.id,
                                qualidade: "bom",
                                comentario: "",
                                dataFim: new Date().toISOString().slice(0, 10),
                              })
                            }
                            title="Finalizar (arquivar)"
                            aria-label="Finalizar"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              mutateRemoveFilamento.mutate(f.id);
                              toast.success("Filamento removido.");
                            }}
                            aria-label="Excluir filamento"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Excluir"
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
          </div>
        ) : (
          /* ───────── CARD VIEW ───────── */
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFilamentos.map((f) => {
              const percent = f.pesoInicial > 0 ? (f.pesoAtual / f.pesoInicial) * 100 : 0;
              const custoPorGrama = f.pesoInicial > 0 ? f.precoPago / f.pesoInicial : 0;
              const isLow = percent < 20;
              const isMedium = percent >= 20 && percent < 50;

              return (
                <div
                  key={f.id}
                  className="relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
                >
                  {isLow && (
                    <div className="absolute right-3 top-3">
                      <Badge variant="destructive" className="text-xs">
                        Acabando!
                      </Badge>
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
                      style={{
                        background: isLow
                          ? "rgba(239,68,68,0.15)"
                          : isMedium
                            ? "rgba(224,169,59,0.15)"
                            : "rgba(95,168,163,0.15)",
                      }}
                    >
                      <Package
                        className="h-5 w-5"
                        style={{
                          color: isLow ? "#ef4444" : isMedium ? "#e0a93b" : "#5fa8a3",
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold leading-tight">
                        {f.marca} — {f.cor}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {f.sku}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {f.material}
                        </Badge>
                        {(() => {
                          const payment = f.paymentId ? filamentoPayments.find((p) => p.id === f.paymentId) : null;
                          if (!payment) return null;
                          const insts = filamentoInstallments.filter((i) => i.paymentId === payment.id);
                          const paidCount = insts.filter((i) => i.pago).length;
                          return payment.formaPagamento === "a_vista" ? (
                            <Badge variant="outline" className="gap-1 border-green-600/30 bg-green-50 text-green-700 text-[10px]">
                              <Banknote className="h-3 w-3" /> À vista
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 border-blue-500/30 bg-blue-50 text-blue-700 text-[10px]">
                              <CreditCard className="h-3 w-3" />
                              {paidCount}/{insts.length}
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-end justify-between text-xs">
                      <span className="text-muted-foreground">Estoque restante</span>
                      <span className="font-semibold tabular-nums">
                        {f.pesoAtual}g / {f.pesoInicial}g
                      </span>
                    </div>
                    <Progress
                      value={percent}
                      className={isLow ? "progress-low" : isMedium ? "progress-medium" : ""}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span
                        className="tabular-nums font-medium"
                        style={{ color: isLow ? "#ef4444" : undefined }}
                      >
                        {percent.toFixed(0)}%
                      </span>
                      <span>Custo/g: {brl(custoPorGrama)}</span>
                    </div>
                  </div>

                  {/* Quality badge (if set) */}
                  {f.qualidade && (
                    <div className="mt-3 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="gap-1 text-xs"
                        style={{ borderColor: QUALIDADE_CONFIG[f.qualidade].color, color: QUALIDADE_CONFIG[f.qualidade].color }}
                      >
                        {(() => { const Icon = QUALIDADE_CONFIG[f.qualidade].icon; return <Icon className="h-3 w-3" />; })()}
                        {QUALIDADE_CONFIG[f.qualidade].label}
                      </Badge>
                    </div>
                  )}

                  {/* Link (if set) */}
                  {f.linkProduto && (
                    <a
                      href={f.linkProduto}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ver produto
                    </a>
                  )}

                  {/* Comment (if set) */}
                  {f.comentario && (
                    <p className="mt-2 text-xs italic text-muted-foreground line-clamp-2">
                      "{f.comentario}"
                    </p>
                  )}

                  {/* Footer */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                    <div className="text-xs text-muted-foreground">
                      {brl(f.precoPago)} ·{" "}
                      <span className="tabular-nums">
                        {new Date(f.dataCompra).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => setDetailFilament(f as Filamento)}
                        title="Ver detalhes"
                        aria-label="Ver detalhes"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => openEdit(f as Filamento)}
                        title="Editar"
                        aria-label="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() =>
                          setArchiveDialog({
                            open: true,
                            filamentId: f.id,
                            qualidade: "bom",
                            comentario: "",
                            dataFim: new Date().toISOString().slice(0, 10),
                          })
                        }
                        title="Finalizar (arquivar)"
                        aria-label="Finalizar"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          mutateRemoveFilamento.mutate(f.id);
                          toast.success("Filamento removido.");
                        }}
                        aria-label="Excluir filamento"
                        title="Excluir"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════ ARCHIVE DIALOG ═══════════ */}
      <Dialog open={archiveDialog.open} onOpenChange={(open) => setArchiveDialog((s) => ({ ...s, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar Filamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              O filamento será removido do estoque ativo e salvo no histórico.
            </p>
            <div className="space-y-2">
              <Label>Data de Término</Label>
              <Input
                type="date"
                value={archiveDialog.dataFim}
                onChange={(e) => setArchiveDialog((s) => ({ ...s, dataFim: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Qualidade do Filamento</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["bom", "medio", "ruim"] as FilamentoQualidade[]).map((q) => {
                  const cfg = QUALIDADE_CONFIG[q];
                  const Icon = cfg.icon;
                  const selected = archiveDialog.qualidade === q;
                  return (
                    <Button
                      key={q}
                      type="button"
                      variant={selected ? "default" : "outline"}
                      className="gap-1.5"
                      style={selected ? { background: cfg.color } : undefined}
                      onClick={() => setArchiveDialog((s) => ({ ...s, qualidade: q }))}
                    >
                      <Icon className="h-4 w-4" />
                      {cfg.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Comentário (opcional)</Label>
              <Textarea
                rows={3}
                maxLength={500}
                placeholder="Ex: Cor ficou apagada, quebrou fácil, excelente acabamento..."
                value={archiveDialog.comentario}
                onChange={(e) => setArchiveDialog((s) => ({ ...s, comentario: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveDialog((s) => ({ ...s, open: false }))}>
              Cancelar
            </Button>
            <Button className="btn-filament" onClick={submitArchive}>
              <Archive className="mr-2 h-4 w-4" />
              Arquivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ FILAMENT HISTORY ═══════════ */}
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-display text-lg font-semibold">Histórico de Filamentos</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {filamentosHistory.length} rolo(s) arquivado(s)
          </span>
        </div>
        {filamentosHistory.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhum filamento arquivado ainda. Use o botão "Finalizar" em um rolo para movê-lo ao histórico.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Marca / Cor</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Compra</TableHead>
                <TableHead>Término</TableHead>
                <TableHead>Qualidade</TableHead>
                <TableHead>Comentário</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="text-right">Preço</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filamentosHistory.map((h) => {
                const qCfg = h.qualidade ? QUALIDADE_CONFIG[h.qualidade] : null;
                return (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono text-xs">{h.sku}</TableCell>
                    <TableCell className="font-medium">{h.marca} — {h.cor}</TableCell>
                    <TableCell>{h.material}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {new Date(h.dataCompra).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {h.dataFim ? new Date(h.dataFim).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell>
                      {qCfg ? (
                        <Badge
                          variant="outline"
                          className="gap-1 text-xs"
                          style={{ borderColor: qCfg.color, color: qCfg.color }}
                        >
                          {(() => { const Icon = qCfg.icon; return <Icon className="h-3 w-3" />; })()}
                          {qCfg.label}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={h.comentario ?? ""}>
                      {h.comentario || "—"}
                    </TableCell>
                    <TableCell>
                      {h.linkProduto ? (
                        <a href={h.linkProduto} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 hover:underline">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{brl(h.precoPago)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ═══════════ INSUMOS FORM ═══════════ */}
      <form
        onSubmit={submitInsumo}
        className="filament-top space-y-6 rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-semibold">
            Outros Insumos e Ferramentas
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Nome do Item" className="md:col-span-2">
            <Input
              value={iForm.nome}
              onChange={(e) => setIField("nome", e.target.value)}
              placeholder="Correntes de Chaveiro, Álcool Isopropílico, Bico 0.4mm..."
              maxLength={200}
            />
          </Field>
          <Field label="Data da Compra">
            <Input
              type="date"
              value={iForm.dataCompra}
              onChange={(e) => setIField("dataCompra", e.target.value)}
            />
          </Field>
          <Field label="Quantidade / Volume">
            <Input
              value={iForm.quantidade}
              onChange={(e) => setIField("quantidade", e.target.value)}
              placeholder="Ex: 100 un., 500ml, 1 pc..."
              maxLength={100}
            />
          </Field>
          <NumberField
            label="Preço Total Pago (R$)"
            value={iForm.precoTotal}
            onChange={(v) => setIField("precoTotal", v)}
            placeholder="25,00"
          />
          <Field label="Link do Produto (opcional)" className="md:col-span-2 lg:col-span-4">
            <Input
              type="url"
              value={iForm.linkProduto}
              onChange={(e) => setIField("linkProduto", e.target.value)}
              placeholder="https://www.amazon.com.br/... ou link do vendedor"
              maxLength={500}
            />
          </Field>
        </div>
          <div className="flex justify-end">
          <Button type="submit" size="lg" className="btn-filament gap-2 px-6">
            <Plus className="h-4 w-4" /> Adicionar Insumo
          </Button>
        </div>
      </form>

      {/* ═══════════ INSUMOS TABLE ═══════════ */}
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Insumos Cadastrados</h2>
          <div className="flex items-center gap-3">
            <SearchInput value={insSearch} onChange={setInsSearch} placeholder="Buscar insumo..." />
            <span className="text-xs text-muted-foreground">
              {filteredInsumos.length} item(ns) · {brl(totalInsumos)}
            </span>
          </div>
        </div>
        {insumos.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            Nenhum insumo cadastrado ainda. Registre ferramentas e materiais de apoio acima.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="text-right">Preço Total</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInsumos.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.nome}</TableCell>
                  <TableCell>{i.quantidade}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {new Date(i.dataCompra).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    {i.linkProduto ? (
                      <a href={i.linkProduto} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline">
                        <ExternalLink className="h-3 w-3" />
                        Ver produto
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {brl(i.precoTotal)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setEditInsumo({
                            id: i.id,
                            nome: i.nome,
                            dataCompra: i.dataCompra,
                            quantidade: i.quantidade,
                            precoTotal: String(i.precoTotal),
                            linkProduto: i.linkProduto ?? "",
                          })
                        }
                        aria-label="Editar insumo"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          mutateRemoveInsumo.mutate(i.id);
                          toast.success("Insumo removido.");
                        }}
                        aria-label="Excluir insumo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!editInsumo} onOpenChange={(open) => !open && setEditInsumo(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Insumo</DialogTitle>
          </DialogHeader>
          {editInsumo && (
            <form className="space-y-5 py-2" onSubmit={submitEditInsumo}>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Nome do Item" className="md:col-span-2">
                  <Input
                    value={editInsumo.nome}
                    onChange={(e) => setEditInsumoField("nome", e.target.value)}
                    maxLength={200}
                  />
                </Field>
                <Field label="Data da Compra">
                  <Input
                    type="date"
                    value={editInsumo.dataCompra}
                    onChange={(e) => setEditInsumoField("dataCompra", e.target.value)}
                  />
                </Field>
                <Field label="Quantidade / Volume">
                  <Input
                    value={editInsumo.quantidade}
                    onChange={(e) => setEditInsumoField("quantidade", e.target.value)}
                    maxLength={100}
                  />
                </Field>
                <NumberField
                  label="Preço Total Pago (R$)"
                  value={editInsumo.precoTotal}
                  onChange={(value) => setEditInsumoField("precoTotal", value)}
                  placeholder="25,00"
                />
                <Field label="Link do Produto (opcional)" className="md:col-span-2">
                  <Input
                    type="url"
                    value={editInsumo.linkProduto}
                    onChange={(e) => setEditInsumoField("linkProduto", e.target.value)}
                    maxLength={500}
                  />
                </Field>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditInsumo(null)}>
                  Cancelar
                </Button>
                <Button type="submit" className="btn-filament" disabled={mutateUpdateInsumo.isPending}>
                  Salvar alterações
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════ FILAMENT DETAIL DIALOG ═══════════ */}
      <Dialog open={!!detailFilament} onOpenChange={(o) => !o && setDetailFilament(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detalhes do Filamento
            </DialogTitle>
          </DialogHeader>
          {detailFilament && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <DetailRow label="SKU" value={detailFilament.sku} mono />
                <DetailRow label="Material" value={detailFilament.material} />
                <DetailRow label="Marca" value={detailFilament.marca} />
                <DetailRow label="Cor" value={detailFilament.cor} />
                <DetailRow label="Peso inicial" value={`${detailFilament.pesoInicial} g`} />
                <DetailRow label="Preço pago" value={brl(detailFilament.precoPago)} />
                <DetailRow
                  label="Data da compra"
                  value={new Date(detailFilament.dataCompra).toLocaleDateString("pt-BR")}
                />
                <DetailRow
                  label="Custo por grama"
                  value={brl(
                    detailFilament.pesoInicial > 0
                      ? detailFilament.precoPago / detailFilament.pesoInicial
                      : 0,
                  )}
                />
              </div>

              <div className="space-y-1 border-t border-border pt-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Link do produto
                </div>
                {detailFilament.linkProduto ? (
                  <a
                    href={detailFilament.linkProduto}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="truncate">{detailFilament.linkProduto}</span>
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">— sem link cadastrado</p>
                )}
              </div>

              {detailFilament.comentario && (
                <div className="space-y-1 border-t border-border pt-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Comentário
                  </div>
                  <p className="text-sm italic text-muted-foreground">
                    "{detailFilament.comentario}"
                  </p>
                </div>
              )}

              {detailFilament.qualidade && (
                <div className="space-y-1 border-t border-border pt-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Qualidade
                  </div>
                  <Badge
                    variant="outline"
                    className="gap-1 text-xs"
                    style={{
                      borderColor: QUALIDADE_CONFIG[detailFilament.qualidade].color,
                      color: QUALIDADE_CONFIG[detailFilament.qualidade].color,
                    }}
                  >
                    {(() => {
                      const Icon = QUALIDADE_CONFIG[detailFilament.qualidade!].icon;
                      return <Icon className="h-3 w-3" />;
                    })()}
                    {QUALIDADE_CONFIG[detailFilament.qualidade].label}
                  </Badge>
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                <span>Quantidade cadastrada</span>
                <span className="font-semibold tabular-nums text-foreground">1 rolo</span>
              </div>

              {(() => {
                const payment = detailFilament?.paymentId
                  ? filamentoPayments.find((p) => p.id === detailFilament.paymentId)
                  : null;
                if (!payment) {
                  return (
                    <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                      Sem plano de pagamento cadastrado.
                    </div>
                  );
                }
                const insts = filamentoInstallments.filter((i) => i.paymentId === payment.id);
                const batchFils = filamentos.filter((f) => f.batchId === payment.batchId);
                return (
                  <PaymentSchedule
                    payment={payment}
                    installments={insts}
                    batchFilamentos={batchFils}
                    brl={brl}
                    isPending={
                      mutatePayInstallment.isPending ||
                      mutateRevertInstallment.isPending ||
                      mutateSettlePayment.isPending ||
                      mutateUpdateInstallment.isPending
                    }
                    onPay={(input) => mutatePayInstallment.mutateAsync(input).then(() => { toast.success("Parcela marcada como paga."); })}
                    onRevert={(id) => mutateRevertInstallment.mutateAsync(id).then(() => { toast.success("Pagamento desfeito."); })}
                    onSettle={(input) => mutateSettlePayment.mutateAsync(input).then(() => { toast.success("Todas as parcelas quitadas."); })}
                    onUpdateInst={(input) => mutateUpdateInstallment.mutateAsync(input).then(() => { toast.success("Parcela atualizada."); })}
                  />
                );
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailFilament(null)}>
              Fechar
            </Button>
            {detailFilament && (
              <Button
                className="btn-filament gap-2"
                onClick={() => {
                  const f = detailFilament;
                  setDetailFilament(null);
                  openEdit(f);
                }}
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ FILAMENT EDIT DIALOG ═══════════ */}
      <Dialog open={!!editForm} onOpenChange={(o) => !o && setEditForm(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar Filamento
            </DialogTitle>
          </DialogHeader>
          {editForm && (
            <form onSubmit={submitEdit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="SKU (Código)">
                  <Input
                    value={editForm.sku}
                    onChange={(e) => setEditField("sku", e.target.value.toUpperCase())}
                    placeholder="FIL-001"
                    maxLength={50}
                  />
                </Field>
                <Field label="Material">
                  <Select
                    value={editForm.material}
                    onValueChange={(v) => setEditField("material", v as Material)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIALS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Marca">
                  <Input
                    value={editForm.marca}
                    onChange={(e) => setEditField("marca", e.target.value)}
                    placeholder="Creality, Bambu Lab..."
                    maxLength={100}
                  />
                </Field>
                <Field label="Cor">
                  <Input
                    value={editForm.cor}
                    onChange={(e) => setEditField("cor", e.target.value)}
                    placeholder="Cyan, Magenta, Black..."
                    maxLength={100}
                  />
                </Field>
                <NumberField
                  label="Peso Inicial (g)"
                  value={editForm.pesoInicial}
                  onChange={(v) => setEditField("pesoInicial", v)}
                  placeholder="1000"
                  step="1"
                />
                <NumberField
                  label="Peso Atual (g)"
                  value={editForm.pesoAtual}
                  onChange={(v) => setEditField("pesoAtual", v)}
                  placeholder="1000"
                  step="1"
                />
                <NumberField
                  label="Preço Pago por Rolo (R$)"
                  value={editForm.precoPago}
                  onChange={(v) => setEditField("precoPago", v)}
                  placeholder="120,00"
                />
                <Field label="Data da Compra">
                  <Input
                    type="date"
                    value={editForm.dataCompra}
                    onChange={(e) => setEditField("dataCompra", e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Link do Produto (opcional)">
                <Input
                  type="url"
                  value={editForm.linkProduto}
                  onChange={(e) => setEditField("linkProduto", e.target.value)}
                  placeholder="https://www.amazon.com.br/... ou link do vendedor"
                  maxLength={500}
                />
              </Field>

              {/* ─── PAYMENT DETAILS (EDIT) ─── */}
              <div className="rounded-xl border border-border bg-muted/30 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-display text-sm font-semibold">Detalhes do Pagamento</h3>
                </div>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                  <Field label="Forma de Pagamento" className="md:col-span-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={editForm.formaPagamento === "a_vista" ? "default" : "outline"}
                        className="flex-1 gap-2"
                        onClick={() => setEditField("formaPagamento", "a_vista")}
                      >
                        <Banknote className="h-4 w-4" /> À vista
                      </Button>
                      <Button
                        type="button"
                        variant={editForm.formaPagamento === "parcelado" ? "default" : "outline"}
                        className="flex-1 gap-2"
                        onClick={() => setEditField("formaPagamento", "parcelado")}
                      >
                        <CreditCard className="h-4 w-4" /> Parcelado
                      </Button>
                    </div>
                  </Field>
                  {editForm.formaPagamento === "parcelado" ? (
                    <>
                      <NumberField
                        label="Número de Parcelas"
                        value={editForm.parcelas}
                        onChange={(v) => setEditField("parcelas", v)}
                        placeholder="1"
                        step="1"
                      />
                      <NumberField
                        label="Custo Total (R$)"
                        value={editForm.custoTotal}
                        onChange={(v) => setEditField("custoTotal", v)}
                        placeholder={
                          editForm.precoPago ? String(Number(editForm.precoPago).toFixed(2)) : "0,00"
                        }
                      />
                      <Field label="Primeiro Vencimento" className="md:col-span-2 lg:col-span-4">
                        <Input
                          type="date"
                          value={editForm.primeiraVencimento}
                          onChange={(e) => setEditField("primeiraVencimento", e.target.value)}
                        />
                      </Field>
                    </>
                  ) : (
                    <NumberField
                      label="Custo Total (R$)"
                      value={editForm.custoTotal}
                      onChange={(v) => setEditField("custoTotal", v)}
                      placeholder={
                        editForm.precoPago ? String(Number(editForm.precoPago).toFixed(2)) : "0,00"
                      }
                    />
                  )}
                </div>
                {(() => {
                  const preco = Number(editForm.precoPago) || 0;
                  const custoTotal = Number(editForm.custoTotal) || preco;
                  const parcelas = Math.max(1, Math.floor(Number(editForm.parcelas) || 1));
                  const perParcel = parcelas > 0 ? custoTotal / parcelas : 0;
                  const juros = custoTotal - preco;
                  if (!preco) return null;
                  return (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {editForm.formaPagamento === "parcelado" ? (
                        <>
                          <span className="font-semibold tabular-nums text-foreground">
                            {parcelas}× de {brl(perParcel)}
                          </span>
                          {juros > 0.01 && (
                            <span className="ml-1">· juros de {brl(juros)} sobre o preço à vista</span>
                          )}
                        </>
                      ) : (
                        <>
                          Pagamento à vista:{" "}
                          <span className="font-semibold tabular-nums">{brl(custoTotal)}</span>
                        </>
                      )}
                    </p>
                  );
                })()}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditForm(null)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="btn-filament gap-2"
                  disabled={mutateFilamento.isPending || mutateCreatePayment.isPending || mutateUpdatePayment.isPending}
                >
                  {mutateFilamento.isPending || mutateCreatePayment.isPending || mutateUpdatePayment.isPending
                    ? "Salvando…"
                    : "Salvar alterações"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

