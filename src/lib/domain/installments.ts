function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateToIsoLocal(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseIsoDateLocal(dateIso: string): Date {
  const [year, month, day] = dateIso.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function formatIsoDatePtBr(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseIsoDateLocal(value).toLocaleDateString("pt-BR");
  }

  return new Date(value).toLocaleDateString("pt-BR");
}

export function todayIso(date = new Date()): string {
  return formatDateToIsoLocal(date);
}

export function addCalendarMonthsIso(dateIso: string, months: number): string {
  const date = parseIsoDateLocal(dateIso);
  const originalDay = date.getDate();

  date.setDate(1);
  date.setMonth(date.getMonth() + months);

  const lastDayOfTargetMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(originalDay, lastDayOfTargetMonth));

  return formatDateToIsoLocal(date);
}
