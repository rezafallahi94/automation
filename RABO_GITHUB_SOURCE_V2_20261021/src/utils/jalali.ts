export const toFa = (n: number | string): string => {
  return String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
};

export const toEn = (str: string): string => {
  return String(str).replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]);
};

export const padFa = (n: number | string): string => {
  return toFa(String(n).padStart(2, '0'));
};

export const formatJalali = (y: number, m: number, d: number) => {
  return `${toFa(y)}/${padFa(m)}/${padFa(d)}`;
};

export const getTodayShamsi = () => {
  try {
    const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date()).split('/');
    return { year: parts[0], month: parts[1], day: parts[2] };
  } catch {
    return { year: '۱۴۰۵', month: '۰۷', day: '۰۴' };
  }
};

export const getExactShamsiTimestamp = () => {
  const p = getTodayShamsi();
  const time = new Date().toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  return `${p.year}/${p.month}/${p.day} ساعت ${time}`;
};

export const jalaliMonthLength = (y: number, m: number): number => {
  if (m <= 6) return 31;
  if (m <= 11) return 30;
  return [1403, 1408, 1412].includes(y) ? 30 : 29;
};

export const jalaliToGregorian = (jy: number, jm: number, jd: number): Date => {
  const leapYears = new Set([1403, 1408, 1412]);
  const monthLen = (y: number, m: number) => m <= 6 ? 31 : (m <= 11 ? 30 : (leapYears.has(y) ? 30 : 29));
  let days = 0;
  if (jy >= 1405) {
    for (let y = 1405; y < jy; y++) days += leapYears.has(y) ? 366 : 365;
  } else {
    for (let y = jy; y < 1405; y++) days -= leapYears.has(y) ? 366 : 365;
  }
  for (let m = 1; m < jm; m++) days += monthLen(jy, m);
  days += jd - 1;
  const base = new Date(2026, 2, 21);
  base.setDate(base.getDate() + days);
  return base;
};

