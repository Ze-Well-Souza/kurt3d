/**
 * Time conversion utilities for the portfolio calculator.
 *
 * Total minutes are stored in the database (tempoMin).
 * The UI exposes separate hours and minutes inputs for better UX.
 */

/**
 * Convert hours and minutes to total minutes.
 */
export function timeToMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

/**
 * Convert total minutes to hours and minutes.
 */
export function minutesToTime(totalMinutes: number): { hours: number; minutes: number } {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes };
}

/**
 * Format time for display: "Xh Ymin"
 * - "0min" when both are zero
 * - "30min" when only minutes
 * - "2h" when only hours
 * - "2h 30min" when both
 */
export function formatTimePreview(hours: number, minutes: number): string {
  if (hours === 0 && minutes === 0) return "0min";
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}
