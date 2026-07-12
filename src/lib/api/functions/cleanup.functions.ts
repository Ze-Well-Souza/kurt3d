import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cleanupOldLeadImages } from "../../server/storage-cleanup.server";
import { checkMutationRateLimit } from "../../server/mutation-guard.server";
import { requireSession } from "../../server/require-session.server";

/**
 * Admin-only: triggers storage cleanup for old lead images.
 * Cleans up images from leads older than the specified number of days.
 */
export const runStorageCleanup = createServerFn({ method: "POST" })
  .validator(
    z.object({
      olderThanDays: z.number().int().min(30).max(365).default(90),
    }),
  )
  .handler(async ({ data }) => {
    await checkMutationRateLimit();
    await requireSession();
    const deletedCount = await cleanupOldLeadImages(data.olderThanDays);
    return { ok: true as const, deletedCount };
  });
