/**
 * Printable payment receipt (recibo de pagamento) generator for Kurti 3D.
 * Generates a printer-friendly HTML document with the company branding,
 * payment details, and client reference — then triggers the browser print dialog.
 *
 * Follows the same visual template as quote-print.ts (orçamento).
 */

import { brl, formatPhoneDisplay } from "../utils";
import { escapeHtml, formatPrintDate, generateDocumentNumber } from "./print-html";

export type ReceiptInput = {
  /** Nome do cliente que efetuou o pagamento. */
  clientName: string;
  /** Nome do projeto/pedido referenciado. */
  projectName: string;
  /** Valor pago em reais. */
  valorPago: number;
  /** Método de pagamento: PIX, Dinheiro, Cartão, etc. */
  formaPagamento: string;
  /** Data do pagamento no formato ISO ou string de data localizada. */
  dataPagamento: string;
  /** Observações adicionais (ex.: "sinal de 50%", "saldo restante"). */
  observacao?: string;
  /** Nome do estúdio (Kurti 3D por padrão). */
  studioNome: string;
  /** Número de WhatsApp do estúdio para contato. */
  whatsappNumero: string;
  /** URL do Instagram (opcional, padrão @kurti3d). */
  instagramUrl?: string;
  /** Número do recibo (se já salvo no banco). Se omitido, gera aleatório. */
  receiptNumber?: string;
};

/** Kurti 3D thumbs-up logo as inline SVG (print-safe). */
const LOGO_SVG = `
<svg viewBox="0 0 56 56" width="48" height="48" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="rkfill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#c96f4a"/>
      <stop offset="30%" stop-color="#e0a93b"/>
      <stop offset="55%" stop-color="#8aab6e"/>
      <stop offset="80%" stop-color="#5fa8a3"/>
      <stop offset="100%" stop-color="#8a3a52"/>
    </linearGradient>
  </defs>
  <path d="M14 28 L14 46 L20 46 L20 28 Z M22 28 L22 46 Q22 48 24 48 L36 48 Q39 48 40 45 L43 33 Q43.5 30 40.5 30 L32 30 L33 22 Q33.5 18 30 17 Q27 16 26 19 L22 28 Z" fill="url(#rkfill)"/>
</svg>`;

/**
 * Builds the full payment receipt HTML document.
 */
export function buildPaymentReceiptHtml(input: ReceiptInput): string {
  const receiptNumber = input.receiptNumber || generateDocumentNumber("REC");
  const issueDate = formatPrintDate(new Date());
  const studio = escapeHtml(input.studioNome);
  const client = escapeHtml(input.clientName || "__________________________");
  const project = escapeHtml(input.projectName || "Pedido Kurti 3D");

  // Format payment date
  let paymentDateStr: string;
  try {
    paymentDateStr = formatPrintDate(new Date(input.dataPagamento + "T12:00:00"));
  } catch {
    paymentDateStr = input.dataPagamento;
  }

  const whatsappLink = (() => {
    const digits = (input.whatsappNumero ?? "").replace(/\D/g, "");
    const full = digits.length <= 11 ? `55${digits}` : digits;
    return `https://wa.me/${full}`;
  })();
  const phoneDisplay = formatPhoneDisplay(input.whatsappNumero);
  const instagramUrl = input.instagramUrl || "https://instagram.com/kurti3d";

  const observationsBlock = input.observacao
    ? `<div class="observations"><strong>Observações:</strong><br>${escapeHtml(input.observacao)}</div>`
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

    .payment-highlight {
      margin-bottom: 28px;
      padding: 24px 28px;
      background: #f0faf8;
      border: 2px solid #5fa8a3;
      border-radius: 10px;
      text-align: center;
    }
    .payment-highlight .amount-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #5fa8a3;
      margin-bottom: 4px;
    }
    .payment-highlight .amount-value {
      font-size: 36px;
      font-weight: 800;
      color: #1a1a1a;
    }

    .detail-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .detail-table td {
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 13px;
    }
    .detail-table td:first-child { color: #888; width: 160px; }
    .detail-table td:last-child { font-weight: 600; }

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
      <div class="receipt-label">Recibo de Pagamento</div>
      <div class="receipt-number">${escapeHtml(receiptNumber)}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-row"><span class="info-label">Cliente</span><span class="info-value">${client}</span></div>
    <div class="info-row"><span class="info-label">Data de emissão</span><span class="info-value">${issueDate}</span></div>
    <div class="info-row"><span class="info-label">Pedido / Projeto</span><span class="info-value">${project}</span></div>
    <div class="info-row"><span class="info-label">WhatsApp</span><span class="info-value"><a href="${whatsappLink}" style="color:#5fa8a3">${escapeHtml(phoneDisplay)}</a></span></div>
  </div>

  <div class="payment-highlight">
    <div class="amount-label">Valor Recebido</div>
    <div class="amount-value">${brl(input.valorPago)}</div>
  </div>

  <table class="detail-table">
    <tbody>
      <tr>
        <td>Forma de Pagamento</td>
        <td>${escapeHtml(input.formaPagamento)}</td>
      </tr>
      <tr>
        <td>Data do Pagamento</td>
        <td>${paymentDateStr}</td>
      </tr>
      <tr>
        <td>Nº do Recibo</td>
        <td style="font-family:monospace;font-size:12px">${escapeHtml(receiptNumber)}</td>
      </tr>
    </tbody>
  </table>

  ${observationsBlock}

  <div class="receipt-disclaimer">
    Este recibo comprova o pagamento referente ao pedido acima.<br>
    Para dúvidas ou esclarecimentos, entre em contato pelo WhatsApp.
  </div>

  <div class="footer">
    <div>
      <div style="font-weight:600;color:#1a1a1a">${studio}</div>
      <div>CNPJ em regularização — MEI em andamento</div>
    </div>
    <div class="contact">
      Qualquer dúvida, entre em contato:<br>
      <a href="${whatsappLink}">WhatsApp ${escapeHtml(phoneDisplay)}</a><br>
      <a href="${escapeHtml(instagramUrl)}" style="color:#e0a93b">Instagram @kurti3d</a>
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
 * Opens a new browser tab with the payment receipt HTML
 * and triggers the print dialog.
 * Falls back to a direct window.open if popups are blocked.
 */
export function openPrintReceipt(input: ReceiptInput) {
  const html = buildPaymentReceiptHtml(input);
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
