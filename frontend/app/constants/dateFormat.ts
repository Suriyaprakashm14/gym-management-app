/**
 * Global UI date format: DD-MM-YYYY (e.g. 25-12-2024).
 * Use for all date inputs (DatePicker, RangePicker) and date display across the app.
 */
export const DATE_FORMAT = 'DD-MM-YYYY';

/**
 * Format a date string or Date for display as DD-MM-YYYY.
 */
export function formatDisplayDate(value: string | Date | undefined | null): string {
  if (value == null || value === '') return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear());
  return `${day}-${month}-${year}`;
}
