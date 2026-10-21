/**
 * توابع کمکی برای جداسازی سه‌رقم‌سه‌رقم اعداد و فرمت ریال/تومان با پشتیبانی کامل از اعداد ممیزدار و اعشاری
 * شرکت مهندسی رابو
 */

/**
 * تبدیل ارقام فارسی و جداکننده‌های اعشاری به عدد استاندارد انگلیسی
 */
export const normalizeDecimalNumber = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  return String(val)
    .replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
    .replace(/٫/g, '.') // ممیز فارسی به نقطه اعشاری
    .replace(/\//g, '.') // اسلش به نقطه اعشاری
    .replace(/,/g, '') // حذف کامای هزارگان
    .trim();
};

/**
 * فرمت اعداد با کامای سه‌رقمی و حفظ بخش اعشاری/ممیزی
 */
export const formatNumberWithCommas = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '۰';
  
  const rawStr = normalizeDecimalNumber(val);
  if (!rawStr) return '۰';

  const parts = rawStr.split('.');
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? parts[1] : undefined;

  const num = parseFloat(integerPart);
  if (isNaN(num)) return String(val);

  const formattedInt = num.toLocaleString('fa-IR');
  
  if (decimalPart !== undefined) {
    // تبدیل ارقام اعشار به فارسی
    const faDecimal = decimalPart.replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
    return `${formattedInt}٫${faDecimal}`;
  }

  return formattedInt;
};

export const formatPriceToman = (val: string | number | undefined | null): string => {
  if (!val) return '۰ تومان';
  const formatted = formatNumberWithCommas(val);
  return `${formatted} تومان`;
};

export const formatPriceRial = (val: string | number | undefined | null): string => {
  if (!val) return '۰ ریال';
  const formatted = formatNumberWithCommas(val);
  return `${formatted} ریال`;
};
