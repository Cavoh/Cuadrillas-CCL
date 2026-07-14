import { parse, differenceInMinutes, differenceInDays, isValid, startOfDay } from 'date-fns';

export function parseExcelDate(dateStr: string | number | null | undefined): Date | null {
  if (dateStr === null || dateStr === undefined || dateStr === '') return null;
  
  if (typeof dateStr === 'number') {
    // Excel numeric date (days since 1900)
    // Excel on Windows uses 1900 as base, but has a leap year bug for 1900.
    // 25569 is the offset for Unix epoch (1970-01-01)
    const date = new Date((dateStr - 25569) * 86400 * 1000);
    return isValid(date) ? date : null;
  }

  // Support dd/mm/yyyy and dd/mm/yyyy HH:mm
  const cleanStr = String(dateStr).trim();
  const formats = ['dd/MM/yyyy', 'dd/MM/yyyy HH:mm', 'd/M/yyyy', 'd/M/yyyy H:mm', 'yyyy-MM-dd', 'yyyy-MM-dd HH:mm'];
  
  for (const fmt of formats) {
    const parsed = parse(cleanStr, fmt, new Date());
    if (isValid(parsed)) return parsed;
  }

  // Try native Date parse as last resort
  const native = new Date(cleanStr);
  return isValid(native) ? native : null;
}

export function calculateMinutes(start: Date, end: Date): number {
  return Math.max(0, differenceInMinutes(end, start));
}

export function calculateDelayDays(actualDate: Date, scheduled: Date | null): number {
  if (!scheduled) return 0;
  return Math.max(0, differenceInDays(startOfDay(actualDate), startOfDay(scheduled)));
}
