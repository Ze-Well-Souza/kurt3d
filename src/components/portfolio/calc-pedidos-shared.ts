import { z } from "zod";
import type {
  OrderPartStatus,
  Status,
  CalculatorFilamentoInput,
  CalculatorExtraCost,
} from "@/lib/domain/types";
import type { BambuPresetId, PortfolioCalculatorEntryMode } from "@/lib/domain/portfolio-pricing";

export const CATEGORIES = [
  "Chaveiro",
  "Miniatura",
  "Peça Mecânica",
  "Decoração",
  "Cosplay",
  "Protótipo",
  "Casa & Organização",
  "Brinquedo & Jogo",
  "Ferramenta",
  "Hobby & DIY",
  "Arte",
  "Moda & Acessórios",
  "Educação",
  "Eletrônicos & Suportes",
  "Jardinagem",
  "Esporte & Outdoors",
  "Animais & Pets",
  "Jóias & Bijuteria",
  "Réplica & Colecionável",
  "Outro",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const COLUMNS: { id: Status; title: string; hint: string }[] = [
  { id: "todo", title: "A Fazer", hint: "Pedidos confirmados aguardando impressão" },
  { id: "printing", title: "Imprimindo", hint: "Em produção nas impressoras Bambu Lab" },
  { id: "acabamento", title: "Acabamento", hint: "Impressos, em pós-processamento e acabamento" },
  { id: "done", title: "Concluído", hint: "Prontos para retirada ou envio" },
];

export const PRINTERS = ["Bambu Lab A1", "Bambu Lab A1 Mini"] as const;
export const NO_PRINTER = "__none__";
/**
 * Pedido impresso nas duas maquinas ao mesmo tempo (peca dividida entre elas).
 * Fica fora de PRINTERS de proposito: PRINTERS lista maquinas fisicas e alimenta
 * o painel "o que esta rodando agora", que tem uma coluna por maquina. Um pedido
 * hibrido ocupa as duas, entao aparece nas duas colunas em vez de criar uma
 * terceira.
 */
export const HYBRID_PRINTER = "Híbrido";

export const projectSchema = z.object({
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

export type FormState = {
  nome: string;
  categoria: Category;
  linkModelo: string;
  custoRolo: string;
  pesoRolo: string;
  pesoPeca: string;
  tempoMin: string;
  quantidade: string;
  precoVenda: string;
  perdaPercent: string;
  entryMode: PortfolioCalculatorEntryMode;
  unidadesPorImpressao: string;
  modeloPreset: BambuPresetId;
  precoImpressora: string;
  vidaUtilHoras: string;
  margemPercent: string;
  // New multi-filament + cost fields
  filamentos: CalculatorFilamentoInput[];
  custosExtras: CalculatorExtraCost[];
  custoKwh: string;
  custoTrabalhoHoras: string;
  custoTrabalhoValorHora: string;
  taxaGateway: string;
};

export const FALLBACK_CUSTO_ROLO = 120;
export const FALLBACK_PESO_ROLO = 1000;
export const FALLBACK_QUANTIDADE = 10;

export function buildEmptyFilamentoItem(): CalculatorFilamentoInput {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `fil-${Date.now()}-${Math.random()}`;
  return {
    id,
    source: "manual",
    marca: "",
    cor: "",
    precoRolo: FALLBACK_CUSTO_ROLO,
    pesoRolo: FALLBACK_PESO_ROLO,
    pesoUsado: 0,
  };
}

export function buildEmptyExtraCost(): CalculatorExtraCost {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `ec-${Date.now()}-${Math.random()}`;
  return { id, nome: "", custo: 0, quantidade: 1 };
}

export const initialForm: FormState = {
  nome: "",
  categoria: "Chaveiro",
  linkModelo: "",
  custoRolo: String(FALLBACK_CUSTO_ROLO),
  pesoRolo: String(FALLBACK_PESO_ROLO),
  pesoPeca: "",
  tempoMin: "",
  quantidade: String(FALLBACK_QUANTIDADE),
  precoVenda: "",
  perdaPercent: "0",
  entryMode: "slicer",
  unidadesPorImpressao: "1",
  modeloPreset: "A1",
  precoImpressora: "2999",
  vidaUtilHoras: "2000",
  margemPercent: "30",
  filamentos: [buildEmptyFilamentoItem()],
  custosExtras: [],
  custoKwh: "",
  custoTrabalhoHoras: "",
  custoTrabalhoValorHora: "",
  taxaGateway: "0",
};

export const NO_CLIENT_SELECTED = "__none__";
export const MAX_ORDER_ASSET_SIZE = 25 * 1024 * 1024;
export const ORDER_ASSET_ACCEPT =
  ".stl,.3mf,model/stl,application/sla,application/vnd.ms-package.3dmanufacturing-3dmodel+xml";
export const ORDER_PART_STATUS_LABEL: Record<OrderPartStatus, string> = {
  todo: "A fazer",
  printing: "Imprimindo",
  done: "Concluida",
  falha: "Falha",
};

export type NewOrderPartForm = {
  id: string;
  nome: string;
  quantity: string;
  timeMinutes: string;
  gramsPerUnit: string;
  linkProjeto: string;
  notes: string;
  file: File | null;
};

export function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.ceil(bytes / 1024)} KB`;
}

export function fileToBase64(file: File) {
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

export function validateOrderAssetFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["stl", "3mf"].includes(extension)) {
    return "Envie apenas arquivos STL ou 3MF.";
  }
  if (file.size > MAX_ORDER_ASSET_SIZE) {
    return "O arquivo excede o limite de 25 MB.";
  }
  return null;
}

export function buildEmptyOrderPart(): NewOrderPartForm {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `part-${Date.now()}-${Math.random()}`;
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
