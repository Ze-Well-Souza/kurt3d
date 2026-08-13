import type {
  BudgetQuote,
  PortfolioVideo,
  ProductionCalendarEvent,
  Receipt,
  SavedReport,
} from "../../domain/types";
import { getSupabaseAdminClient } from "../supabase.server";
import { createCrudRepo } from "./crud-repo";
import { unwrapResult } from "./shared";

function fromProductionCalendarRow(row: any): ProductionCalendarEvent {
  return {
    id: row.id,
    orderId: row.order_id,
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    printerName: row.printer_name,
    status: row.status,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toProductionCalendarRow(row: ProductionCalendarEvent) {
  return {
    id: row.id,
    order_id: row.orderId,
    title: row.title,
    start_date: row.startDate,
    end_date: row.endDate,
    printer_name: row.printerName,
    status: row.status,
    notes: row.notes ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function fromBudgetQuoteRow(row: any): BudgetQuote {
  return {
    id: row.id,
    clientName: row.client_name,
    clientContact: row.client_contact ?? null,
    clientEmail: row.client_email ?? null,
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: row.subtotal,
    discountPercent: row.discount_percent ?? null,
    total: row.total,
    validityDays: row.validity_days,
    status: row.status,
    notes: row.notes ?? null,
    pdfUrl: row.pdf_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    expiresAt: row.expires_at ?? null,
    convertedToOrderId: row.converted_to_order_id ?? null,
  };
}

function toBudgetQuoteRow(row: BudgetQuote) {
  return {
    id: row.id,
    client_name: row.clientName,
    client_contact: row.clientContact ?? null,
    client_email: row.clientEmail ?? null,
    items: row.items,
    subtotal: row.subtotal,
    discount_percent: row.discountPercent ?? null,
    total: row.total,
    validity_days: row.validityDays,
    status: row.status,
    notes: row.notes ?? null,
    pdf_url: row.pdfUrl ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    expires_at: row.expiresAt ?? null,
    converted_to_order_id: row.convertedToOrderId ?? null,
  };
}

function fromPortfolioVideoRow(row: any): PortfolioVideo {
  return {
    id: row.id,
    projectId: row.project_id ?? null,
    title: row.title,
    description: row.description ?? null,
    videoUrl: row.video_url,
    thumbnailUrl: row.thumbnail_url ?? null,
    platform: row.platform,
    durationSeconds: row.duration_seconds ?? null,
    viewsCount: row.views_count ?? null,
    featured: row.featured,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPortfolioVideoRow(row: PortfolioVideo) {
  return {
    id: row.id,
    project_id: row.projectId ?? null,
    title: row.title,
    description: row.description ?? null,
    video_url: row.videoUrl,
    thumbnail_url: row.thumbnailUrl ?? null,
    platform: row.platform,
    duration_seconds: row.durationSeconds ?? null,
    views_count: row.viewsCount ?? null,
    featured: row.featured,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function fromSavedReportRow(row: any): SavedReport {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    config: row.config ?? {},
    filters: row.filters ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSavedReportRow(row: SavedReport) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    config: row.config,
    filters: row.filters ?? null,
    created_by: row.createdBy ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export const productionCalendarRepo = createCrudRepo({
  table: "production_calendar",
  fromRow: fromProductionCalendarRow,
  toRow: toProductionCalendarRow,
  order: [{ column: "start_date", ascending: true }],
});

export const budgetQuotesRepo = createCrudRepo({
  table: "budget_quotes",
  fromRow: fromBudgetQuoteRow,
  toRow: toBudgetQuoteRow,
  order: [{ column: "created_at", ascending: false }],
});

export const portfolioVideosRepo = createCrudRepo({
  table: "portfolio_videos",
  fromRow: fromPortfolioVideoRow,
  toRow: toPortfolioVideoRow,
  order: [{ column: "created_at", ascending: false }],
});

export const savedReportsRepo = createCrudRepo({
  table: "saved_reports",
  fromRow: fromSavedReportRow,
  toRow: toSavedReportRow,
  order: [{ column: "created_at", ascending: false }],
});

// ═══════════ Receipts ═══════════

function fromReceiptRow(row: any): Receipt {
  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    type: row.type,
    clientName: row.client_name,
    items: Array.isArray(row.items) ? row.items : [],
    total: row.total,
    docType: row.doc_type ?? null,
    docNumber: row.doc_number ?? null,
    studioDocType: row.studio_doc_type ?? null,
    studioDocNumber: row.studio_doc_number ?? null,
    formaPagamento: row.forma_pagamento ?? null,
    observacao: row.observacao ?? null,
    paid: row.paid ?? false,
    sourceType: row.source_type ?? null,
    sourceId: row.source_id ?? null,
    discountPercent: row.discount_percent ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toReceiptRow(row: Receipt) {
  return {
    id: row.id,
    receipt_number: row.receiptNumber,
    type: row.type,
    client_name: row.clientName,
    items: row.items,
    total: row.total,
    doc_type: row.docType ?? null,
    doc_number: row.docNumber ?? null,
    studio_doc_type: row.studioDocType ?? null,
    studio_doc_number: row.studioDocNumber ?? null,
    forma_pagamento: row.formaPagamento ?? null,
    observacao: row.observacao ?? null,
    paid: row.paid,
    source_type: row.sourceType ?? null,
    source_id: row.sourceId ?? null,
    discount_percent: row.discountPercent ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

const baseReceiptsRepo = createCrudRepo({
  table: "receipts",
  fromRow: fromReceiptRow,
  toRow: toReceiptRow,
  order: [{ column: "created_at", ascending: false }],
});

export async function receiptsRepo() {
  const repo = await baseReceiptsRepo();
  const supabase = getSupabaseAdminClient();

  /**
   * Insere o recibo com o próximo número sequencial do dia (P1-3).
   *
   * A numeração antes era `recibos_de_hoje.length + 1` calculada sobre a lista
   * em memória. Isso colidia com a constraint UNIQUE de `receipt_number` em
   * três situações: dois recibos emitidos ao mesmo tempo recebiam o mesmo
   * número; apagar um recibo fazia o próximo reutilizar o número já usado; e a
   * lista podia nem conter os recibos de hoje.
   *
   * Agora o próximo número vem de um MAX no banco e a inserção é retentada em
   * caso de violação de unicidade — quem perder a corrida simplesmente pega o
   * número seguinte.
   */
  async function insertWithNextNumber(
    receipt: Omit<Receipt, "receiptNumber">,
    maxAttempts = 5,
  ): Promise<Receipt> {
    const prefix = `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-`;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const existing = unwrapResult(
        await supabase
          .from("receipts")
          .select("receipt_number")
          .like("receipt_number", `${prefix}%`)
          .order("receipt_number", { ascending: false })
          .limit(1),
        {
          table: "receipts",
          operation: "nextReceiptNumber",
          query: "select(receipt_number).like(prefix).order desc.limit(1)",
        },
      ) as { receipt_number: string }[];

      const ultimo = existing[0]?.receipt_number;
      const sequencial = ultimo ? Number(ultimo.slice(prefix.length)) : 0;
      const proximo = (Number.isFinite(sequencial) ? sequencial : 0) + 1 + attempt;
      const completo: Receipt = {
        ...receipt,
        receiptNumber: `${prefix}${String(proximo).padStart(4, "0")}`,
      };

      const { error } = await supabase.from("receipts").insert(toReceiptRow(completo));
      if (!error) return completo;
      // 23505 = unique_violation: outro recibo levou este número. Tenta o seguinte.
      if (error.code !== "23505") {
        throw new Error(`[receipts.insertWithNextNumber] ${error.message}`);
      }
    }

    throw new Error(
      "Nao foi possivel gerar um numero de recibo unico apos varias tentativas. Tente novamente.",
    );
  }

  return { ...repo, insertWithNextNumber };
}
