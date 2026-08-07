import { Banknote, CreditCard, Pencil } from "lucide-react";
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

export function FilamentEditDialog({ ctx, mode }: { ctx: StockCtx; mode: "active" | "archived" }) {
  const {
    editForm,
    setEditForm,
    setEditField,
    submitEdit,
    submitEditArchived,
    mutateFilamento,
    mutateCreatePayment,
    mutateUpdatePayment,
    mutateUpdateArchived,
  } = ctx;

  const archived = mode === "archived";
  const saving = archived
    ? mutateUpdateArchived.isPending
    : mutateFilamento.isPending || mutateCreatePayment.isPending || mutateUpdatePayment.isPending;

  return (
    <Dialog open={!!editForm} onOpenChange={(o) => !o && setEditForm(null)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            {archived ? "Editar Filamento Arquivado" : "Editar Filamento"}
          </DialogTitle>
        </DialogHeader>
        {editForm && (
          <form onSubmit={archived ? submitEditArchived : submitEdit} className="space-y-5">
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
              <Field label="Data da Entrega">
                <Input
                  type="date"
                  value={editForm.dataEntrega}
                  onChange={(e) => setEditField("dataEntrega", e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Qualidade">
                <Select
                  value={editForm.qualidade || "none"}
                  onValueChange={(v) =>
                    setEditField("qualidade", v === "none" ? "" : (v as FilamentoQualidadeInput))
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
              <Field label="Link do Produto (opcional)">
                <Input
                  type="url"
                  value={editForm.linkProduto}
                  onChange={(e) => setEditField("linkProduto", e.target.value)}
                  placeholder="https://www.amazon.com.br/... ou link do vendedor"
                  maxLength={500}
                />
              </Field>
              <Field label="Observação" className="md:col-span-2">
                <Textarea
                  rows={3}
                  maxLength={500}
                  value={editForm.observacao}
                  onChange={(e) => setEditField("observacao", e.target.value)}
                  placeholder="Observações sobre entrega, qualidade, fornecedor ou devolução"
                />
              </Field>
            </div>

            {/* ─── PAYMENT DETAILS (EDIT) — apenas no modo ativo (arquivado não mexe no financeiro) ─── */}
            {!archived && (
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
                  {editForm.formaPagamento === "parcelado" && (
                    <NumberField
                      label="Número de Parcelas"
                      value={editForm.parcelas}
                      onChange={(v) => setEditField("parcelas", v)}
                      placeholder="1"
                      step="1"
                    />
                  )}
                  <NumberField
                    label="Custo Total (R$)"
                    value={editForm.custoTotal}
                    onChange={(v) => setEditField("custoTotal", v)}
                    placeholder={
                      editForm.precoPago ? String(Number(editForm.precoPago).toFixed(2)) : "0,00"
                    }
                  />
                  <Field label="Data para Pagto" className="md:col-span-2">
                    <Input
                      type="date"
                      value={editForm.dataParaPagamento}
                      onChange={(e) => setEditField("dataParaPagamento", e.target.value)}
                    />
                  </Field>
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
                            <span className="ml-1">
                              · juros de {brl(juros)} sobre o preço à vista
                            </span>
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
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditForm(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-filament gap-2" disabled={saving}>
                {saving ? "Salvando…" : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
