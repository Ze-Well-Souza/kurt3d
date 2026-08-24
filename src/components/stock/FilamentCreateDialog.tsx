import { Banknote, CreditCard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, NumberField } from "@/components/admin/stock-fields";
import { brl } from "@/lib/utils";
import { MATERIALS, type FilamentoQualidadeInput, type Material } from "./stock-shared";
import type { StockCtx } from "./use-stock-page-state";

export function FilamentCreateDialog({ ctx }: { ctx: StockCtx }) {
  const { createFilamentOpen, setCreateFilamentOpen, fForm, setFField, submitFilamento } = ctx;

  return (
    <Dialog open={createFilamentOpen} onOpenChange={setCreateFilamentOpen}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Rolo</DialogTitle>
        </DialogHeader>
        <form onSubmit={submitFilamento} className="space-y-6">
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
            <Field label="Data da Entrega">
              <Input
                type="date"
                value={fForm.dataEntrega}
                onChange={(e) => setFField("dataEntrega", e.target.value)}
              />
            </Field>
            <NumberField
              label="Quantidade (rolos)"
              value={fForm.quantidade}
              onChange={(v) => setFField("quantidade", v)}
              placeholder="1"
              step="1"
            />

            <Field label="Qualidade">
              <Select
                value={fForm.qualidade || "none"}
                onValueChange={(v) =>
                  setFField("qualidade", v === "none" ? "" : (v as FilamentoQualidadeInput))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar qualidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem avaliação</SelectItem>
                  <SelectItem value="Ótimo">Ótimo</SelectItem>
                  <SelectItem value="bom">Bom</SelectItem>
                  <SelectItem value="médio">Médio</SelectItem>
                  <SelectItem value="ruim">Ruim</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Onde Comprou (opcional)" className="md:col-span-2">
              <Input
                value={fForm.ondeComprou}
                onChange={(e) => setFField("ondeComprou", e.target.value)}
                placeholder="Shopee, Mercado Livre, Amazon, TikTok Shop, loja física..."
                maxLength={120}
              />
            </Field>
            <Field label="Link do Produto (opcional)" className="md:col-span-2">
              <Input
                type="url"
                value={fForm.linkProduto}
                onChange={(e) => setFField("linkProduto", e.target.value)}
                placeholder="https://www.amazon.com.br/... ou link do vendedor"
                maxLength={500}
              />
            </Field>
            <Field label="Observação" className="md:col-span-2 lg:col-span-4">
              <Textarea
                rows={3}
                maxLength={500}
                value={fForm.observacao}
                onChange={(e) => setFField("observacao", e.target.value)}
                placeholder="Observações sobre entrega, qualidade, fornecedor ou devolução"
              />
            </Field>
          </div>

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
              {fForm.formaPagamento === "parcelado" && (
                <NumberField
                  label="Número de Parcelas"
                  value={fForm.parcelas}
                  onChange={(v) => setFField("parcelas", v)}
                  placeholder="1"
                  step="1"
                />
              )}
              <NumberField
                label="Custo Total (R$)"
                value={fForm.custoTotal}
                onChange={(v) => setFField("custoTotal", v)}
                placeholder={
                  fForm.precoPago
                    ? String(
                        (
                          Number(fForm.precoPago) * Math.max(1, Number(fForm.quantidade) || 1)
                        ).toFixed(2),
                      )
                    : "0,00"
                }
              />
              <Field label="Data para Pagto" className="md:col-span-2">
                <Input
                  type="date"
                  value={fForm.dataParaPagamento}
                  onChange={(e) => setFField("dataParaPagamento", e.target.value)}
                />
              </Field>
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
                      Pagamento à vista:{" "}
                      <span className="font-semibold tabular-nums">{brl(custoTotal)}</span>
                      {qty > 1 && <span> para {qty} rolos</span>}
                    </>
                  )}
                </p>
              );
            })()}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateFilamentOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="lg" className="btn-filament gap-2 px-6">
              <Plus className="h-4 w-4" /> Adicionar Rolo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
