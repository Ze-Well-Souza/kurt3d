export const ORDER_ASSET_STORAGE_PREFIX = "storage:";

export function buildOrderAssetReference(bucket: string, path: string) {
  return `${ORDER_ASSET_STORAGE_PREFIX}${bucket}/${path}`;
}

export function isOrderAssetReference(value?: string | null) {
  return Boolean(value && value.startsWith(ORDER_ASSET_STORAGE_PREFIX));
}

export function parseOrderAssetReference(value?: string | null) {
  if (!isOrderAssetReference(value)) return null;
  const raw = value!.slice(ORDER_ASSET_STORAGE_PREFIX.length);
  const slashIndex = raw.indexOf("/");
  if (slashIndex <= 0 || slashIndex === raw.length - 1) return null;
  return {
    bucket: raw.slice(0, slashIndex),
    path: raw.slice(slashIndex + 1),
  };
}

export function isValidOrderProjectReference(value?: string | null) {
  if (!value) return true;
  if (isOrderAssetReference(value)) return parseOrderAssetReference(value) !== null;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function getOrderAssetFileName(reference?: string | null) {
  const parsed = parseOrderAssetReference(reference);
  if (!parsed) return null;
  const parts = parsed.path.split("/");
  return parts[parts.length - 1] ?? null;
}
