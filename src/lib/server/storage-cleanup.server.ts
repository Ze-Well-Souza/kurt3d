import { getSupabaseAdminClient } from "./supabase.server";
import { logger } from "./logger.server";

/**
 * Deletes lead images from Supabase Storage that are older than the specified age.
 * This prevents storage bloat on the free tier.
 *
 * @param olderThanDays - Delete images from leads older than this many days (default 90)
 * @returns Number of files deleted
 */
export async function cleanupOldLeadImages(olderThanDays: number = 90): Promise<number> {
  try {
    const supabase = getSupabaseAdminClient();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const cutoffIso = cutoff.toISOString();

    // Find old leads that have images
    const { data: oldLeads, error: queryError } = await supabase
      .from("leads")
      .select("id, imagens")
      .lt("created_at", cutoffIso)
      .not("imagens", "is", null);

    if (queryError) {
      logger.error("cleanup.query_failed", { error: queryError.message });
      return 0;
    }

    if (!oldLeads || oldLeads.length === 0) {
      return 0;
    }

    // Extract storage paths from old leads' images
    const pathsToDelete: string[] = [];
    for (const lead of oldLeads) {
      const imagens = lead.imagens;
      if (!Array.isArray(imagens)) continue;
      for (const img of imagens) {
        if (img?.storagePath && typeof img.storagePath === "string") {
          pathsToDelete.push(img.storagePath);
        }
      }
    }

    if (pathsToDelete.length === 0) {
      return 0;
    }

    // Delete in batches of 1000 (Supabase limit)
    let deletedCount = 0;
    for (let i = 0; i < pathsToDelete.length; i += 1000) {
      const batch = pathsToDelete.slice(i, i + 1000);
      const { error: deleteError } = await supabase.storage.from("lead-images").remove(batch);
      if (deleteError) {
        logger.warn("cleanup.delete_batch_failed", {
          error: deleteError.message,
          batchSize: batch.length,
          startIndex: i,
        });
      } else {
        deletedCount += batch.length;
      }
    }

    logger.info("cleanup.completed", {
      leadsChecked: oldLeads.length,
      filesDeleted: deletedCount,
      olderThanDays,
    });

    return deletedCount;
  } catch (error) {
    logger.error("cleanup.exception", { error: String(error) });
    return 0;
  }
}

/**
 * Deletes images for a specific lead from storage.
 * Called when a lead is deleted or converted.
 */
export async function deleteLeadImages(leadImages: Array<{ storagePath?: string }>): Promise<void> {
  if (!leadImages || leadImages.length === 0) return;

  const paths = leadImages
    .map((img) => img?.storagePath)
    .filter((p): p is string => typeof p === "string" && p.length > 0);

  if (paths.length === 0) return;

  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.storage.from("lead-images").remove(paths);
    if (error) {
      logger.warn("cleanup.lead_delete_failed", { error: error.message, pathCount: paths.length });
    }
  } catch (error) {
    logger.warn("cleanup.lead_delete_exception", { error: String(error) });
  }
}

