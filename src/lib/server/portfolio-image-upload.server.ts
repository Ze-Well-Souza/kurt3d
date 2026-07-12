import { getSupabaseAdminClient } from "./supabase.server";
import { randomUUID } from "node:crypto";
import { logger } from "./logger.server";

const BUCKET = "portfolio-images";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export type UploadedPortfolioImage = {
  storagePath: string;
  publicUrl: string;
};

/**
 * Uploads a base64 data URL to Supabase Storage and returns the public URL.
 */
export async function uploadPortfolioImage(
  dataUrl: string,
  mimeType: string = "image/webp",
): Promise<UploadedPortfolioImage | null> {
  try {
    const base64Data = dataUrl.split(",")[1] ?? dataUrl;
    const buffer = Buffer.from(base64Data, "base64");

    if (buffer.length > MAX_IMAGE_SIZE) {
      logger.warn("portfolio.image_too_large", { size: buffer.length });
      return null;
    }

    const supabase = getSupabaseAdminClient();
    const ext = mimeType.split("/")[1] ?? "webp";
    const storagePath = `projects/${randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

    if (error) {
      logger.error("portfolio.upload_failed", {
        error: error.message,
        storagePath,
      });
      return null;
    }

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    return {
      storagePath,
      publicUrl: publicUrlData.publicUrl,
    };
  } catch (error) {
    logger.error("portfolio.upload_exception", { error: String(error) });
    return null;
  }
}

/**
 * Deletes an image from portfolio storage by its public URL.
 * Extracts the storage path from the URL.
 */
export async function deletePortfolioImage(imageUrl: string): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient();
    // Extract path from public URL like https://xxx.supabase.co/storage/v1/object/public/portfolio-images/projects/xxx.webp
    const match = imageUrl.match(/\/portfolio-images\/(.+)$/);
    if (!match) return;

    const storagePath = match[1];
    const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
    if (error) {
      logger.warn("portfolio.delete_failed", { error: error.message, storagePath });
    }
  } catch (error) {
    logger.warn("portfolio.delete_exception", { error: String(error) });
  }
}
