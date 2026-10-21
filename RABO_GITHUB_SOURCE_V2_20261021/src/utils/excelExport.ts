/**
 * ماژول استخراج داده‌ها به فایل اکسل رسمی (Excel Export Utility)
 * شرکت مهندسی رهنمون کیفیت رابو
 * 
 * تولید فایل‌های استاندارد XLSX سازگار با مایکروسافت اکسل، گوگل شیتس و لیبره‌آفیس
 * با پشتیبانی کامل از چینش راست‌به‌چپ (RTL)، انکودینگ فارسی، عرض خودکار ستون‌ها و استایل‌های گزارش
 */

import * as XLSX from 'xlsx';
import { Employee, Project } from '../types';
import { getTodayShamsi } from './jalali';

/**
 * دریافت تاریخ امروز شمسی به عنوان پسوند نام فایل
 */
const getShamsiFileSuffix = (): string => {
  try {
    const today = getTodayShamsi();
    return `${today.year}-${today.month}-${today.day}`;
  } catch {
    return '1405';
  }
};

/**
 * استخراج لیست پرسنل به فایل اکسل
 */
export const exportPersonnelToExcel = (
  personnelList: Employee[],
  mode: 'filtered' | 'full' = 'filtered',
  totalCount?: number
) => {
  const rows = personnelList.map((emp, index) => {
    // تبدیل پرمیشن‌ها به متن فارسی
    const perms: string[] = [];
    if (emp.permissions?.finance) perms.push('مالی');
    if (emp.permissions?.projects) perms.push('پروژه‌ها');
    if (emp.permissions?.crm) perms.push('CRM');
    if (emp.permissions?.letters) perms.push('مکاتبات');
    if (emp.permissions?.hr) perms.push('پرسنلی');

    return {
      'ردیف': index + 1,
      'کد پرسنلی': emp.id,
      'نام و نام خانوادگی': emp.name,
      'نام لاتین': emp.latinName || '-',
      'کد ملی': emp.nationalId || '-',
      'سمت سازمانی': emp.role,
      'واحد سازمانی': emp.unit,
      'رده شغلی': emp.positionLevel || 'کارشناس',
      'نام کاربری': emp.username || '-',
      'سطح مدیریت': emp.isManager ? 'مدیر ارشد' : 'پرسنل',
      'شماره تماس همراه': emp.mobile || '-',
      'تلفن منزل': emp.homePhone || '-',
      'نوع قرارداد': emp.contractType || 'قانون کار',
      'وضعیت اشتغال': emp.employmentStatus || 'شاغل / فعال',
      'تاریخ شروع همکاری': emp.serviceStartDate || emp.contractStartDate || (emp as any).hireDate || '-',
      'دسترسی‌های سامانه': perms.join(' | ') || 'کاربر پایه'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // تنظیم چینش راست به چپ برگه در اکسل
  if (!worksheet['!views']) worksheet['!views'] = [];
  worksheet['!views'].push({ RTL: true });

  // تنظیم عرض ستون‌ها متناسب با متون فارسی
  worksheet['!cols'] = [
    { wch: 6 },  // ردیف
    { wch: 14 }, // کد پرسنلی
    { wch: 24 }, // نام
    { wch: 18 }, // نام لاتین
    { wch: 14 }, // کد ملی
    { wch: 22 }, // سمت
    { wch: 18 }, // واحد
    { wch: 14 }, // رده
    { wch: 14 }, // نام کاربری
    { wch: 14 }, // سطح
    { wch: 16 }, // موبایل
    { wch: 14 }, // تلفن
    { wch: 16 }, // نوع قرارداد
    { wch: 16 }, // وضعیت
    { wch: 16 }, // تاریخ
    { wch: 28 }  // دسترسی‌ها
  ];

  const workbook = XLSX.utils.book_new();
  const sheetTitle = mode === 'filtered' ? 'پرسنل فیلترشده' : 'کل پرسنل رابو';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);

  const modeText = mode === 'filtered' ? 'Filtered' : 'Full';
  const fileName = `Rabo-Personnel-${modeText}-${getShamsiFileSuffix()}.xlsx`;

  XLSX.writeFile(workbook, fileName);
};

/**
 * استخراج لیست پروژه‌ها به فایل اکسل
 */
export const exportProjectsToExcel = (
  projectsList: Project[],
  mode: 'filtered' | 'full' = 'filtered'
) => {
  const rows = projectsList.map((project, index) => {
    return {
      'ردیف': index + 1,
      'کد سیستمی': project.id,
      'نام پروژه': project.name,
      'حوزه تخصصی': project.unit,
      'نام کارفرما': project.clientName || '-',
      'شماره تماس کارفرما': project.clientPhone || '-',
      'مدیر پروژه': project.projectManagerName || '-',
      'شماره قرارداد': (project as any).contractNo || project.permitNo || '-',
      'مبلغ کل قرارداد': project.totalContractAmount || '۰',
      'دریافتی تاکنون': project.receivedAmount || '۰',
      'درصد پیشرفت کار': `${project.progress || 0}٪`,
      'وضعیت اجرایی': project.status || 'در حال اقدام',
      'شماره پروانه / پرونده': project.permitNo || '-',
      'نشانی پروژه': project.address || '-',
      'شرایط پرداخت': (project as any).paymentTerms || '-',
      'شرح تعهدات': (project as any).scopeDescription || '-'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // فعال‌سازی حالت راست‌به‌چپ (RTL) برای اکسل
  if (!worksheet['!views']) worksheet['!views'] = [];
  worksheet['!views'].push({ RTL: true });

  // عرض ستون‌ها
  worksheet['!cols'] = [
    { wch: 6 },  // ردیف
    { wch: 18 }, // کد سیستمی
    { wch: 30 }, // نام پروژه
    { wch: 18 }, // حوزه تخصصی
    { wch: 22 }, // نام کارفرما
    { wch: 16 }, // شماره تماس
    { wch: 20 }, // مدیر پروژه
    { wch: 18 }, // شماره قرارداد
    { wch: 22 }, // مبلغ قرارداد
    { wch: 22 }, // دریافتی
    { wch: 14 }, // پیشرفت
    { wch: 24 }, // وضعیت
    { wch: 18 }, // شماره پروانه
    { wch: 35 }, // نشانی
    { wch: 35 }, // شرایط پرداخت
    { wch: 40 }  // شرح تعهدات
  ];

  const workbook = XLSX.utils.book_new();
  const sheetTitle = mode === 'filtered' ? 'پروژه‌های فیلترشده' : 'کل پروژه‌های رابو';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);

  const modeText = mode === 'filtered' ? 'Filtered' : 'Full';
  const fileName = `Rabo-Projects-${modeText}-${getShamsiFileSuffix()}.xlsx`;

  XLSX.writeFile(workbook, fileName);
};
