import type { ReactNode } from "react";
import { Banknote, CalendarClock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NumberField } from "@/components/admin/stock-fields";
import type { FormaPagamento } from "@/lib/domain/types";

/**
 * Bloco "Detalhes do Pagamento" compartilhado por filamentos e insumos.
 *
 * Antes existiam quatro copias divergentes do mesmo bloco (criar rolo, editar
 * rolo, criar insumo, editar insumo). Elas discordavam em espacamento, icone,
 * peso do titulo, layout dos botoes de forma de pagamento e no placeholder de
 * parcelas. Esta versao unica adota o visual do cadastro de insumo.
 *
 * `extraField` e `summary` existem por uma particularidade real do filamento:
 * `precoPago` e por rolo, e a compra pode ter varios rolos e juros — por isso o
 * rolo precisa de um campo "Custo Total" proprio e de um resumo das parcelas.
 * O insumo ja registra o valor cheio em "Preco Total Pago", entao nao usa esses
 * slots. Fora isso o bloco e identico nos dois cadastros.
 */
export function PaymentDetailsSection({
  formaPagamento,
  parcelas,
  dataParaPagamento,
  onFormaPagamento,
  onParcelas,
  onDataParaPagamento,
  extraField,
  summary,
}: {
  formaPagamento: FormaPagamento;
  parcelas: string;
  dataParaPagamento: string;
  onFormaPagamento: (value: FormaPagamento) => void;
  onParcelas: (value: string) => void;
  onDataParaPagamento: (value: string) => void;
  extraField?: ReactNode;
  summary?: ReactNode;
}) {
  const parcelado = formaPagamento === "parcelado";

  // "Forma de Pagamento" ocupa 2 das 4 colunas; parcelas e o campo extra ocupam
  // 1 cada. A data para pagamento fica com o que sobrar da linha — ou com uma
  // linha inteira quando os anteriores ja fecharam o grid.
  const usedCols = 2 + (parcelado ? 1 : 0) + (extraField ? 1 : 0);
  const dataClassName =
    usedCols >= 4 ? "md:col-span-2 lg:col-span-4" : usedCols === 3 ? "" : "lg:col-span-2";

  return (
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
              variant={formaPagamento === "a_vista" ? "default" : "outline"}
              className="justify-center"
              onClick={() => onFormaPagamento("a_vista")}
            >
              <Banknote className="mr-2 h-4 w-4" /> À vista
            </Button>
            <Button
              type="button"
              variant={parcelado ? "default" : "outline"}
              className="justify-center"
              onClick={() => onFormaPagamento("parcelado")}
            >
              <CreditCard className="mr-2 h-4 w-4" /> Parcelado
            </Button>
          </div>
        </Field>
        {parcelado && (
          <NumberField
            label="Número de Parcelas"
            value={parcelas}
            onChange={onParcelas}
            placeholder="12"
            step="1"
          />
        )}
        {extraField}
        <Field label="Data para Pagto" className={dataClassName}>
          <Input
            type="date"
            value={dataParaPagamento}
            onChange={(e) => onDataParaPagamento(e.target.value)}
          />
        </Field>
      </div>
      {summary}
    </div>
  );
}
