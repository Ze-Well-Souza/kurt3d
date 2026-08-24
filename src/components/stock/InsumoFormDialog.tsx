import { Banknote, CalendarClock, CreditCard, Plus } from "lucide-react";
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
import { Field, NumberField } from "@/components/admin/stock-fields";
import type { InsumoClassificacaoFinanceira } from "@/lib/domain/types";
import type { StockCtx } from "./use-stock-page-state";

/**
 * Diálogo único de insumo: cria (quando `createInsumoOpen`) ou edita
 * (quando `editInsumo` está preenchido).
 */
export function InsumoFormDialog({ ctx }: { ctx: StockCtx }) {
  const {
    createInsumoOpen,
    setCreateInsumoOpen,
    editInsumo,
    setEditInsumo,
    setEditInsumoField,
    iForm,
    setIField,
    submitInsumo,
    submitEditInsumo,
    mutateUpdateInsumo,
  } = ctx;

  const open = createInsumoOpen || !!editInsumo;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setCreateInsumoOpen(false);
          setEditInsumo(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editInsumo ? "Editar Insumo" : "Cadastrar Insumo"}</DialogTitle>
        </DialogHeader>

        {editInsumo ? (
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
              <Field label="Classificação Financeira">
                <Select
                  value={editInsumo.classificacaoFinanceira}
                  onValueChange={(value) =>
                    setEditInsumoField(
                      "classificacaoFinanceira",
                      value as InsumoClassificacaoFinanceira,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operacional">Despesa operacional</SelectItem>
                    <SelectItem value="investimento">Investimento / Imobilizado</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Onde Comprou (opcional)" className="md:col-span-2">
                <Input
                  value={editInsumo.ondeComprou}
                  onChange={(e) => setEditInsumoField("ondeComprou", e.target.value)}
                  placeholder="Shopee, Mercado Livre, Amazon, TikTok Shop, loja física..."
                  maxLength={120}
                />
              </Field>
              <Field label="Link do Produto (opcional)" className="md:col-span-2">
                <Input
                  type="url"
                  value={editInsumo.linkProduto}
                  onChange={(e) => setEditInsumoField("linkProduto", e.target.value)}
                  maxLength={500}
                />
              </Field>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="mb-4 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">Detalhes do Pagamento</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Field label="Forma de Pagamento" className="md:col-span-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={editInsumo.formaPagamento === "a_vista" ? "default" : "outline"}
                      className="justify-center"
                      onClick={() => setEditInsumoField("formaPagamento", "a_vista")}
                    >
                      <Banknote className="mr-2 h-4 w-4" /> À vista
                    </Button>
                    <Button
                      type="button"
                      variant={editInsumo.formaPagamento === "parcelado" ? "default" : "outline"}
                      className="justify-center"
                      onClick={() => setEditInsumoField("formaPagamento", "parcelado")}
                    >
                      <CreditCard className="mr-2 h-4 w-4" /> Parcelado
                    </Button>
                  </div>
                </Field>
                {editInsumo.formaPagamento === "parcelado" && (
                  <NumberField
                    label="Número de Parcelas"
                    value={editInsumo.parcelas}
                    onChange={(value) => setEditInsumoField("parcelas", value)}
                    placeholder="12"
                    step="1"
                  />
                )}
                <Field
                  label="Data para Pagto"
                  className={editInsumo.formaPagamento === "parcelado" ? "" : "lg:col-span-2"}
                >
                  <Input
                    type="date"
                    value={editInsumo.dataParaPagamento}
                    onChange={(e) => setEditInsumoField("dataParaPagamento", e.target.value)}
                  />
                </Field>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditInsumo(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="btn-filament"
                disabled={mutateUpdateInsumo.isPending}
              >
                Salvar alterações
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form className="space-y-5 py-2" onSubmit={submitInsumo}>
            <div className="grid gap-5 md:grid-cols-2">
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
              <Field label="Classificação Financeira">
                <Select
                  value={iForm.classificacaoFinanceira}
                  onValueChange={(value) =>
                    setIField("classificacaoFinanceira", value as InsumoClassificacaoFinanceira)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operacional">Despesa operacional</SelectItem>
                    <SelectItem value="investimento">Investimento / Imobilizado</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Onde Comprou (opcional)" className="md:col-span-2">
                <Input
                  value={iForm.ondeComprou}
                  onChange={(e) => setIField("ondeComprou", e.target.value)}
                  placeholder="Shopee, Mercado Livre, Amazon, TikTok Shop, loja física..."
                  maxLength={120}
                />
              </Field>
              <Field label="Link do Produto (opcional)" className="md:col-span-2">
                <Input
                  type="url"
                  value={iForm.linkProduto}
                  onChange={(e) => setIField("linkProduto", e.target.value)}
                  placeholder="https://www.amazon.com.br/... ou link do vendedor"
                  maxLength={500}
                />
              </Field>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="mb-4 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">Detalhes do Pagamento</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Field label="Forma de Pagamento" className="md:col-span-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={iForm.formaPagamento === "a_vista" ? "default" : "outline"}
                      className="justify-center"
                      onClick={() => setIField("formaPagamento", "a_vista")}
                    >
                      <Banknote className="mr-2 h-4 w-4" /> À vista
                    </Button>
                    <Button
                      type="button"
                      variant={iForm.formaPagamento === "parcelado" ? "default" : "outline"}
                      className="justify-center"
                      onClick={() => setIField("formaPagamento", "parcelado")}
                    >
                      <CreditCard className="mr-2 h-4 w-4" /> Parcelado
                    </Button>
                  </div>
                </Field>
                {iForm.formaPagamento === "parcelado" && (
                  <NumberField
                    label="Número de Parcelas"
                    value={iForm.parcelas}
                    onChange={(v) => setIField("parcelas", v)}
                    placeholder="12"
                    step="1"
                  />
                )}
                <Field
                  label="Data para Pagto"
                  className={iForm.formaPagamento === "parcelado" ? "" : "lg:col-span-2"}
                >
                  <Input
                    type="date"
                    value={iForm.dataParaPagamento}
                    onChange={(e) => setIField("dataParaPagamento", e.target.value)}
                  />
                </Field>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateInsumoOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-filament gap-2">
                <Plus className="h-4 w-4" /> Adicionar Insumo
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
