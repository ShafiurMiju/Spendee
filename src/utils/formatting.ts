/**
 * Format a number as currency (BDT / ৳).
 */
export function formatCurrency(amount: number): string {
  return `৳${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a timestamp to a readable date string.
 */
export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a timestamp to 'YYYY-MM' for grouping.
 */
export function toMonthKey(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Get start/end timestamps for a given month.
 */
export function getMonthRange(
  year: number,
  month: number,
): { startDate: number; endDate: number } {
  const startDate = new Date(year, month, 1).getTime();
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
  return { startDate, endDate };
}

/**
 * Generate a random pastel color for charts.
 */
export function getColorForIndex(index: number): string {
  const palette = [
    '#FF6384',
    '#36A2EB',
    '#FFCE56',
    '#4BC0C0',
    '#9966FF',
    '#FF9F40',
    '#C9CBCF',
    '#FF6384',
    '#36A2EB',
    '#4BC0C0',
  ];
  return palette[index % palette.length];
}
