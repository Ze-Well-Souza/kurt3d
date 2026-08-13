function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateToIsoLocal(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseIsoDateLocal(dateIso: string): Date {
  const [year, month, day] = dateIso.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function formatIsoDatePtBr(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseIsoDateLocal(value).toLocaleDateString("pt-BR");
  }

  return new Date(value).toLocaleDateString("pt-BR");
}

export function todayIso(date = new Date()): string {
  return formatDateToIsoLocal(date);
}

export function addCalendarMonthsIso(dateIso: string, months: number): string {
  const date = parseIsoDateLocal(dateIso);
  const originalDay = date.getDate();

  date.setDate(1);
  date.setMonth(date.getMonth() + months);

  const lastDayOfTargetMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(originalDay, lastDayOfTargetMonth));

  return formatDateToIsoLocal(date);
}

// ═══════════════════════════════════════════════════════════════════════════
// Distribuição de uma quitação de lote entre as parcelas em aberto (P0-2)
// ═══════════════════════════════════════════════════════════════════════════

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getPaidAmount(installment: { valor: number; valorPago: number | null }): number {
  return Math.min(roundMoney(installment.valorPago ?? 0), installment.valor);
}

export function getRemainingAmount(installment: {
  valor: number;
  valorPago: number | null;
}): number {
  return Math.max(roundMoney(installment.valor - getPaidAmount(installment)), 0);
}

export type SettlementAllocation<T> = {
  installment: T;
  /** Quanto este pagamento acrescenta à parcela (sempre > 0). */
  amountToAdd: number;
  /** Total pago na parcela depois deste lançamento. */
  valorPago: number;
  /** A parcela fica quitada com este lançamento? */
  pago: boolean;
};

/**
 * Distribui `budget` entre as parcelas em aberto, da primeira para a última,
 * quitando cada uma por completo antes de passar para a seguinte.
 *
 * A versão anterior desta lógica vivia duplicada dentro de `settlePayment` e
 * `settleInsumoPayment` e nunca descontava o saldo distribuído: pagava toda
 * parcela integralmente e jogava `budget - distribuído` na última, o que dava
 * um `valorPago` NEGATIVO em qualquer quitação parcial. Com 3 parcelas de
 * R$ 100 e R$ 150 informados, gravava 100 / 100 / -50 e registrava R$ 200 de
 * eventos para R$ 150 recebidos.
 *
 * Parcelas que não couberem no orçamento simplesmente não entram no resultado
 * — nunca são tocadas.
 */
export function allocateSettlement<T extends { valor: number; valorPago: number | null }>(
  pending: T[],
  budget: number,
): SettlementAllocation<T>[] {
  const allocations: SettlementAllocation<T>[] = [];
  let left = roundMoney(budget);

  for (const installment of pending) {
    if (left <= 0) break;
    const remaining = getRemainingAmount(installment);
    if (remaining <= 0) continue;

    const amountToAdd = roundMoney(Math.min(remaining, left));
    if (amountToAdd <= 0) break;

    const valorPago = roundMoney(getPaidAmount(installment) + amountToAdd);
    allocations.push({
      installment,
      amountToAdd,
      valorPago,
      // Tolerância de meio centavo: evita que ruído de ponto flutuante deixe
      // uma parcela integralmente paga marcada como pendente.
      pago: valorPago >= roundMoney(installment.valor) - 0.005,
    });
    left = roundMoney(left - amountToAdd);
  }

  return allocations;
}
