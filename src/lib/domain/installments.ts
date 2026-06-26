export function todayIso(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function addCalendarMonthsIso(dateIso: string, months: number): string {
  const date = new Date(`${dateIso}T00:00:00`);
  const originalDay = date.getDate();

  date.setDate(1);
  date.setMonth(date.getMonth() + months);

  const lastDayOfTargetMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(originalDay, lastDayOfTargetMonth));

  return date.toISOString().slice(0, 10);
}
