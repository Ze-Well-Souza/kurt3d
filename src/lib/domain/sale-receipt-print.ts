/**
 * Printable sale receipt (recibo de venda) generator for Kurti 3D.
 * Generates a printer-friendly HTML document with company branding,
 * client details, itemised products, CNPJ/CPF field, and total —
 * then triggers the browser print dialog.
 *
 * Follows the same visual template as quote-print.ts and payment-receipt-print.ts.
 */

import { brl, formatPhoneDisplay } from "../utils";

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
  /** Tipo de documento do CLIENTE: CNPJ ou CPF. */
  docType: "cnpj" | "cpf";
  /** Número do documento do CLIENTE (CNPJ ou CPF). */
  docNumber: string;
  /** Tipo de documento da KURT3D (vendedor): CNPJ ou CPF. */
  studioDocType: "cnpj" | "cpf";
  /** Número do documento da KURT3D (CNPJ ou CPF). */
  studioDocNumber: string;
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
  /** Telefone do cliente (para envio via WhatsApp). */
  clientPhone?: string | null;
  /** URL do Instagram (opcional, padrão @kurti3d). */
  instagramUrl?: string;
  /** Se true, exibe carimbo "PAGO" com assinatura Kurti3D no recibo. */
  paid?: boolean;
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

/** Kurti 3D thumbs-up logo as inline SVG (print-safe). */
const LOGO_SVG = `
<svg viewBox="0 0 56 56" width="48" height="48" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="kfill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#c96f4a"/>
      <stop offset="30%" stop-color="#e0a93b"/>
      <stop offset="55%" stop-color="#8aab6e"/>
      <stop offset="80%" stop-color="#5fa8a3"/>
      <stop offset="100%" stop-color="#8a3a52"/>
    </linearGradient>
  </defs>
  <path d="M14 28 L14 46 L20 46 L20 28 Z M22 28 L22 46 Q22 48 24 48 L36 48 Q39 48 40 45 L43 33 Q43.5 30 40.5 30 L32 30 L33 22 Q33.5 18 30 17 Q27 16 26 19 L22 28 Z" fill="url(#kfill)"/>
</svg>`;

