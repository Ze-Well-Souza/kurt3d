/**
 * Computes the publishedAt value based on transition logic.
 * Pure function — testable without server dependencies.
 */
export function computePublishedAt(
  currentIsPublic: boolean,
  newIsPublic: boolean,
  currentPublishedAt: string | null | undefined,
  now: string,
): string | null {
  // If transitioning from private to public: set new publishedAt
  if (newIsPublic && !currentIsPublic) {
    return now;
  }
  // If staying public and no publishedAt (defensive): set now
  if (newIsPublic && !currentPublishedAt) {
    return now;
  }
  // If transitioning to private: keep existing publishedAt (history)
  // If staying private: keep existing publishedAt
  return currentPublishedAt ?? null;
}
