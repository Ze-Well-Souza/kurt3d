import { Minus, ThumbsDown, ThumbsUp } from "lucide-react";
import { z } from "zod";
import type {
  Filamento,
  FilamentoQualidade,
  FormaPagamento,
  InsumoClassificacaoFinanceira,
} from "@/lib/domain/types";

export const MATERIALS = ["PLA", "PETG", "ABS", "TPU"] as const;
export type Material = (typeof MATERIALS)[number];
export type FilamentoQualidadeInput = FilamentoQualidade | "";

export const filamentoSchema = z.object({
  sku: z.string().trim().min(1, "SKU obrigatório").max(50),
  marca: z.string().trim().min(1, "Informe a marca").max(100),
  cor: z.string().trim().min(1, "Informe a cor").max(100),
  material: z.enum(MATERIALS),
  pesoInicial: z.number().min(1, "Peso inicial inválido").max(100000),
  precoPago: z.number().min(0.01, "Preço pago inválido").max(100000),
  dataCompra: z.string().min(1, "Data da compra obrigatória"),
  dataEntrega: z.string().min(1).max(30).nullable().optional(),
  qualidade: z.enum(["Ótimo", "bom", "médio", "ruim"]).nullable().optional(),
  observacao: z.string().max(500).nullable().optional(),
  linkProduto: z
    .string()
    .url("Informe um link válido começando com http:// ou https://")
    .max(500)
    .nullable()
    .optional(),
  ondeComprou: z.string().trim().max(120).nullable().optional(),
});

export type FilamentoForm = {
  sku: string;
  marca: string;
  cor: string;
  material: Material;
  pesoInicial: string;
  precoPago: string;
  dataCompra: string;
  dataEntrega: string;
  qualidade: FilamentoQualidadeInput;
  observacao: string;
  linkProduto: string;
  ondeComprou: string;
  quantidade: string;
  formaPagamento: FormaPagamento;
  custoTotal: string;
  parcelas: string;
  dataParaPagamento: string;
};

export type EditFilamentoForm = FilamentoForm & {
  id: string;
  pesoAtual: string;
};

export const initialFilamentoForm: FilamentoForm = {
  sku: "",
  marca: "",
  cor: "",
  material: "PLA",
  pesoInicial: "1000",
  precoPago: "",
  dataCompra: "",
  dataEntrega: "",
  qualidade: "",
  observacao: "",
  linkProduto: "",
  ondeComprou: "",
  quantidade: "1",
  formaPagamento: "a_vista",
  custoTotal: "",
  parcelas: "1",
  dataParaPagamento: "",
};

export const insumoSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do item").max(200),
  dataCompra: z.string().min(1, "Data da compra obrigatória"),
  quantidade: z.string().trim().min(1, "Informe a quantidade").max(100),
  precoTotal: z.number().min(0.01, "Preço total inválido").max(1000000),
  linkProduto: z
    .string()
    .url("Informe um link válido começando com http:// ou https://")
    .max(500)
    .nullable()
    .optional(),
  ondeComprou: z.string().trim().max(120).nullable().optional(),
  classificacaoFinanceira: z.enum(["operacional", "investimento"]),
  formaPagamento: z.enum(["a_vista", "parcelado"]),
  parcelas: z.number().int().min(1).max(48),
  dataParaPagamento: z.string().min(1, "Data para pagamento obrigatória").max(30),
});

export type InsumoForm = {
  nome: string;
  dataCompra: string;
  quantidade: string;
  precoTotal: string;
  linkProduto: string;
  ondeComprou: string;
  classificacaoFinanceira: InsumoClassificacaoFinanceira;
  formaPagamento: FormaPagamento;
  parcelas: string;
  dataParaPagamento: string;
};

export const initialInsumoForm: InsumoForm = {
  nome: "",
  dataCompra: "",
  quantidade: "",
  precoTotal: "",
  linkProduto: "",
  ondeComprou: "",
  classificacaoFinanceira: "operacional",
  formaPagamento: "a_vista",
  parcelas: "1",
  dataParaPagamento: "",
};

export const QUALIDADE_CONFIG: Record<
  FilamentoQualidade,
  { label: string; color: string; icon: typeof ThumbsUp }
> = {
  Ótimo: { label: "Ótimo", color: "var(--filament-cyan)", icon: ThumbsUp },
  bom: { label: "Bom", color: "var(--filament-green)", icon: ThumbsUp },
  médio: { label: "Médio", color: "var(--filament-yellow)", icon: Minus },
  ruim: { label: "Ruim", color: "var(--filament-magenta)", icon: ThumbsDown },
};

export function generateSku(usedSkus: string[]): string {
  let max = 0;
  for (const sku of usedSkus) {
    const match = sku.match(/^FIL-(\d+)$/i);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `FIL-${String(max + 1).padStart(3, "0")}`;
}

// Browser-safe batch id (no node:crypto dependency on client)
export function makeBatchId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "b-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

export type FilamentoView = Filamento & {
  reservedGrams?: number;
  disponivelGrams?: number;
  label?: string;
};
