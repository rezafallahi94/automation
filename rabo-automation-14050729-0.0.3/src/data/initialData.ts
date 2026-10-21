import { 
  Project, 
  LetterTemplate, 
  Employee, 
  CrmLead, 
  ReceivedLetter, 
  SentLetter, 
  AttendanceRecord, 
  KpiIndicator, 
  KpiMonthlyEvaluation,
  ContactBookItem,
  EnergyLeadItem,
  ManagementSystemLeadItem,
  FULL_MANAGER_PERMISSIONS,
  DEFAULT_EMPLOYEE_PERMISSIONS
} from '../types';

// بانک پروژه‌های سازمان رابو (شروع تمیز - بدون داده‌های ماک)
export const initialProjects: Project[] = [];

// الگوهای استاندارد نامه‌های اداری
export const letterTemplates: LetterTemplate[] = [
  {
    id: 'TMP-1',
    title: 'پیش‌فاکتور رسمی مهندسی',
    subject: 'اعلام هزینه و شرح خدمات مهندسی',
    text: 'با احترام، پیرو مذاکرات صورت‌گرفته با کارفرمای محترم، شرح خدمات مهندسی به همراه برآورد مالی و شرایط پرداخت به پیوست ایفاد می‌گردد.'
  },
  {
    id: 'TMP-2',
    title: 'ابلاغیه رفع نقص فنی پروژه',
    subject: 'گزارش رفع ایرادات فنی کمیته ایمنی',
    text: 'پیرو بازدید کارشناسی صورت گرفته و بررسی مستندات پرونده، موارد نقص فنی ذیل جهت اصلاح سریع به اطلاع می‌رسد.'
  },
  {
    id: 'TMP-3',
    title: 'معرفی ناظر و کارشناس مقیم',
    subject: 'معرفی کارشناس ناظر جهت حضور در کارگاه',
    text: 'بدین‌وسیله کارشناس ارشد این مهندسین مشاور جهت نظارت عالیه و هماهنگی‌های کارگاهی به حضور معرفی می‌گردد.'
  }
];

