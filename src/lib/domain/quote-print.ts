/**
 * Printable quote (orçamento) generator for Kurti 3D.
 * Generates a printer-friendly HTML document with the company branding,
 * client details, and itemised pricing — then triggers the browser print dialog.
 */

import { brl } from "../utils";

export type QuoteItem = {
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  total: number;
  timeMinutes: number;
  gramsPerUnit: number;
};

export type QuoteInput = {
  clientName: string;
  items: QuoteItem[];
  validityDays?: number;
  observations?: string;
  studioNome: string;
  whatsappNumero: string;
};

export function getWhatsAppLink(numero: string) {
  const digits = numero.replace(/\D/g, "");
  // Assume +55 if no country code
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}`;
}

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

function generateQuoteNumber() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORC-${datePart}-${random}`;
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

const WORDMARK_SVG = `
<svg viewBox="0 0 180 28" width="180" height="28" xmlns="http://www.w3.org/2000/svg">
  <text x="0" y="22" font-family="system-ui,sans-serif" font-weight="800" font-size="24" fill="#c96f4a" letter-spacing="-0.5">Kurti</text>
  <text x="72" y="22" font-family="system-ui,sans-serif" font-weight="300" font-size="24" fill="#555" letter-spacing="2">3D</text>
</svg>`;

export function buildQuoteHtml(input: QuoteInput): string {
  const quoteNumber = generateQuoteNumber();
  const issueDate = formatDate(new Date());
  const validUntil = new Date(Date.now() + (input.validityDays ?? 7) * 86_400_000);
  const validityStr = formatDate(validUntil);
  const whatsappLink = getWhatsAppLink(input.whatsappNumero);
  const studio = escapeHtml(input.studioNome);
  const client = escapeHtml(input.clientName || "__________________________");

  const itemsHtml = input.items
    .map((item) => {
      const totalTime = item.timeMinutes * item.quantity;
      const hours = Math.floor(totalTime / 60);
      const mins = totalTime % 60;
      const timeStr = hours > 0 ? `${hours}h ${mins.toString().padStart(2, "0")}m` : `${mins}m`;
      return `
      <tr>
        <td class="desc">${escapeHtml(item.name)}<br><small>${escapeHtml(item.category)}${item.gramsPerUnit > 0 ? ` · ${item.gramsPerUnit.toFixed(1)}g/un.` : ""}</small></td>
        <td class="qty">${item.quantity}</td>
        <td class="time">${timeStr}</td>
        <td class="price">${brl(item.unitPrice)}</td>
        <td class="price">${brl(item.total)}</td>
      </tr>`;
    })
    .join("");

  const grandTotal = input.items.reduce((sum, i) => sum + i.total, 0);

  const observationsBlock = input.observations
    ? `<div class="observations"><strong>Observações:</strong><br>${escapeHtml(input.observations)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Orçamento ${quoteNumber} — ${studio}</title>
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
    .quote-number {
      font-size: 20px;
      font-weight: 700;
      color: #c96f4a;
    }
    .quote-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #888; }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px 48px;
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
    th {
      text-align: left;
      padding: 10px 8px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      border-bottom: 2px solid #e5e5e5;
    }
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #f0f0f0;
      vertical-align: top;
    }
    td.desc small { color: #999; font-size: 11px; }
    td.qty, td.time { text-align: center; }
    td.price { text-align: right; font-weight: 600; white-space: nowrap; }
    .total-row td {
      font-size: 16px;
      font-weight: 800;
      border-top: 2px solid #e5e5e5;
      border-bottom: none;
      padding-top: 14px;
    }
    .total-row .total-label { color: #c96f4a; }
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
    .footer .validity { font-weight: 600; color: #1a1a1a; }
    .footer .payment { margin-top: 6px; }
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
    @media print {
      body { padding: 30px 34px; }
      @page { size: A4; margin: 15mm; }
    }
    .thank-you {
      text-align: center;
      margin-top: 36px;
      font-size: 14px;
      font-weight: 600;
      color: #c96f4a;
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
      <div class="quote-label">Orçamento</div>
      <div class="quote-number">${escapeHtml(quoteNumber)}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-row"><span class="info-label">Cliente</span><span class="info-value">${client}</span></div>
    <div class="info-row"><span class="info-label">Data de emissão</span><span class="info-value">${issueDate}</span></div>
    <div class="info-row"><span class="info-label">WhatsApp</span><span class="info-value"><a href="${whatsappLink}" style="color:#5fa8a3">${escapeHtml(input.whatsappNumero)}</a></span></div>
    <div class="info-row"><span class="info-label">Válido até</span><span class="info-value">${validityStr}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Descrição</th>
        <th style="text-align:center">Qtd.</th>
        <th style="text-align:center">Tempo est.</th>
        <th style="text-align:right">Preço unit.</th>
        <th style="text-align:right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
      <tr class="total-row">
        <td colspan="4" class="total-label">TOTAL DO ORÇAMENTO</td>
        <td class="price">${brl(grandTotal)}</td>
      </tr>
    </tbody>
  </table>

  ${observationsBlock}

  <div class="footer">
    <div>
      <div class="validity">Orçamento válido por ${input.validityDays ?? 7} dias</div>
      <div class="payment">Aceitamos: PIX · Cartão de Crédito · Cartão de Débito · Dinheiro</div>
    </div>
    <div class="contact">
      Qualquer dúvida, entre em contato:<br>
      <a href="${whatsappLink}">WhatsApp ${escapeHtml(input.whatsappNumero)}</a>
    </div>
  </div>

  <div class="thank-you">Obrigado pela preferência! — ${studio}</div>

  <script>
    // Auto-open print dialog after render
    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() { window.print(); }, 400);
    });
  </script>
</body>
</html>`;
}

/**
 * Opens a new browser tab with the quote HTML and triggers the print dialog.
 * Falls back to a direct window.open if popups are blocked.
 */
export function openPrintQuote(input: QuoteInput) {
  const html = buildQuoteHtml(input);
  const blob = new Blob([html], { type: "text/html;charset=UTF-8" });
  const url = URL.createObjectURL(blob);

  const printWindow = window.open(url, "_blank", "noopener,noreferrer");
  if (!printWindow) {
    // If popup blocked, try direct document write
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
    return;
  }
  // Cleanup blob after window loads
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
