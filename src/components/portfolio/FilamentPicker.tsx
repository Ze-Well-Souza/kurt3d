import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { corCompleta, corHex } from "@/lib/domain/filament-colors";
import { normalizeText } from "@/lib/utils/normalization";
import type { Filamento } from "@/lib/domain/types";

export type FilamentOption = Filamento & { label?: string; disponivelGrams?: number };

/**
 * Seletor de filamento com busca e amostra de cor.
 *
 * Antes era um Select comum: com 60+ rolos cadastrados, achar "o vermelho"
 * exigia rolar a lista inteira lendo SKU por SKU. Aqui da para digitar a cor,
 * a marca ou o SKU, e cada linha mostra a bolinha da cor.
 */
export function FilamentPicker({
  value,
  onChange,
  filamentos,
  className,
}: {
  value: string;
  onChange: (id: string) => void;
  filamentos: FilamentOption[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selecionado = filamentos.find((f) => f.id === value) ?? null;

  // Fecha ao clicar fora ou apertar Esc — o painel e absoluto e nao captura
  // esses eventos sozinho.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setBusca("");
  }, [open]);

  const filtrados = useMemo(() => {
    const s = normalizeText(busca);
    if (!s) return filamentos;
    return filamentos.filter(
      (f) =>
        normalizeText(f.sku).includes(s) ||
        normalizeText(f.marca).includes(s) ||
        normalizeText(f.cor).includes(s) ||
        normalizeText(f.corTom ?? "").includes(s) ||
        normalizeText(f.material).includes(s),
    );
  }, [filamentos, busca]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {selecionado ? (
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full border border-border"
              style={{ background: corHex(selecionado.cor) }}
            />
            <span className="truncate">
              [{selecionado.sku}] {selecionado.marca}{" "}
              {corCompleta(selecionado.cor, selecionado.corTom)}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">Selecione</span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md">
          <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por cor, marca ou SKU..."
              className="h-7 border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtrados.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                Nenhum filamento encontrado.
              </p>
            ) : (
              filtrados.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    onChange(f.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent",
                    f.id === value && "bg-accent/50",
                  )}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border border-border"
                    style={{ background: corHex(f.cor) }}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-mono text-xs text-muted-foreground">[{f.sku}]</span>{" "}
                    {f.marca} {corCompleta(f.cor, f.corTom)}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{f.material}</span>
                  {f.id === value && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Versao para formularios nao-controlados (o dialogo de edicao le por FormData).
 * Guarda a selecao em estado proprio e espelha num input escondido, para o
 * `fd.get("filamentoId")` continuar funcionando como funcionava com o Select.
 */
export function FilamentPickerField({
  name,
  defaultValue,
  filamentos,
}: {
  name: string;
  defaultValue: string;
  filamentos: FilamentOption[];
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <FilamentPicker value={value} onChange={setValue} filamentos={filamentos} />
    </>
  );
}
