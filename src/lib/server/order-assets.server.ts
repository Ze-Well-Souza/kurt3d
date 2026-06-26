import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { buildOrderAssetReference, parseOrderAssetReference } from "../domain/order-asset";
import { logger } from "./logger.server";
import { getSupabaseAdminClient } from "./supabase.server";

const ORDER_ASSETS_BUCKET = "order-models";
const MAX_ORDER_ASSET_BYTES = 25 * 1024 * 1024;
const ALLOWED_ORDER_ASSET_EXTENSIONS = new Set(["stl", "3mf"]);

let bucketEnsured = false;

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^A-Za-z0-9._-]+/g, "-");
}

function getFileExtension(fileName: string) {
  const match = /\.([A-Za-z0-9]+)$/.exec(fileName);
  return match ? match[1].toLowerCase() : "";
}

async function ensureOrderAssetsBucket() {
  const client = getSupabaseAdminClient();
  if (bucketEnsured) return client;

  const { data: buckets, error: listError } = await client.storage.listBuckets();
  if (listError) {
    throw new Error(`order_assets_bucket_list_failed:${listError.message}`);
  }

  const exists = (buckets ?? []).some((bucket) => bucket.name === ORDER_ASSETS_BUCKET);
  if (!exists) {
    const { error: createError } = await client.storage.createBucket(ORDER_ASSETS_BUCKET, {
      public: false,
      fileSizeLimit: "25MB",
      allowedMimeTypes: [
        "model/stl",
        "application/sla",
        "application/octet-stream",
        "application/vnd.ms-package.3dmanufacturing-3dmodel+xml",
      ],
    });
    if (createError && !/already exists/i.test(createError.message)) {
      throw new Error(`order_assets_bucket_create_failed:${createError.message}`);
    }
  }

  bucketEnsured = true;
  return client;
}

export async function uploadOrderAssetToStorage(input: {
  fileName: string;
  contentType: string;
  dataBase64: string;
}) {
  const extension = getFileExtension(input.fileName);
  if (!ALLOWED_ORDER_ASSET_EXTENSIONS.has(extension)) {
    throw new Error("order_asset_invalid_extension");
  }

  const bytes = Buffer.from(input.dataBase64, "base64");
  if (!bytes.length || bytes.length > MAX_ORDER_ASSET_BYTES) {
    throw new Error("order_asset_invalid_size");
  }

  const client = await ensureOrderAssetsBucket();
  const path = `orders/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${sanitizeFileName(input.fileName)}`;
  const { error } = await client.storage
    .from(ORDER_ASSETS_BUCKET)
    .upload(path, bytes, {
      contentType: input.contentType || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    logger.error("orders.assets.upload_failed", {
      fileName: input.fileName,
      contentType: input.contentType,
      error,
    });
    throw new Error(`order_asset_upload_failed:${error.message}`);
  }

  return buildOrderAssetReference(ORDER_ASSETS_BUCKET, path);
}

export async function createOrderAssetSignedUrl(reference: string) {
  const parsed = parseOrderAssetReference(reference);
  if (!parsed) {
    throw new Error("order_asset_invalid_reference");
  }

  const client = await ensureOrderAssetsBucket();
  const { data, error } = await client.storage.from(parsed.bucket).createSignedUrl(parsed.path, 60 * 60);
  if (error || !data?.signedUrl) {
    logger.error("orders.assets.signed_url_failed", {
      reference,
      error,
    });
    throw new Error(`order_asset_signed_url_failed:${error?.message ?? "unknown"}`);
  }

  return data.signedUrl;
}
