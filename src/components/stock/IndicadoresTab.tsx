import { useMemo } from "react";
import { Package, ShoppingBag, Sparkles, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { brl } from "@/lib/utils";
import { corHex } from "@/lib/domain/filament-colors";
import {
  QUALIDADE_MAXIMA,
  indicadoresPorCor,
  indicadoresPorMarca,
  indicadoresPorMaterial,
  indicadoresPorOrigem,
  resumoEstoque,
  type FilamentoIndicavel,
} from "@/lib/domain/stock-indicators";
import type { StockCtx } from "./use-stock-page-state";

/** R$ por grama com 3 casas — a 2 casas quase todo filamento vira "R$ 0,08". */
function porGrama(valor: number) {
  return `R$ ${valor.toFixed(3).replace(".", ",")}/g`;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** Barra proporcional ao maior valor da lista, para comparar de relance. */
function Barra({ fracao, cor }: { fracao: number; cor?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.max(2, fracao * 100)}%`,
          background: cor ?? "var(--filament-cyan)",
        }}
      />
    </div>
  );
}

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h3 className="font-display font-semibold">{titulo}</h3>
        <p className="text-xs text-muted-foreground">{descricao}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/**
 * Indicadores do estoque de filamento.
 *
 * Le rolos ativos + arquivados: o historico e justamente onde estao os rolos
 * ja consumidos e avaliados, entao ficar so nos ativos esconderia o que a
 * marca rendeu na pratica.
 */
export function IndicadoresTab({ ctx }: { ctx: StockCtx }) {
  const { filamentos, filamentosHistory } = ctx;

  const base = useMemo<FilamentoIndicavel[]>(
    () => [...filamentos, ...filamentosHistory],
    [filamentos, filamentosHistory],
  );

  const resumo = useMemo(() => resumoEstoque(base), [base]);
  const cores = useMemo(() => indicadoresPorCor(base), [base]);
  const marcas = useMemo(() => indicadoresPorMarca(base), [base]);
  const materiais = useMemo(() => indicadoresPorMaterial(base), [base]);
  const origens = useMemo(() => indicadoresPorOrigem(base), [base]);

  if (base.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-16 text-center text-sm text-muted-foreground">
        Cadastre filamentos para ver os indicadores.
      </div>
    );
  }

  const maxRolosCor = Math.max(...cores.map((c) => c.rolos));
  const maxInvestidoMarca = Math.max(...marcas.map((m) => m.investido));
  const maxOrigem = origens.length > 0 ? Math.max(...origens.map((o) => o.investido)) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Package}
          label="Rolos na base"
          value={String(resumo.rolos)}
          hint={`${filamentos.length} ativos · ${filamentosHistory.length} arquivados`}
        />
        <KpiCard
          icon={ShoppingBag}
          label="Custo médio por rolo"
          value={brl(resumo.custoMedioPorRolo)}
          hint={`${brl(resumo.investido)} investidos no total`}
        />
        <KpiCard
          icon={TrendingDown}
          label="Preço médio do grama"
          value={porGrama(resumo.custoPorGrama)}
          hint="Ponderado pelo peso de cada rolo"
        />
        <KpiCard
          icon={Sparkles}
          label="Material consumido"
          value={`${(resumo.gramasConsumidas / 1000).toFixed(2)} kg`}
          hint={`${brl(resumo.valorConsumido)} já viraram peça`}
        />
      </div>

      <Secao
        titulo="Cores mais usadas"
        descricao="Quantos rolos de cada cor, quanto custou e quanto já foi consumido."
      >
        <div className="space-y-3">
          {cores.map((c) => (
            <div key={c.cor} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <span
                className="h-4 w-4 shrink-0 rounded-full border border-border"
                style={{ background: corHex(c.cor) }}
              />
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{c.cor}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {porGrama(c.custoPorGrama)} · {brl(c.investido)}
                  </span>
                </div>
                <div className="mt-1">
                  <Barra fracao={c.rolos / maxRolosCor} cor={corHex(c.cor)} />
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {(c.gramasConsumidas / 1000).toFixed(2)} kg consumidos de{" "}
                  {(c.gramasIniciais / 1000).toFixed(2)} kg
                </div>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{c.rolos}</span>
            </div>
          ))}
        </div>
      </Secao>

      <Secao
        titulo="Marcas"
        descricao="Preço do grama e qualidade média das que você avaliou ao arquivar o rolo."
      >
        <div className="space-y-3">
          {marcas.map((m) => (
            <div key={m.marca} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{m.marca}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {porGrama(m.custoPorGrama)} · {brl(m.investido)}
                  </span>
                </div>
                <div className="mt-1">
                  <Barra fracao={m.investido / maxInvestidoMarca} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{m.rolos} rolo(s)</span>
                  {m.qualidadeMedia === null ? (
                    <Badge variant="outline" className="text-[10px]">
                      sem avaliação
                    </Badge>
                  ) : (
                    <>
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        style={{
                          borderColor:
                            m.qualidadeMedia >= 3
                              ? "var(--filament-green)"
                              : m.qualidadeMedia >= 2
                                ? "var(--filament-yellow)"
                                : "var(--filament-magenta)",
                        }}
                      >
                        qualidade {m.qualidadeMedia.toFixed(1)}/{QUALIDADE_MAXIMA}
                      </Badge>
                      <span>
                        {m.avaliados} avaliado(s)
                        {m.ruins > 0 && ` · ${m.ruins} ruim(ns)`}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{m.rolos}</span>
            </div>
          ))}
        </div>
      </Secao>

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Materiais" descricao="Distribuição da base por tipo de filamento.">
          <div className="space-y-2">
            {materiais.map((m) => (
              <div key={m.chave} className="flex items-center justify-between gap-3 text-sm">
                <Badge variant="secondary" className="text-[10px]">
                  {m.chave}
                </Badge>
                <span className="flex-1 text-xs text-muted-foreground">
                  {porGrama(m.custoPorGrama)}
                </span>
                <span className="text-xs text-muted-foreground">{brl(m.investido)}</span>
                <span className="w-8 text-right font-semibold tabular-nums">{m.rolos}</span>
              </div>
            ))}
          </div>
        </Secao>

        <Secao
          titulo="Onde comprou"
          descricao="Quanto foi gasto em cada loja, entre os rolos com origem preenchida."
        >
          {origens.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Nenhum rolo com a loja preenchida ainda. Preencha "Onde Comprou" no cadastro para ver
              este indicador.
            </p>
          ) : (
            <div className="space-y-3">
              {origens.map((o) => (
                <div key={o.chave}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{o.chave}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {brl(o.investido)} · {o.rolos} rolo(s)
                    </span>
                  </div>
                  <div className="mt-1">
                    <Barra fracao={maxOrigem > 0 ? o.investido / maxOrigem : 0} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Secao>
      </div>
    </div>
  );
}
