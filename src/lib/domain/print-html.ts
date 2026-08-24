/**
 * Helpers compartilhados pelos geradores de HTML de impressao: orcamento
 * (quote-print), recibo de pagamento (payment-receipt-print) e recibo de
 * venda (sale-receipt-print).
 *
 * Os tres modulos mantinham copias proprias de `escapeHtml` e `formatDate` —
 * identicas — e tres geradores de numero de documento quase iguais. O de
 * recibo de venda sorteava 4 digitos (10 mil combinacoes) enquanto os outros
 * dois sorteavam 4 caracteres alfanumericos (1,6 milhao), entao o formato do
 * numero mudava conforme o documento impresso. Aqui vale a versao
 * alfanumerica para os tres.
 */

/**
 * Escapa texto vindo do usuario antes de interpolar no HTML de impressao.
 * Sem isto um nome de cliente com `<script>` viraria markup executavel na
 * janela de impressao.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Data no formato dd/mm/aaaa. */
export function formatPrintDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Numero de documento no formato PREFIXO-AAAAMMDD-XXXX. Usado apenas como
 * fallback: quando o documento ja foi salvo no banco, o numero persistido
 * tem prioridade.
 */
export function generateDocumentNumber(prefix: string): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${datePart}-${random}`;
}
