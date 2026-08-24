/**
 * Paleta canonica de cores de filamento.
 *
 * A cor era texto livre e o cadastro acumulou 26 grafias para 66 rolos:
 * "Dourada"/"Dourado"/"Ouro claro" para a mesma cor, "SKIN (Cor de pele)" ao
 * lado de "Pele", e base misturada com tom em "Azul Cobalto", "Verde militar",
 * "Marrom Caramelo". Sem uma lista fechada nao da para contar quantos rolos
 * pretos existem, nem comparar preco medio por cor.
 *
 * Agora `cor` sai desta lista e o nome comercial vai em `corTom` (texto livre,
 * porque "Cobalto" e "Petroleo" nao cabem num eixo claro/escuro).
 */
export type FilamentColor = {
  /** Valor gravado em filamentos.cor. */
  nome: string;
  /** Amostra usada nas bolinhas e nos chips de contagem. */
  hex: string;
};

export const FILAMENT_COLORS: readonly FilamentColor[] = [
  { nome: "Preto", hex: "#1a1a1a" },
  { nome: "Branco", hex: "#f5f5f5" },
  { nome: "Cinza", hex: "#9ca3af" },
  { nome: "Prata", hex: "#c0c5ce" },
  { nome: "Dourado", hex: "#d4af37" },
  { nome: "Bronze", hex: "#b08d57" },
  { nome: "Cobre", hex: "#b87333" },
  { nome: "Amarelo", hex: "#f5c518" },
  { nome: "Laranja", hex: "#ff8a3d" },
  { nome: "Vermelho", hex: "#ef4444" },
  { nome: "Rosa", hex: "#f472b6" },
  { nome: "Roxo", hex: "#8b5cf6" },
  { nome: "Lilás", hex: "#c4b5fd" },
  { nome: "Azul", hex: "#3b82f6" },
  { nome: "Ciano", hex: "#22d3ee" },
  { nome: "Turquesa", hex: "#2dd4bf" },
  { nome: "Verde", hex: "#22c55e" },
  { nome: "Marrom", hex: "#8b5a2b" },
  { nome: "Bege", hex: "#e3c9a8" },
  { nome: "Pele", hex: "#f0c9a0" },
  { nome: "Natural", hex: "#ede4d3" },
  { nome: "Transparente", hex: "#dbeafe" },
  { nome: "Multicolor", hex: "#a78bfa" },
  { nome: "Outro", hex: "#9ca3af" },
] as const;

export const FILAMENT_COLOR_NAMES = FILAMENT_COLORS.map((c) => c.nome);

/** Cinza usado quando a cor nao esta na paleta (registro antigo ainda nao migrado). */
export const COR_DESCONHECIDA_HEX = "#9ca3af";

const HEX_POR_NOME = new Map(FILAMENT_COLORS.map((c) => [c.nome.toLowerCase(), c.hex]));

/** Amostra da cor. Nome fora da paleta cai no cinza, nunca numa cor errada. */
export function corHex(nome?: string | null): string {
  if (!nome) return COR_DESCONHECIDA_HEX;
  return HEX_POR_NOME.get(nome.trim().toLowerCase()) ?? COR_DESCONHECIDA_HEX;
}

/** Cor + tom como um rotulo so: "Azul Cobalto", ou so "Azul" quando nao ha tom. */
export function corCompleta(cor?: string | null, tom?: string | null): string {
  const base = (cor ?? "").trim();
  const extra = (tom ?? "").trim();
  if (!base) return extra || "—";
  return extra ? `${base} ${extra}` : base;
}
