import { getSupabaseAdminClient } from "../server/supabase.server";
import { randomUUID } from "node:crypto";
import { logger } from "../server/logger.server";

const BUCKET = "lead-images";
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

export type UploadedImage = {
  storagePath: string;
  publicUrl: string;
  nome: string;
  tipo: string;
};

/**
 * Uploads a base64 data URL to Supabase Storage and returns the public URL.
 * The original base64 data is NOT stored in the database — only the storage path.
 */
export async function uploadBase64ToStorage(
  dataUrl: string,
  fileName: string,
  mimeType: string,
): Promise<UploadedImage | null> {
  try {
    const base64Data = dataUrl.split(",")[1] ?? dataUrl;
    const buffer = Buffer.from(base64Data, "base64");

    if (buffer.length > MAX_IMAGE_SIZE) {
      logger.warn("storage.image_too_large", { fileName, size: buffer.length });
      return null;
    }

    const supabase = getSupabaseAdminClient();
    const ext = mimeType.split("/")[1] ?? "jpeg";
    const storagePath = `leads/${randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

    if (error) {
      logger.error("storage.upload_failed", {
        error: error.message,
        fileName,
        storagePath,
      });
      return null;
    }

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    return {
      storagePath,
      publicUrl: publicUrlData.publicUrl,
      nome: fileName,
      tipo: mimeType,
    };
  } catch (error) {
    logger.error("storage.upload_exception", { error: String(error), fileName });
    return null;
  }
}

/**
 * Batch-uploads multiple base64 images to storage.
 * Filters out any that fail — returns only successfully uploaded items.
 */
export async function uploadImagesToStorage(
  images: { nome: string; tipo: string; dataUrl: string }[],
): Promise<UploadedImage[]> {
  const results = await Promise.allSettled(
    images.map((img) => uploadBase64ToStorage(img.dataUrl, img.nome, img.tipo)),
  );

  const uploaded: UploadedImage[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      uploaded.push(result.value);
    }
  }

  if (uploaded.length < images.length) {
    logger.warn("storage.partial_upload", {
      total: images.length,
      succeeded: uploaded.length,
      failed: images.length - uploaded.length,
    });
  }

  return uploaded;
}
