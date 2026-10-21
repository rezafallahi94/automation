// Number formatting utilities with 3-digit comma separation and floating-point decimal support
import { toFa } from './jalali';

/**
 * Format a number or numeric string with 3-digit comma separators and optional decimal places
 * Example: 12500000 -> "12,500,000", 12.5 -> "12.5", "12500.75" -> "12,500.75"
 */
export function formatPriceNumber(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '۰';
  
  // Normalize string and convert Persian digits to English
  const str = String(value)
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/[٫/]/g, '.');

  // Split integer and decimal parts
  const parts = str.split('.');
  const integerPart = parts[0].replace(/[^0-9-]/g, '');
  if (!integerPart && parts.length === 1) return '۰';

  const formattedInt = integerPart ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0';
  if (parts.length > 1) {
    const decimalPart = parts[1].replace(/[^0-9]/g, '');
    return `${formattedInt}.${decimalPart}`;
  }
  return formattedInt;
}

/**
 * Format a number with Persian digits, 3-digit commas, and decimal separator
 * Example: 12500000 -> "۱۲,۵۰۰,۰۰۰", 12.5 -> "۱۲.۵"
 */
export function formatPriceFa(value: number | string | undefined | null): string {
  const formatted = formatPriceNumber(value);
  return toFa(formatted);
}

/**
 * Clean a string into raw floating point number
 * Example: "12,500.75" -> 12500.75, "۱۲/۵" -> 12.5
 */
export function parseRawNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;

  const enStr = String(value)
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/[٫/]/g, '.')
    .replace(/[^0-9.-]/g, '');

  const parsed = parseFloat(enStr);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Input change helper for numeric and monetary fields that allows typing decimals (dot/slash)
 * and formats commas without stripping decimal fractions.
 */
export function handleMoneyInputChange(rawValue: string): string {
  if (!rawValue) return '';
  const normalized = rawValue
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/[٫/]/g, '.');

  const parts = normalized.split('.');
  const intClean = parts[0].replace(/[^0-9-]/g, '');
  const formattedInt = intClean.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (parts.length > 1) {
    const decClean = parts[1].replace(/[^0-9]/g, '');
    return `${formattedInt}.${decClean}`;
  }
  return formattedInt;
}

