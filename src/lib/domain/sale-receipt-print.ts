/**
 * Printable sale receipt (recibo de venda) generator for Kurti 3D.
 * Generates a printer-friendly HTML document with company branding,
 * client details, itemised products, CNPJ/CPF field, and total —
 * then triggers the browser print dialog.
 *
 * Follows the same visual template as quote-print.ts and payment-receipt-print.ts.
 */

import { brl } from "../utils";

export type SaleReceiptItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type SaleReceiptInput = {
  /** Nome do cliente / razão social. */
  clientName: string;
  /** Itens vendidos (produtos/serviços). */
  items: SaleReceiptItem[];
  /** Tipo de documento: CNPJ ou CPF. */
  docType: "cnpj" | "cpf";
  /** Número do documento (CNPJ ou CPF). */
  docNumber: string;
  /** Forma de pagamento (PIX, Dinheiro, Cartão, etc.). */
  formaPagamento?: string;
  /** Data do pagamento/recebimento no formato ISO. */
  dataRecebimento?: string;
  /** Observações adicionais. */
  observacao?: string;
  /** Desconto percentual (0-100). */
  discountPercent?: number;
  /** Nome do estúdio (Kurti 3D por padrão). */
  studioNome: string;
  /** Número de WhatsApp do estúdio para contato. */
  whatsappNumero: string;
};

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDocNumber(docType: "cnpj" | "cpf", raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (docType === "cpf") {
    // 000.000.000-00
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    }
    return raw;
  }
  // CNPJ: 00.000.000/0000-00
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  return raw;
}

function generateReceiptNumber() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `REC-${datePart}-${rand}`;
}

