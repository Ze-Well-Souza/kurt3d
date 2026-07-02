import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nowIso } from "../../server/db.server";
import {
  budgetQuotesRepo,
  portfolioVideosRepo,
  productionCalendarRepo,
  savedReportsRepo,
} from "../../server/repositories.server";
import type { BudgetQuote, BudgetQuoteItem, PortfolioVideo, ProductionCalendarEvent, SavedReport } from "../../domain/types";
import { checkMutationRateLimit } from "../../server/mutation-guard.server";
import { requireSession } from "../../server/require-session.server";

// ═══════════ Budget Quotes (Orçamentos) ═══════════

const budgetQuoteItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().trim().min(1).max(500),
  quantity: z.number().int().min(1).max(10000),
  unitPrice: z.number().min(0).max(1000000),
  timeMinutes: z.number().min(0).max(100000),
  materialGrams: z.number().min(0).max(100000),
  subtotal: z.number().min(0).max(1000000),
});

export const createBudgetQuote = createServerFn({ method: "POST" })
  .validator(
    z.object({
      clientName: z.string().trim().min(1).max(200),
      clientContact: z.string().trim().max(100).optional(),
      clientEmail: z.string().email().max(200).optional(),
      items: z.array(budgetQuoteItemSchema).min(1),
      discountPercent: z.number().min(0).max(100).optional(),
      validityDays: z.number().int().min(1).max(365).default(7),
      notes: z.string().max(1000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await budgetQuotesRepo();
    const now = nowIso();
    
    const subtotal = data.items.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = data.discountPercent ?? 0;
    const total = subtotal * (1 - discount / 100);
    const expiresAt = new Date(Date.now() + (data.validityDays * 24 * 60 * 60 * 1000)).toISOString();
    
    const quote: BudgetQuote = {
      id: randomUUID(),
      clientName: data.clientName,
      clientContact: data.clientContact ?? null,
      clientEmail: data.clientEmail ?? null,
      items: data.items.map((item) => ({ ...item, id: item.id ?? randomUUID() })),
      subtotal,
      discountPercent: discount || null,
      total,
      validityDays: data.validityDays,
      status: "draft",
      notes: data.notes ?? null,
      pdfUrl: null,
      createdAt: now,
      expiresAt,
      convertedToOrderId: null,
    };
    
    await repo.upsert(quote);
    return { ok: true, quoteId: quote.id };
  });

export const updateBudgetQuote = createServerFn({ method: "POST" })
  .validator(
    z.object({
      quoteId: z.string().min(1),
      clientName: z.string().trim().min(1).max(200),
      clientContact: z.string().trim().max(100).optional(),
      clientEmail: z.string().email().max(200).optional(),
      items: z.array(budgetQuoteItemSchema),
      discountPercent: z.number().min(0).max(100).optional(),
      validityDays: z.number().int().min(1).max(365),
      notes: z.string().max(1000).optional(),
      status: z.enum(["draft", "sent", "approved", "rejected", "expired", "converted"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await budgetQuotesRepo();
    const quote = repo.list.find((q) => q.id === data.quoteId);
    if (!quote) return { ok: false, reason: "not_found" };
    
    const now = nowIso();
    const subtotal = data.items.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = data.discountPercent ?? 0;
    const total = subtotal * (1 - discount / 100);
    
    const updated: BudgetQuote = {
      ...quote,
      clientName: data.clientName,
      clientContact: data.clientContact ?? null,
      clientEmail: data.clientEmail ?? null,
      items: data.items.map((item) => ({ ...item, id: item.id ?? randomUUID() })),
      subtotal,
      discountPercent: discount || null,
      total,
      validityDays: data.validityDays,
      status: data.status ?? quote.status,
      notes: data.notes ?? null,
      updatedAt: now,
    };
    
    await repo.upsert(updated);
    return { ok: true };
  });

export const deleteBudgetQuote = createServerFn({ method: "POST" })
  .validator(z.object({ quoteId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await budgetQuotesRepo();
    await repo.remove(data.quoteId);
    return { ok: true };
  });

export const convertQuoteToOrder = createServerFn({ method: "POST" })
  .validator(z.object({ quoteId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const quotesRepo = await budgetQuotesRepo();
    const quote = quotesRepo.list.find((q) => q.id === data.quoteId);
    if (!quote) return { ok: false, reason: "not_found" };
    if (quote.status !== "approved") return { ok: false, reason: "not_approved" };
    
    // This will be integrated with orders.functions.ts to create actual order
    const updated: BudgetQuote = { ...quote, status: "converted", convertedToOrderId: "pending" };
    await quotesRepo.upsert(updated);
    return { ok: true, quoteId: quote.id };
  });

// ═══════════ Portfolio Videos ═══════════

export const addPortfolioVideo = createServerFn({ method: "POST" })
  .validator(
    z.object({
      projectId: z.string().min(1).optional(),
      title: z.string().trim().min(1).max(200),
      description: z.string().max(1000).optional(),
      videoUrl: z.string().url().max(500),
      thumbnailUrl: z.string().url().max(500).optional(),
      platform: z.enum(["youtube", "vimeo", "instagram", "tiktok"]).default("youtube"),
      durationSeconds: z.number().int().min(1).max(86400).optional(),
      featured: z.boolean().default(false),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await portfolioVideosRepo();
    const now = nowIso();
    
    const video: PortfolioVideo = {
      id: randomUUID(),
      projectId: data.projectId ?? null,
      title: data.title,
      description: data.description ?? null,
      videoUrl: data.videoUrl,
      thumbnailUrl: data.thumbnailUrl ?? null,
      platform: data.platform,
      durationSeconds: data.durationSeconds ?? null,
      viewsCount: null,
      featured: data.featured,
      createdAt: now,
      updatedAt: now,
    };
    
    await repo.upsert(video);
    return { ok: true, videoId: video.id };
  });

export const updatePortfolioVideo = createServerFn({ method: "POST" })
  .validator(
    z.object({
      videoId: z.string().min(1),
      title: z.string().trim().min(1).max(200),
      description: z.string().max(1000).optional(),
      videoUrl: z.string().url().max(500),
      thumbnailUrl: z.string().url().max(500).optional(),
      platform: z.enum(["youtube", "vimeo", "instagram", "tiktok"]),
      durationSeconds: z.number().int().min(1).max(86400).optional(),
      featured: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await portfolioVideosRepo();
    const video = repo.list.find((v) => v.id === data.videoId);
    if (!video) return { ok: false, reason: "not_found" };
    
    const updated: PortfolioVideo = {
      ...video,
      title: data.title,
      description: data.description ?? null,
      videoUrl: data.videoUrl,
      thumbnailUrl: data.thumbnailUrl ?? null,
      platform: data.platform,
      durationSeconds: data.durationSeconds ?? null,
      featured: data.featured,
      updatedAt: nowIso(),
    };
    
    await repo.upsert(updated);
    return { ok: true };
  });

export const deletePortfolioVideo = createServerFn({ method: "POST" })
  .validator(z.object({ videoId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await portfolioVideosRepo();
    await repo.remove(data.videoId);
    return { ok: true };
  });

// ═══════════ Production Calendar ═══════════

export const createCalendarEvent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orderId: z.string().min(1),
      title: z.string().trim().min(1).max(200),
      startDate: z.string(),
      endDate: z.string(),
      printerName: z.string().trim().max(100).default("Bambu Lab A1"),
      notes: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await productionCalendarRepo();
    const now = nowIso();
    
    const event: ProductionCalendarEvent = {
      id: randomUUID(),
      orderId: data.orderId,
      title: data.title,
      startDate: data.startDate,
      endDate: data.endDate,
      printerName: data.printerName,
      status: "scheduled",
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    
    await repo.upsert(event);
    return { ok: true, eventId: event.id };
  });

export const updateCalendarEvent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      eventId: z.string().min(1),
      title: z.string().trim().min(1).max(200),
      startDate: z.string(),
      endDate: z.string(),
      printerName: z.string().trim().max(100),
      status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
      notes: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await productionCalendarRepo();
    const event = repo.list.find((e) => e.id === data.eventId);
    if (!event) return { ok: false, reason: "not_found" };
    
    const updated: ProductionCalendarEvent = {
      ...event,
      title: data.title,
      startDate: data.startDate,
      endDate: data.endDate,
      printerName: data.printerName,
      status: data.status,
      notes: data.notes ?? null,
      updatedAt: nowIso(),
    };
    
    await repo.upsert(updated);
    return { ok: true };
  });

export const deleteCalendarEvent = createServerFn({ method: "POST" })
  .validator(z.object({ eventId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await productionCalendarRepo();
    await repo.remove(data.eventId);
    return { ok: true };
  });

// ═══════════ Saved Reports ═══════════

export const saveReport = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().trim().min(1).max(200),
      type: z.enum(["revenue", "performance", "inventory", "orders", "custom"]),
      config: z.record(z.unknown()),
      filters: z.record(z.unknown()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await savedReportsRepo();
    const now = nowIso();
    
    const report: SavedReport = {
      id: randomUUID(),
      name: data.name,
      type: data.type,
      config: data.config,
      filters: data.filters ?? null,
      createdBy: null,
      createdAt: now,
      updatedAt: now,
    };
    
    await repo.upsert(report);
    return { ok: true, reportId: report.id };
  });

export const deleteSavedReport = createServerFn({ method: "POST" })
  .validator(z.object({ reportId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const repo = await savedReportsRepo();
    await repo.remove(data.reportId);
    return { ok: true };
  });