export const jalaliStringToGregorian = (shamsiStr: string): string => {
  if (!shamsiStr) return '';
  const clean = toEn(shamsiStr).trim().replace(/-/g, '/');
  const parts = clean.split('/').map(p => parseInt(p, 10));
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    const jy = parts[0];
    const jm = parts[1];
    const jd = parts[2];
    
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let gy = (jy <= 979) ? 621 : 1600;
    let jy2 = (jy <= 979) ? 0 : 979;
    let days = (365 * (jy - jy2)) + (Math.floor((jy - jy2) / 33) * 8) + Math.floor(((jy - jy2) % 33 + 3) / 4) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
    let gy2 = gy + 400 * Math.floor(days / 146097);
    days %= 146097;
    if (days >= 36525) {
      days--;
      gy2 += 100 * Math.floor(days / 36524);
      days %= 36524;
      if (days >= 366) days++;
    }
    gy2 += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days >= 366) {
      days--;
      gy2 += Math.floor(days / 365);
      days %= 365;
    }
    let gm = 0;
    for (let i = 0; i < 13; i++) {
      const v = ((i === 0) ? 0 : ((i <= 2) ? g_d_m[i] : (g_d_m[i] + (((gy2 % 4 === 0 && gy2 % 100 !== 0) || (gy2 % 400 === 0)) ? 1 : 0))));
      if (days < v) {
        gm = i;
        break;
      }
    }
    if (gm === 0) gm = 12;
    const prevDays = (gm <= 2) ? g_d_m[gm - 1] : (g_d_m[gm - 1] + (((gy2 % 4 === 0 && gy2 % 100 !== 0) || (gy2 % 400 === 0)) ? 1 : 0));
    const gd = days - prevDays + 1;
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${gy2}-${pad(gm)}-${pad(gd)}`;
  }
  return '';
};

export const officialHolidays1405: Record<string, string> = {
  '1/1': 'آغاز نوروز و سال نو ۱۴۰۵',
  '1/2': 'عید نوروز',
  '1/3': 'عید نوروز',
  '1/4': 'عید نوروز',
  '1/12': 'روز جمهوری اسلامی ایران',
  '1/13': 'روز طبیعت (سیزده‌بدر)',
  '2/11': 'روز جهانی کار و کارگر',
  '3/6': 'عید سعید قربان',
  '3/14': 'رحلت امام خمینی (ره)',
  '3/15': 'قیام خونین ۱۵ خرداد و عید غدیر خم',
  '4/3': 'تاسوعای حسینی',
  '4/4': 'عاشورای حسینی',
  '5/13': 'اربعین حسینی',
  '5/21': 'رحلت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)',
  '5/22': 'شهادت امام رضا (ع)',
  '5/30': 'شهادت امام حسن عسکری (ع)',
  '6/8': 'میلاد رسول اکرم (ص) و امام جعفر صادق (ع)',
  '8/22': 'شهادت حضرت فاطمه زهرا (س)',
  '10/2': 'ولادت حضرت علی (ع) و روز پدر',
  '10/16': 'مبعث حضرت رسول اکرم (ص)',
  '11/4': 'ولادت حضرت قائم (عج) و نیمه شعبان',
  '11/22': 'پیروزی انقلاب اسلامی ایران',
  '12/9': 'شهادت حضرت علی (ع)',
  '12/19': 'عید سعید فطر',
  '12/20': 'تعطیل به مناسبت عید سعید فطر',
  '12/29': 'روز ملی شدن صنعت نفت ایران'
};

export const nationalOccasions1405: Record<string, string> = {
  '1/18': 'روز سلامتی و بهداشت جهانی',
  '1/25': 'روز بزرگداشت عطار نیشابوری',
  '2/1': 'روز بزرگداشت سعدی شیرازی',
  '2/3': 'روز بزرگداشت شیخ بهایی و روز ملی کارآفرینی',
  '2/12': 'روز معلم و استاد (شهادت استاد مطهری)',
  '2/25': 'روز بزرگداشت فردوسی و زبان فارسی',
  '2/28': 'روز بزرگداشت حکیم عمر خیام',
  '3/1': 'روز بهره‌وری و بهینه‌سازی مصرف',
  '3/20': 'روز جهانی صنایع دستی',
  '4/1': 'روز اصناف',
  '4/10': 'روز صنعت و معدن',
  '4/14': 'روز قلم',
  '5/8': 'روز بزرگداشت شیخ شهاب‌الدین سهروردی',
  '5/17': 'روز خبرنگار',
  '6/1': 'روز بزرگداشت ابن سینا و روز پزشک',
  '6/5': 'روز بزرگداشت زکریای رازی و روز داروساز',
  '6/13': 'روز تعاون',
  '6/27': 'روز شعر و ادب فارسی (بزرگداشت استاد شهریار)',
  '7/7': 'روز آتش‌نشانی و ایمنی (روز تخصصی مهندسی حریق رابو)',
  '7/8': 'روز بزرگداشت مولوی',
  '7/20': 'روز بزرگداشت حافظ شیرازی',
  '7/22': 'روز جهانی استاندارد (روز تخصصی سیستم‌های کیفیت)',
  '8/1': 'روز آمار و برنامه‌ریزی',
  '8/18': 'روز ملی کیفیت (روز بنیادین شرکت مهندسی رهنمون کیفیت رابو)',
  '8/24': 'روز کتاب و کتابخوانی',
  '9/5': 'روز بسیج مستضعفان',
  '9/16': 'روز دانشجو',
  '9/25': 'روز پژوهش و فناوری',
  '9/30': 'شب یلدا (طولانی‌ترین شب سال)',
  '10/20': 'سالروز شهادت میرزا تقی‌خان امیرکبیر',
  '11/14': 'روز ملی فناوری فضایی',
  '11/29': 'جشن سپندارمذگان (روز عشق و مهرورزی)',
  '12/5': 'روز مهندس (بزرگداشت خواجه نصیرالدین طوسی)',
  '12/15': 'روز درختکاری و هفته منابع طبیعی'
};

export const getCalendarDayDetails = (month: number, day: number) => {
  const key = `${month}/${day}`;
  const isHoliday = Boolean(officialHolidays1405[key]);
  const holidayTitle = officialHolidays1405[key];
  const occasionTitle = nationalOccasions1405[key];
  return {
    isHoliday,
    holidayTitle,
    occasionTitle
  };
};

export const IRAN_PROVINCES = [
  'تهران',
  'البرز',
  'اصفهان',
  'فارس',
  'خراسان رضوی',
  'آذربایجان شرقی',
  'خوزستان',
  'مازندران',
  'گیلان',
  'هرمزگان',
  'بوشهر',
  'کرمان',
  'یزد',
  'قزوین',
  'زنجان',
  'همدان',
  'مرکزی',
  'قم',
  'کردستان',
  'کرمانشاه',
  'لرستان',
  'آذربایجان غربی',
  'اردبیل',
  'گلستان',
  'سمنان',
  'سیستان و بلوچستان',
  'ایلام',
  'کهگیلویه و بویراحمد',
  'چهارمحال و بختیاری',
  'خراسان جنوبی',
  'خراسان شمالی'
];

export const calculateShamsiDateDiffDays = (startShamsi: string, endShamsi: string): number => {
  if (!startShamsi || !endShamsi) return 1;
  const gStart = new Date(jalaliStringToGregorian(startShamsi));
  const gEnd = new Date(jalaliStringToGregorian(endShamsi));
  if (isNaN(gStart.getTime()) || isNaN(gEnd.getTime())) return 1;
  const diffTime = gEnd.getTime() - gStart.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 1;
};

export const calculateTimeDurationHours = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const diff = endMin - startMin;
  if (diff <= 0) return 0;
  return Math.round((diff / 60) * 10) / 10;
};

// تبدیل اعداد به حروف فارسی برای فیش حقوقی و اسناد مالی رسمی
export const numberToPersianWords = (num: number): string => {
  if (num === 0) return 'صفر تومان';
  if (!num || isNaN(num)) return '';

  const ones = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const hundreds = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

  const convertThreeDigits = (n: number): string => {
    let result = '';
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    const t = Math.floor(remainder / 10);
    const o = remainder % 10;

    if (h > 0) result += hundreds[h];

    if (remainder >= 10 && remainder <= 19) {
      if (result) result += ' و ';
      result += teens[remainder - 10];
    } else {
      if (t > 0) {
        if (result) result += ' و ';
        result += tens[t];
      }
      if (o > 0) {
        if (result) result += ' و ';
        result += ones[o];
      }
    }
    return result;
  };

  const isNegative = num < 0;
  let absNum = Math.abs(Math.round(num));
  const parts: string[] = [];
  let scaleIndex = 0;

  while (absNum > 0) {
    const chunk = absNum % 1000;
    if (chunk > 0) {
      const chunkStr = convertThreeDigits(chunk);
      const scaleStr = scales[scaleIndex];
      parts.unshift(scaleStr ? `${chunkStr} ${scaleStr}` : chunkStr);
    }
    absNum = Math.floor(absNum / 1000);
    scaleIndex++;
  }

  const text = parts.join(' و ');
  return `${isNegative ? 'منفی ' : ''}${text} تومان`;
};

export const weekdayFa = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

export const generateRaboLetterNumber = (seqIndex: number, yearStr: string, monthStr: string) => {
  const rawYear = toEn(yearStr);
  const rawMonth = toEn(monthStr);
  const yearLastDigit = rawYear.slice(-1) || '5';
  const monthTwoDigits = rawMonth.padStart(2, '0');
  const indicatorTwoDigits = String(seqIndex).padStart(2, '0');
  return `R${yearLastDigit}${monthTwoDigits}-716${indicatorTwoDigits}`;
};