function buildSaleReceiptHtml(input: SaleReceiptInput): string {
  const receiptNumber = generateReceiptNumber();
  const issueDate = formatDate(new Date());
  const whatsappLink = `https://wa.me/${input.whatsappNumero.replace(/\D/g, "")}`;
  const phoneDisplay = formatPhoneDisplay(input.whatsappNumero);
  const instagramUrl = input.instagramUrl || "https://instagram.com/kurti3d";
  const studio = escapeHtml(input.studioNome);
  const client = escapeHtml(input.clientName || "__________________________");
  const docTypeLabel = input.docType === "cnpj" ? "CNPJ" : "CPF";
  const docDisplay = input.docNumber
    ? formatDocNumber(input.docType, input.docNumber)
    : "__________________________";
  const studioDocTypeLabel = input.studioDocType === "cnpj" ? "CNPJ" : "CPF";
  const studioDocDisplay = input.studioDocNumber
    ? formatDocNumber(input.studioDocType, input.studioDocNumber)
    : "__________________________";
  const paymentDateStr = input.dataRecebimento
    ? formatDate(new Date(input.dataRecebimento + "T12:00:00"))
    : issueDate;

  const subtotal = input.items.reduce((sum, i) => sum + i.subtotal, 0);
  const discountPercent = input.discountPercent ?? 0;
  const discountValue = subtotal * (discountPercent / 100);
  const grandTotal = subtotal - discountValue;

  const productSummary = input.items
    .slice(0, 2)
    .map((i) => i.description)
    .join(", ")
    + (input.items.length > 2 ? " + mais" : "");

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

  const paidStamp = input.paid
    ? `
  <div class="paid-stamp">
    <div class="paid-stamp-inner">
      <div class="paid-badge">PAGO</div>
      <div class="paid-signature">
        <div class="paid-logo">${LOGO_SVG}</div>
        <span>Kurti<span style="font-weight:300;color:#555">3D</span></span>
      </div>
      <div class="paid-date">${issueDate}</div>
    </div>
  </div>`
    : "";

  const paymentRow = input.formaPagamento
    ? `<div class="info-row"><span class="info-label">Forma de Pagamento</span><span class="info-value">${escapeHtml(input.formaPagamento)}</span></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Recibo - ${escapeHtml(productSummary)} - ${client} — Kurti 3D</title>
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
    .paid-stamp {
      display: flex;
      justify-content: center;
      margin: 28px 0 16px;
    }
    .paid-stamp-inner {
      border: 3px solid #2e7d32;
      border-radius: 12px;
      padding: 18px 36px;
      text-align: center;
      background: #f0faf2;
      transform: rotate(-3deg);
    }
    .paid-badge {
      font-size: 28px;
      font-weight: 900;
      color: #2e7d32;
      letter-spacing: 6px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .paid-signature {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      color: #1a1a1a;
    }
    .paid-logo {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
    }
    .paid-logo svg {
      width: 28px;
      height: 28px;
    }
    .paid-date {
      margin-top: 6px;
      font-size: 11px;
      color: #666;
    }
    @media print {
      body { padding: 30px 34px; }
      @page { size: A4; margin: 15mm; }
      .paid-stamp-inner {
        border-color: #555 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
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
    <div class="info-row"><span class="info-label">${docTypeLabel} (Comprador)</span><span class="info-value" style="font-family:monospace">${escapeHtml(docDisplay)}</span></div>
    <div class="info-row"><span class="info-label">${studioDocTypeLabel} Kurti 3D</span><span class="info-value" style="font-family:monospace">${escapeHtml(studioDocDisplay)}</span></div>
    <div class="info-row"><span class="info-label">WhatsApp</span><span class="info-value"><a href="${whatsappLink}" style="color:#5fa8a3">${escapeHtml(phoneDisplay)}</a></span></div>
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

  ${paidStamp}

  <div class="receipt-disclaimer">
    Este recibo comprova a venda dos itens descritos acima.<br>
    Para dúvidas ou esclarecimentos, entre em contato pelo WhatsApp.
  </div>

  <div class="footer">
    <div>
      <div style="font-weight:600;color:#1a1a1a">${studio}</div>
      <div>${studioDocTypeLabel}: ${escapeHtml(studioDocDisplay)}</div>
    </div>
    <div class="contact">
      Qualquer dúvida, entre em contato:<br>
      <a href="${whatsappLink}">WhatsApp ${escapeHtml(phoneDisplay)}</a><br>
      <a href="${escapeHtml(instagramUrl)}" style="color:#e0a93b">Instagram @kurti3d</a>
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

/**
 * Builds a plain-text receipt summary suitable for sending via WhatsApp.
 */
export function buildSaleReceiptWhatsAppMessage(input: SaleReceiptInput): string {
  const subtotal = input.items.reduce((sum, i) => sum + i.subtotal, 0);
  const discountPercent = input.discountPercent ?? 0;
  const discountValue = subtotal * (discountPercent / 100);
  const total = subtotal - discountValue;
  const issueDate = formatDate(new Date());
  const docTypeLabel = input.docType === "cnpj" ? "CNPJ" : "CPF";
  const docDisplay = input.docNumber
    ? formatDocNumber(input.docType, input.docNumber)
    : "";
  const studioDocTypeLabel = input.studioDocType === "cnpj" ? "CNPJ" : "CPF";
  const studioDocDisplay = input.studioDocNumber
    ? formatDocNumber(input.studioDocType, input.studioDocNumber)
    : "";

  const lines: string[] = [];
  lines.push(`*Recibo de Venda — ${input.studioNome}*`);
  if (input.clientName.trim()) lines.push(`Cliente: ${input.clientName.trim()}`);
  if (docDisplay) lines.push(`${docTypeLabel}: ${docDisplay}`);
  lines.push(`Data: ${issueDate}`);
  if (input.formaPagamento) lines.push(`Pagamento: ${input.formaPagamento}`);
  lines.push("");
  for (const item of input.items) {
    const qty = item.quantity > 1 ? ` x${item.quantity}` : "";
    lines.push(`• ${item.description}${qty} — ${brl(item.subtotal)}`);
  }
  if (discountPercent > 0) {
    lines.push("");
    lines.push(`Subtotal: ${brl(subtotal)}`);
    lines.push(`Desconto: ${discountPercent}% (-${brl(discountValue)})`);
  }
  lines.push("");
  lines.push(`*Total: ${brl(total)}*`);
  if (input.observacao?.trim()) {
    lines.push("");
    lines.push(`Obs.: ${input.observacao.trim()}`);
  }
  lines.push("");
  lines.push(`${input.studioNome}`);
  if (studioDocDisplay) lines.push(`${studioDocTypeLabel}: ${studioDocDisplay}`);
  lines.push(`WhatsApp: ${formatPhoneDisplay(input.whatsappNumero)}`);
  return lines.join("\n");
}

/**
 * Opens WhatsApp with the receipt message pre-filled.
 * If the client's phone is provided, opens the chat directly.
 */
export function openSaleReceiptWhatsApp(input: SaleReceiptInput) {
  const message = buildSaleReceiptWhatsAppMessage(input);
  const digits = (input.clientPhone ?? "").replace(/\D/g, "");
  const base = digits
    ? `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`
    : "https://wa.me/";
  window.open(`${base}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}