// تنها دو حساب مدیر ارشد با دسترسی کامل به کل ماژول‌ها
export const initialPersonnel: Employee[] = [
  {
    id: 'EMP-01',
    name: 'مهندس رضا محمدی',
    latinName: 'Reza Mohammadi',
    fatherName: 'حسین',
    role: 'مدیر کل و ارشد رابو',
    unit: 'مدیریت ارشد',
    positionLevel: 'مدیر ارشد',
    isManager: true,
    username: 'rabo',
    password: '14011555706',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    birthDate: '۱۳۶۳/۰۴/۱۵',
    birthDateGregorian: '1984-07-06',
    idCertificate: '۴۵۲۹',
    gender: 'مرد',
    nationalId: '۰۰۷۱۸۲۹۳۴۱',
    homeAddress: 'تهران، سعادت‌آباد، خیابان سرو غربی، پلاک ۲۴',
    homePhone: '02122001122',
    mobile: '09121112233',
    postalCode: '1998765432',
    relativeContact: 'مهندس حسینی (برادر) - 09121112233 - سعادت‌آباد',
    relatives: [{ name: 'مهندس حسینی', phone: '02122001122', mobile: '09121112233' }],
    guaranteeType: 'چک صیادی',
    guaranteeDetails: 'چک تضمین شماره ۲۴۹۱۰۲۸۵ به مبلغ ۵۰۰ میلیون تومان',
    jobDescriptionDoc: 'JobDesc-SeniorManager-Rabo.pdf',
    contractType: 'قرارداد رسمی مدیریتی',
    serviceStartDate: '۱۳۹۵/۰۱/۱۵',
    contractStartDate: '۱۴۰۵/۰۱/۰۱',
    contractEndDate: '۱۴۰۵/۱۲/۲۹',
    serviceLocation: 'دفتر مرکزی رابو',
    baseDailySalary: '۴,۵۰۰,۰۰۰',
    baseMonthlySalary: '۱۳۵,۰۰۰,۰۰۰',
    housingAllowance: '۹,۰۰۰,۰۰۰',
    groceryAllowance: '۱۴,۰۰۰,۰۰۰',
    childAllowance: '۸,۵۰۰,۰۰۰',
    overtimeRateHourly: '۸۵۰,۰۰۰',
    holidayRateHourly: '۱,۱۵۰,۰۰۰',
    maxMonthlyLeaveDays: 2.5,
    commissionAmount: '۱۲۵,۰۰۰,۰۰۰',
    projectCommissionRate: 5,
    employmentStatus: 'فعال',
    insuranceType: 'تأمین اجتماعی',
    managerNotes: 'مدیریت ارشد اجرایی سازمان',
    kpis: [],
    permissions: FULL_MANAGER_PERMISSIONS
  },
  {
    id: 'EMP-02',
    name: 'مهندس علی احمدی',
    latinName: 'Ali Ahmadi',
    fatherName: 'محمد',
    role: 'مدیر ارشد رابو',
    unit: 'مدیریت ارشد',
    positionLevel: 'مدیر ارشد',
    isManager: true,
    username: 'ahmadi',
    password: '123',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
    birthDate: '۱۳۶۵/۰۸/۱۲',
    birthDateGregorian: '1986-11-03',
    idCertificate: '۱۸۴۰',
    gender: 'مرد',
    nationalId: '۰۰۸۲۹۴۰۱۹۲',
    homeAddress: 'تهران، میرداماد، میدان مادر، خیابان بهروز، پلاک ۱۲',
    homePhone: '02122223344',
    mobile: '09122223344',
    postalCode: '1918237465',
    relativeContact: 'دکتر احمدی (پدر) - 09122223344 - میرداماد',
    relatives: [{ name: 'دکتر احمدی', phone: '02122223344', mobile: '09122223344' }],
    guaranteeType: 'چک صیادی',
    guaranteeDetails: 'چک شماره ۵۹۲۱۰۳۸۲ به مبلغ ۵۰۰ میلیون تومان',
    jobDescriptionDoc: 'JobDesc-Director-Ahmadi.pdf',
    contractType: 'قرارداد رسمی مدیریتی',
    serviceStartDate: '۱۳۹۷/۰۲/۰۱',
    contractStartDate: '۱۴۰۵/۰۱/۰۱',
    contractEndDate: '۱۴۰۵/۱۲/۲۹',
    serviceLocation: 'دفتر مرکزی رابو',
    baseDailySalary: '۴,۳۰۰,۰۰۰',
    baseMonthlySalary: '۱۲۹,۰۰۰,۰۰۰',
    housingAllowance: '۹,۰۰۰,۰۰۰',
    groceryAllowance: '۱۴,۰۰۰,۰۰۰',
    childAllowance: '۰',
    overtimeRateHourly: '۸۰۰,۰۰۰',
    holidayRateHourly: '۱,۰۵۰,۰۰۰',
    maxMonthlyLeaveDays: 2.5,
    commissionAmount: '۱۸,۰۰۰,۰۰۰',
    projectCommissionRate: 4,
    employmentStatus: 'فعال',
    insuranceType: 'تأمین اجتماعی',
    kpis: [],
    permissions: FULL_MANAGER_PERMISSIONS
  }
];

// سرنخ‌های بازاریابی و پرونده‌های CRM (شروع خالی)
export const initialCrmLeads: CrmLead[] = [];

// کارتابل نامه‌های دریافتی (شروع خالی)
export const initialReceivedLetters: ReceivedLetter[] = [];

// کارتابل نامه‌های ارسالی و صادره (شروع خالی)
export const initialSentLetters: SentLetter[] = [];

// سوابق تردد، مأموریت و مرخصی پرسنل (شروع خالی)
export const initialAttendanceRecords: AttendanceRecord[] = [];

// شاخص‌های کلیدی عملکرد پرسنل (شروع خالی)
export const initialKpiIndicators: KpiIndicator[] = [];

// ارزیابی‌های ماهانه KPI (شروع خالی)
export const initialKpiMonthlyEvaluations: KpiMonthlyEvaluation[] = [];

// پایگاه جامع مخاطبان و دفتر تلفن افراد (شروع خالی)
export const initialContactBook: ContactBookItem[] = [];

// بانک تخصصی انرژی (شروع خالی)
export const initialEnergyLeads: EnergyLeadItem[] = [];

// بانک تخصصی سیستم‌های مدیریت و استانداردها (شروع خالی)
export const initialManagementLeads: ManagementSystemLeadItem[] = [];

// چک‌لیست کارهای روزانه پرسنل
export const initialDailyTodos: any[] = [];

// تقویم شخصی و رویدادهای کاربر
export const initialPersonalCalendarEvents: any[] = [];

// درخواست‌های مرخصی و مأموریت پرسنل
export const initialLeaveMissionRequests: any[] = [];

// سوابق و احکام حقوق و دستمزد
export const initialPayrollRecords: any[] = [];

// ماتریس آموزش و دوره‌های شایستگی
export const initialTrainingRecords: any[] = [];

