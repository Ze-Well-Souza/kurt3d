import type { BudgetQuote, PortfolioVideo, ProductionCalendarEvent, SavedReport } from "../../domain/types";
import { getSupabaseAdminClient } from "../supabase.server";
import { replaceById, unwrapResult } from "./shared";

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

export async function productionCalendarRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("production_calendar").select("*").order("start_date", { ascending: true }), {
    table: "production_calendar",
    operation: "list",
    query: "select(*).order(start_date asc)",
  });
  const list = (rows as any[]).map(fromProductionCalendarRow);
  return {
    list,
    async save(next: ProductionCalendarEvent[]) {
      await replaceById("production_calendar", next.map(toProductionCalendarRow));
      return next;
    },
    async upsert(event: ProductionCalendarEvent) {
      unwrapResult(await supabase.from("production_calendar").upsert(toProductionCalendarRow(event), { onConflict: "id" }), {
        table: "production_calendar",
        operation: "upsert",
        query: "upsert(onConflict=id)",
        metadata: { eventId: event.id },
      });
      return list.some((item) => item.id === event.id) ? list.map((item) => (item.id === event.id ? event : item)) : [...list, event];
    },
    async remove(id: string) {
      unwrapResult(await supabase.from("production_calendar").delete().eq("id", id), {
        table: "production_calendar",
        operation: "delete",
        query: "delete().eq(id)",
        metadata: { eventId: id },
      });
      return list.filter((item) => item.id !== id);
    },
  };
}

export async function budgetQuotesRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("budget_quotes").select("*").order("created_at", { ascending: false }), {
    table: "budget_quotes",
    operation: "list",
    query: "select(*).order(created_at desc)",
  });
  const list = (rows as any[]).map(fromBudgetQuoteRow);
  return {
    list,
    async save(next: BudgetQuote[]) {
      await replaceById("budget_quotes", next.map(toBudgetQuoteRow));
      return next;
    },
    async upsert(quote: BudgetQuote) {
      unwrapResult(await supabase.from("budget_quotes").upsert(toBudgetQuoteRow(quote), { onConflict: "id" }), {
        table: "budget_quotes",
        operation: "upsert",
        query: "upsert(onConflict=id)",
        metadata: { quoteId: quote.id },
      });
      return list.some((item) => item.id === quote.id) ? list.map((item) => (item.id === quote.id ? quote : item)) : [quote, ...list];
    },
    async remove(id: string) {
      unwrapResult(await supabase.from("budget_quotes").delete().eq("id", id), {
        table: "budget_quotes",
        operation: "delete",
        query: "delete().eq(id)",
        metadata: { quoteId: id },
      });
      return list.filter((item) => item.id !== id);
    },
  };
}

export async function portfolioVideosRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("portfolio_videos").select("*").order("created_at", { ascending: false }), {
    table: "portfolio_videos",
    operation: "list",
    query: "select(*).order(created_at desc)",
  });
  const list = (rows as any[]).map(fromPortfolioVideoRow);
  return {
    list,
    async save(next: PortfolioVideo[]) {
      await replaceById("portfolio_videos", next.map(toPortfolioVideoRow));
      return next;
    },
    async upsert(video: PortfolioVideo) {
      unwrapResult(await supabase.from("portfolio_videos").upsert(toPortfolioVideoRow(video), { onConflict: "id" }), {
        table: "portfolio_videos",
        operation: "upsert",
        query: "upsert(onConflict=id)",
        metadata: { videoId: video.id },
      });
      return list.some((item) => item.id === video.id) ? list.map((item) => (item.id === video.id ? video : item)) : [video, ...list];
    },
    async remove(id: string) {
      unwrapResult(await supabase.from("portfolio_videos").delete().eq("id", id), {
        table: "portfolio_videos",
        operation: "delete",
        query: "delete().eq(id)",
        metadata: { videoId: id },
      });
      return list.filter((item) => item.id !== id);
    },
  };
}

export async function savedReportsRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("saved_reports").select("*").order("created_at", { ascending: false }), {
    table: "saved_reports",
    operation: "list",
    query: "select(*).order(created_at desc)",
  });
  const list = (rows as any[]).map(fromSavedReportRow);
  return {
    list,
    async save(next: SavedReport[]) {
      await replaceById("saved_reports", next.map(toSavedReportRow));
      return next;
    },
    async upsert(report: SavedReport) {
      unwrapResult(await supabase.from("saved_reports").upsert(toSavedReportRow(report), { onConflict: "id" }), {
        table: "saved_reports",
        operation: "upsert",
        query: "upsert(onConflict=id)",
        metadata: { reportId: report.id },
      });
      return list.some((item) => item.id === report.id) ? list.map((item) => (item.id === report.id ? report : item)) : [report, ...list];
    },
    async remove(id: string) {
      unwrapResult(await supabase.from("saved_reports").delete().eq("id", id), {
        table: "saved_reports",
        operation: "delete",
        query: "delete().eq(id)",
        metadata: { reportId: id },
      });
      return list.filter((item) => item.id !== id);
    },
  };
}
