import { corHex } from "@/lib/domain/filament-colors";
import { cn } from "@/lib/utils";

export type CorCount = { cor: string; qtd: number; investido: number };

/**
 * Contagem de rolos por cor, clicavel para filtrar.
 *
 * Antes a cor so aparecia como uma linha na tabela e num select "Todas as
 * cores": para saber quantos rolos pretos havia era preciso filtrar e contar na
 * mao. Como a cor agora sai de uma paleta fechada, da para somar por cor.
 *
 * As contagens respeitam os demais filtros ativos (busca, marca, material), so
 * nao a propria cor — senao clicar num chip zeraria todos os outros.
 */
export function ColorFilterBar({
  counts,
  active,
  onChange,
  total,
}: {
  counts: CorCount[];
  active: string;
  onChange: (cor: string) => void;
  total: number;
}) {
  if (counts.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={cn(
          "rounded-full border px-2.5 py-1 text-xs transition-colors",
          active === "all"
            ? "border-foreground/30 bg-foreground/10 font-medium text-foreground"
            : "border-border text-muted-foreground hover:bg-muted",
        )}
      >
        Todas <span className="tabular-nums">{total}</span>
      </button>
      {counts.map(({ cor, qtd, investido }) => {
        const selecionada = active === cor;
        return (
          <button
            key={cor}
            type="button"
            onClick={() => onChange(selecionada ? "all" : cor)}
            title={`${cor}: ${qtd} rolo(s) · R$ ${investido.toFixed(2).replace(".", ",")} investido`}
            aria-pressed={selecionada}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
              selecionada
                ? "border-foreground/30 bg-foreground/10 font-medium text-foreground"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full border border-border"
              style={{ background: corHex(cor) }}
            />
            {cor}
            <span className="tabular-nums">{qtd}</span>
          </button>
        );
      })}
    </div>
  );
}
