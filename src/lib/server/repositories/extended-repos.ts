import { randomUUID } from "node:crypto";
import type { ProductionCalendarEvent, BudgetQuote, PortfolioVideo, SavedReport } from "../../domain/types";
import { db } from "../db.server";
import { RepositoryError } from "./shared";

export async function productionCalendarRepo() {
  const list = await db<ProductionCalendarEvent>("production_calendar", { orderBy: [{ column: "start_date", ascending: true }] });

  const save = async (events: ProductionCalendarEvent[]) => {
    try {
      await db("production_calendar").delete();
      for (const event of events) {
        await db("production_calendar").insert(event);
      }
      return events;
    } catch (error) {
      throw new RepositoryError("Failed to save production calendar events", error);
    }
  };

  const upsert = async (event: ProductionCalendarEvent) => {
    try {
      const existing = list.find((e) => e.id === event.id);
      if (existing) {
        await db("production_calendar").update(event).eq("id", event.id);
        const updated = list.map((e) => (e.id === event.id ? event : e));
        return updated;
      } else {
        await db("production_calendar").insert(event);
        return [...list, event];
      }
    } catch (error) {
      throw new RepositoryError("Failed to upsert production calendar event", error);
    }
  };

  const remove = async (id: string) => {
    try {
      await db("production_calendar").delete().eq("id", id);
      return list.filter((e) => e.id !== id);
    } catch (error) {
      throw new RepositoryError("Failed to remove production calendar event", error);
    }
  };

  return { list, save, upsert, remove };
}

export async function budgetQuotesRepo() {
  const list = await db<BudgetQuote>("budget_quotes", { orderBy: [{ column: "created_at", ascending: false }] });

  const save = async (quotes: BudgetQuote[]) => {
    try {
      await db("budget_quotes").delete();
      for (const quote of quotes) {
        await db("budget_quotes").insert(quote);
      }
      return quotes;
    } catch (error) {
      throw new RepositoryError("Failed to save budget quotes", error);
    }
  };

  const upsert = async (quote: BudgetQuote) => {
    try {
      const existing = list.find((q) => q.id === quote.id);
      if (existing) {
        await db("budget_quotes").update(quote).eq("id", quote.id);
        const updated = list.map((q) => (q.id === quote.id ? quote : q));
        return updated;
      } else {
        await db("budget_quotes").insert(quote);
        return [quote, ...list];
      }
    } catch (error) {
      throw new RepositoryError("Failed to upsert budget quote", error);
    }
  };

  const remove = async (id: string) => {
    try {
      await db("budget_quotes").delete().eq("id", id);
      return list.filter((q) => q.id !== id);
    } catch (error) {
      throw new RepositoryError("Failed to remove budget quote", error);
    }
  };

  return { list, save, upsert, remove };
}

export async function portfolioVideosRepo() {
  const list = await db<PortfolioVideo>("portfolio_videos", { orderBy: [{ column: "created_at", ascending: false }] });

  const save = async (videos: PortfolioVideo[]) => {
    try {
      await db("portfolio_videos").delete();
      for (const video of videos) {
        await db("portfolio_videos").insert(video);
      }
      return videos;
    } catch (error) {
      throw new RepositoryError("Failed to save portfolio videos", error);
    }
  };

  const upsert = async (video: PortfolioVideo) => {
    try {
      const existing = list.find((v) => v.id === video.id);
      if (existing) {
        await db("portfolio_videos").update(video).eq("id", video.id);
        const updated = list.map((v) => (v.id === video.id ? video : v));
        return updated;
      } else {
        await db("portfolio_videos").insert(video);
        return [video, ...list];
      }
    } catch (error) {
      throw new RepositoryError("Failed to upsert portfolio video", error);
    }
  };

  const remove = async (id: string) => {
    try {
      await db("portfolio_videos").delete().eq("id", id);
      return list.filter((v) => v.id !== id);
    } catch (error) {
      throw new RepositoryError("Failed to remove portfolio video", error);
    }
  };

  return { list, save, upsert, remove };
}

export async function savedReportsRepo() {
  const list = await db<SavedReport>("saved_reports", { orderBy: [{ column: "created_at", ascending: false }] });

  const save = async (reports: SavedReport[]) => {
    try {
      await db("saved_reports").delete();
      for (const report of reports) {
        await db("saved_reports").insert(report);
      }
      return reports;
    } catch (error) {
      throw new RepositoryError("Failed to save saved reports", error);
    }
  };

  const upsert = async (report: SavedReport) => {
    try {
      const existing = list.find((r) => r.id === report.id);
      if (existing) {
        await db("saved_reports").update(report).eq("id", report.id);
        const updated = list.map((r) => (r.id === report.id ? report : r));
        return updated;
      } else {
        await db("saved_reports").insert(report);
        return [report, ...list];
      }
    } catch (error) {
      throw new RepositoryError("Failed to upsert saved report", error);
    }
  };

  const remove = async (id: string) => {
    try {
      await db("saved_reports").delete().eq("id", id);
      return list.filter((r) => r.id !== id);
    } catch (error) {
      throw new RepositoryError("Failed to remove saved report", error);
    }
  };

  return { list, save, upsert, remove };
}