const LOGO_SVG = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="36" height="36" rx="8" fill="#c96f4a"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="18" fill="white">K3</text>
</svg>`;

function buildSaleReceiptHtml(input: SaleReceiptInput): string {
  const receiptNumber = generateReceiptNumber();
  const issueDate = formatDate(new Date());
  const whatsappLink = `https://wa.me/${input.whatsappNumero.replace(/\D/g, "")}`;
  const studio = escapeHtml(input.studioNome);
  const client = escapeHtml(input.clientName || "__________________________");
  const docTypeLabel = input.docType === "cnpj" ? "CNPJ" : "CPF";
  const docDisplay = input.docNumber
    ? formatDocNumber(input.docType, input.docNumber)
    : "__________________________";
  const paymentDateStr = input.dataRecebimento
    ? formatDate(new Date(input.dataRecebimento + "T12:00:00"))
    : issueDate;

  const subtotal = input.items.reduce((sum, i) => sum + i.subtotal, 0);
  const discountPercent = input.discountPercent ?? 0;
  const discountValue = subtotal * (discountPercent / 100);
  const grandTotal = subtotal - discountValue;

  const itemsHtml = input.items
    .map(
      (item) => `
      <tr>
        <td class="desc">${escapeHtml(item.description)}${item.quantity > 1 ? ` <small>(x${item.quantity})</small>` : ""}</td>
        <td class="qty">${item.quantity}</td>
        <td class="price">${brl(item.unitPrice)}</td>
        <td class="price">${brl(item.subtotal)}</td>
      </tr>`,
    )
    .join("");

  const discountRows =
    discountPercent > 0
      ? `
      <tr>
        <td colspan="3" style="text-align:right;color:#888">Subtotal</td>
        <td class="price">${brl(subtotal)}</td>
      </tr>
      <tr>
        <td colspan="3" style="text-align:right;color:#2e7d32">Desconto (${discountPercent}%)</td>
        <td class="price" style="color:#2e7d32">-${brl(discountValue)}</td>
      </tr>`
      : "";

  const observationsBlock = input.observacao
    ? `<div class="observations"><strong>Observações:</strong><br>${escapeHtml(input.observacao)}</div>`
    : "";

  const paymentRow = input.formaPagamento
    ? `<div class="info-row"><span class="info-label">Forma de Pagamento</span><span class="info-value">${escapeHtml(input.formaPagamento)}</span></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Recibo ${receiptNumber} — ${studio}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a1a;
      font-size: 13px;
      line-height: 1.5;
      padding: 40px 44px;
      max-width: 800px;
      margin: 0 auto;
    }
    .top-bar {
      height: 6px;
      border-radius: 3px;
      background: linear-gradient(90deg, #c96f4a, #e0a93b, #8aab6e, #5fa8a3, #8a3a52);
      margin-bottom: 28px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
    }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header-left .logo-svg { flex-shrink: 0; }
    .header-left .brand-name {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header-right { text-align: right; }
    .receipt-number {
      font-size: 20px;
      font-weight: 700;
      color: #5fa8a3;
    }
    .receipt-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #888; }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 48px;
      margin-bottom: 28px;
      padding: 16px 20px;
      background: #fafafa;
      border-radius: 8px;
      border: 1px solid #e5e5e5;
    }
    .info-grid .info-row { display: flex; justify-content: space-between; font-size: 12px; }
    .info-grid .info-label { color: #888; }
    .info-grid .info-value { font-weight: 600; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    thead th {
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #888;
      padding: 10px 8px;
      border-bottom: 2px solid #e5e5e5;
    }
    thead th.qty, thead th.price { text-align: center; }
    thead th.price:last-child { text-align: right; }
    tbody td {
      padding: 10px 8px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 13px;
      vertical-align: top;
    }
    tbody td.desc small { color: #888; font-size: 11px; }
    tbody td.qty { text-align: center; color: #666; }
    tbody td.price { text-align: right; font-weight: 500; }
    .total-row td {
      font-weight: 700;
      font-size: 16px;
      border-top: 2px solid #1a1a1a;
      border-bottom: none;
      padding-top: 14px;
    }
    .total-row .total-label { text-align: right; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
    .total-row .price { color: #1a1a1a; }

    .footer {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 12px;
      color: #888;
    }
    .footer .contact a { color: #5fa8a3; text-decoration: none; font-weight: 600; }
    .observations {
      margin-top: 16px;
      padding: 12px 16px;
      background: #fffdf7;
      border: 1px solid #f0e8c8;
      border-radius: 6px;
      font-size: 12px;
      color: #666;
    }
    .receipt-disclaimer {
      margin-top: 20px;
      font-size: 10px;
      color: #aaa;
      text-align: center;
      line-height: 1.6;
    }
    @media print {
      body { padding: 30px 34px; }
      @page { size: A4; margin: 15mm; }
    }
    .thank-you {
      text-align: center;
      margin-top: 36px;
      font-size: 14px;
      font-weight: 600;
      color: #5fa8a3;
    }
  </style>
</head>
<body>
  <div class="top-bar"></div>

  <div class="header">
    <div class="header-left">
      <div class="logo-svg">${LOGO_SVG}</div>
      <div>
        <div class="brand-name" style="color:#c96f4a">Kurti<span style="font-weight:300;color:#555"> 3D</span></div>
        <div style="font-size:11px;color:#888">Impressão 3D de alta qualidade</div>
      </div>
    </div>
    <div class="header-right">
      <div class="receipt-label">Recibo de Venda</div>
      <div class="receipt-number">${escapeHtml(receiptNumber)}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-row"><span class="info-label">Cliente</span><span class="info-value">${client}</span></div>
    <div class="info-row"><span class="info-label">Data de emissão</span><span class="info-value">${issueDate}</span></div>
    <div class="info-row"><span class="info-label">${docTypeLabel}</span><span class="info-value" style="font-family:monospace">${escapeHtml(docDisplay)}</span></div>
    <div class="info-row"><span class="info-label">WhatsApp</span><span class="info-value"><a href="${whatsappLink}" style="color:#5fa8a3">${escapeHtml(input.whatsappNumero)}</a></span></div>
    ${paymentRow}
  </div>

  <table>
    <thead>
      <tr>
        <th>Descrição</th>
        <th class="qty">Qtd.</th>
        <th class="price">Preço unit.</th>
        <th class="price">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
      ${discountRows}
      <tr class="total-row">
        <td colspan="3" class="total-label">TOTAL</td>
        <td class="price">${brl(grandTotal)}</td>
      </tr>
    </tbody>
  </table>

  ${observationsBlock}

  <div class="receipt-disclaimer">
    Este recibo comprova a venda dos itens descritos acima.<br>
    Para dúvidas ou esclarecimentos, entre em contato pelo WhatsApp.
  </div>

  <div class="footer">
    <div>
      <div style="font-weight:600;color:#1a1a1a">${studio}</div>
      <div>${docTypeLabel}: ${escapeHtml(docDisplay)}</div>
    </div>
    <div class="contact">
      Qualquer dúvida, entre em contato:<br>
      <a href="${whatsappLink}">WhatsApp ${escapeHtml(input.whatsappNumero)}</a>
    </div>
  </div>

  <div class="thank-you">Obrigado pela preferência! — ${studio}</div>

  <script>
    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() { window.print(); }, 400);
    });
  </script>
</body>
</html>`;
}

/**
 * Opens a new browser tab with the sale receipt HTML
 * and triggers the print dialog.
 */
export function openPrintSaleReceipt(input: SaleReceiptInput) {
  const html = buildSaleReceiptHtml(input);
  const blob = new Blob([html], { type: "text/html;charset=UTF-8" });
  const url = URL.createObjectURL(blob);

  const printWindow = window.open(url, "_blank", "noopener,noreferrer");
  if (!printWindow) {
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
    return;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
