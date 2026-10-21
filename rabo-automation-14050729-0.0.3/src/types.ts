export interface ProjectExpense {
  id: string;
  title: string; // شرح هزینه (مثلا: اسنپ رفت و برگشت به کارگاه، خرید سنسور، پذیرایی جلسه)
  amount: number; // مبلغ (تومان)
  category: 'اسنپ و ایاب‌ذهاب' | 'پذیرایی و جلسات' | 'خرید قطعات و ملزومات' | 'کارشناسی و مأموریت' | 'سایر';
  date: string;
  employeeName: string; // کارمندی که خرج کرده
  receiptImage?: string;
}

export interface ProjectTaskItem {
  id: string;
  title: string;
  assigneeName: string;
  assigneeId?: string;
  dueDate: string;
  status: 'انجام شده' | 'در حال انجام' | 'در انتظار اقدام';
  notes?: string;
}

export interface ProjectDocumentItem {
  id: string;
  title: string;
  category: 'نقشه و طراحی' | 'تاییدیه و گواهینامه' | 'قرارداد' | 'صورتجلسه' | 'گزارش ممیزی';
  fileName: string;
  uploadDate: string;
  fileSize?: string;
}

export interface ProjectCallItem {
  id: string;
  date: string;
  contactPerson: string;
  phone?: string;
  summary: string;
  result: string;
}

export interface ProjectMilestoneItem {
  id: string;
  title: string;
  date: string;
  completed: boolean;
  description: string;
}

export interface Project {
  id: string; // کد منحصر به فرد پروژه
  name: string;
  unit: 'مهندسی حریق' | 'انرژی' | 'سیستم مدیریت' | string;
  clientName?: string;
  clientPhone?: string;
  address?: string;
  location?: {
    lat: number;
    lng: number;
    addressDescription?: string;
  };
  status?: string;
  progress?: number;
  permitNo?: string;
  contractDate?: string;
  projectManagerId?: string;
  projectManagerName?: string;
  teamMembers?: string[]; // کارمندان و منابع انسانی متصل به این پروژه
  totalContractAmount?: string; // مبلغ کل قرارداد
  receivedAmount?: string; // مبالغ دریافتی از کارفرما
  expenses?: ProjectExpense[]; // هزینه‌کردهای پرسنل برای پروژه (اسنپ، تنخواه و...)
  inflows?: ProjectInflowItem[]; // صورت‌وضعیت‌ها و مبالغ دریافتی از کارفرما
  tasks?: ProjectTaskItem[]; // وظایف و تسک‌های پروژه
  documents?: ProjectDocumentItem[]; // مدارک و نقشه‌ها
  calls?: ProjectCallItem[]; // تماس‌ها و جلسات با کارفرما
  milestones?: ProjectMilestoneItem[]; // مسیر رشد و تایم‌لاین پروژه (تنه درخت)
  isCompleted?: boolean; // وضعیت اختتامیه پروژه
  completedAt?: string; // تاریخ اتمام و اختتامیه رسمی پروژه
  completionNotes?: string; // گزارش اختتامیه و جمع‌بندی نهایی
}

export interface ProjectInflowItem {
  id: string;
  title: string; // مثلاً صورت‌وضعیت شماره ۱ / قسط دوم قرارداد
  invoiceNo?: string;
  billedAmount: number; // مبلغ صورت‌وضعیت صادرشده (تومان)
  receivedAmount: number; // مبلغ واریزی کارفرما (تومان)
  date: string;
  paymentMethod?: string; // حواله پایا / چک صیادی / واریز شبا
  receiptFileName?: string;
  receiptDataUrl?: string;
  status: 'وصول شده' | 'در انتظار پرداخت کارفرما' | 'بخشی وصول شده';
  notes?: string;
  registeredBy?: string;
}

export interface LetterTemplate {
  id: string;
  title: string;
  subject: string;
  text: string;
}

export interface KPI {
  id: number;
  title: string;
  target: string;
  actual: string;
  score: number;
}

export interface EmployeePermissions {
  // دسترسی‌های ماژول‌های اصلی
  dashboard?: boolean;
  letters?: boolean;
  crm?: boolean;
  finance?: boolean;
  hr?: boolean;
  devOpportunities?: boolean;
  projects?: boolean;
  tasks?: boolean;

  // دسترسی‌های دانه‌دانه زیرماژول‌ها (Granular Sub-Permissions)
  dashboard_personal?: boolean;      // کارتابل شخصی پرسنل
  dashboard_executive?: boolean;     // گزارش‌های مدیریتی BI
  letters_inbox?: boolean;           // نامه‌های دریافتی (وارده)
  letters_outbox_create?: boolean;   // ایجاد و صدور نامه رسمی
  letters_archive?: boolean;         // بایگانی و پیگیری ارسال نامه‌ها
  crm_fire?: boolean;                // بانک پرونده‌های مهندسی حریق
  crm_energy?: boolean;              // بانک تخصصی بهینه‌سازی انرژی
  crm_management?: boolean;          // بانک سیستم‌های مدیریت ISO
  crm_customers?: boolean;           // مشتریان قطعی و پرونده‌های جاری
  crm_followups?: boolean;           // کارتابل پیگیری‌های موعد امروز
  projects_view?: boolean;           // مشاهده و کارتابل پروژه‌ها
  projects_manage?: boolean;         // ثبت، ویرایش و مدیریت پروژه‌ها
  tasks_board?: boolean;             // وظایف، ارجاعات و تسک‌ها
  tasks_chat?: boolean;              // پیام‌رسان و چت تیمی
  finance_petty_cash?: boolean;      // تنخواه‌گردان و ثبت هزینه
  finance_audit?: boolean;           // رسیدگی و بستن اسناد مالی
  hr_employees?: boolean;            // پرونده پرسنلی و استخدام
  hr_attendance?: boolean;           // تقویم تردد، مرخصی و مأموریت
  hr_payroll?: boolean;              // احکام کارگزینی، حقوق و دستمزد
  hr_kpi?: boolean;                  // ارزیابی شاخص‌های عملکرد KPI
  hr_training?: boolean;             // دوره‌ها و گواهینامه‌های آموزشی
}

export const EMPTY_EMPLOYEE_PERMISSIONS: EmployeePermissions = {
  dashboard: false,
  letters: false,
  crm: false,
  finance: false,
  hr: false,
  devOpportunities: false,
  projects: false,
  tasks: false,
  dashboard_personal: false,
  dashboard_executive: false,
  letters_inbox: false,
  letters_outbox_create: false,
  letters_archive: false,
  crm_fire: false,
  crm_energy: false,
  crm_management: false,
  crm_customers: false,
  crm_followups: false,
  projects_view: false,
  projects_manage: false,
  tasks_board: false,
  tasks_chat: false,
  finance_petty_cash: false,
  finance_audit: false,
  hr_employees: false,
  hr_attendance: false,
  hr_payroll: false,
  hr_kpi: false,
  hr_training: false
};

export const FULL_MANAGER_PERMISSIONS: EmployeePermissions = {
  dashboard: true,
  letters: true,
  crm: true,
  finance: true,
  hr: true,
  devOpportunities: true,
  projects: true,
  tasks: true,
  dashboard_personal: true,
  dashboard_executive: true,
  letters_inbox: true,
  letters_outbox_create: true,
  letters_archive: true,
  crm_fire: true,
  crm_energy: true,
  crm_management: true,
  crm_customers: true,
  crm_followups: true,
  projects_view: true,
  projects_manage: true,
  tasks_board: true,
  tasks_chat: true,
  finance_petty_cash: true,
  finance_audit: true,
  hr_employees: true,
  hr_attendance: true,
  hr_payroll: true,
  hr_kpi: true,
  hr_training: true
};

export const DEFAULT_EMPLOYEE_PERMISSIONS: EmployeePermissions = {
  ...EMPTY_EMPLOYEE_PERMISSIONS,
  dashboard: true,
  dashboard_personal: true,
  tasks: true,
  tasks_board: true,
  hr_attendance: true
};

export interface RelativeContact {
  name: string;
  phone: string;
  mobile: string;
  relation?: string;
}

export interface EmployeeMapLocation {
  lat: number;
  lng: number;
  addressDescription?: string;
}

export type NezamGrade = 'پایه سه' | 'پایه دو' | 'پایه یک' | 'پایه ارشد';

export interface NezamQualificationItem {
  enabled: boolean;
  grade: NezamGrade;
}

export interface NezamMohandesiInfo {
  licenseNo?: string;        // ۱. شماره پروانه نظام مهندسی
  membershipNo?: string;     // ۲. شماره عضویت نظام مهندسی
  grade?: string;            // پایه اصلی
  branch?: string;           // رشته مهندسی (عمران، معماری، مکانیک، برق و...)
  validUntil?: string;       // تاریخ اعتبار پروانه
  supervision?: NezamQualificationItem; // صلاحیت نظارت
  design?: NezamQualificationItem;      // صلاحیت طراحی
  execution?: NezamQualificationItem;   // صلاحیت اجرا
}

export interface NezamLicenseRecord {
  id: string;
  discipline: string; // رشته: عمران، معماری، مکانیک، برق، نقشه‌برداری، شهرسازی، ترافیک
  grade: string; // پایه: ۱، ۲، ۳، ارشد
  licenseNo: string; // شماره پروانه
  qualification: string; // صلاحیت: طراحی، نظارت، اجرا، بازرسی
  validUntil?: string; // تاریخ اعتبار پروانه
  documentUrl?: string; // فایل پیوست پروانه اشتغال
  documentName?: string;
}

export interface Employee {
  id: string;
  name: string;
  latinName?: string;
  fatherName?: string;
  motherName?: string; // نام و نام خانوادگی مادر
  motherFullName?: string; // نام و نام خانوادگی مادر
  role: string;
  unit: string;
  positionLevel: string;
  isManager: boolean;
  username: string;
  password: string;
  avatar: string;
  birthDate: string;
  birthDateGregorian?: string;
  birthPlace?: string;
  idCertificate: string;
  birthCertificateSerial?: string;
  gender: string;
  nationalId: string;
  maritalStatus?: string;
  childrenCount?: string;
  dependentsCount?: string;
  militaryStatus?: string;
  militaryCardNumber?: string;
  militaryEndDate?: string;
  religion?: string;
  nationality?: string;
  homeAddress: string;
  homePhone?: string;
  mobile?: string;
  emergencyMobile?: string;
  postalCode?: string;
  province?: string;
  city?: string;
  municipalityZone?: string;
  mapLocation?: EmployeeMapLocation;
  educationLevel?: string;
  educationField?: string;
  universityName?: string;
  graduationYear?: string;
  gpa?: string;
  nezamMohandesiLicense?: NezamMohandesiInfo;
  nezamLicenses?: NezamLicenseRecord[];
  insuranceNumber?: string;
  insuranceHistoryMonths?: number;
  relativeContact?: string;
  relatives?: RelativeContact[];
  guaranteeType?: string;
  guaranteeDetails?: string;
  guaranteeAmount?: string;
  guaranteeSerial?: string;
  guarantorName?: string;
  guarantorNationalId?: string;
  guarantorPhone?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankCardNo?: string;
  bankSheba?: string;
  jobDescriptionDoc?: string;
  contractType?: string;
  serviceStartDate?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  serviceLocation?: string;
  baseDailySalary: string;
  baseMonthlySalary: string;
  housingAllowance: string;
  groceryAllowance: string;
  childAllowance: string;
  specialAllowance?: string;
  overtimeRateHourly?: string;
  holidayRateHourly?: string;
  projectCommissionRate?: number;
  maxMonthlyLeaveDays?: number;
  commissionAmount?: string;
  currentAdvance?: number;
  employmentStatus?: string;
  insuranceType?: string;
  managerNotes?: string;
  additionalNotes?: string;
  managerId?: string | null;
  documents?: Record<string, any>;
  documentsChecklist?: Record<string, boolean>;
  guaranteesChecklist?: Record<string, boolean>; // چک‌لیست تضامین و مدارک استخدام
  profileCompletionPercent?: number; // درصد محاسبه‌شده تکمیل پرونده (۰ تا ۱۰۰)
  electronicSignatureDoc?: string; // نمونه امضای الکترونیک و گواهی امضا
  insuranceHistoryDoc?: string; // سوابق پرداخت بیمه تامین اجتماعی
  trainingCertificatesDoc?: string; // گواهینامه‌ها و مدارک آموزشی
  otherDocumentsDoc?: string; // سایر مدارک و ضمائم
  idCardScan?: string; // تصویر کارت ملی
  birthCertScan?: string; // تصویر شناسنامه
  degreeDoc?: string; // مدرک تحصیلی
  militaryCardDoc?: string; // کارت پایان خدمت
  signedContractDoc?: string; // نسخه امضاشده قرارداد کار
  kpis?: KPI[];
  permissions?: EmployeePermissions;
}

export interface CrmFollowUp {
  id: number;
  date: string;
  user: string;
  note: string;
  result: string;
}

export interface CrmMeetingInfo {
  attendeeManagerId: string;
  attendeeManagerName: string;
  managerId?: string;
  managerName?: string;
  date: string;
  time: string;
  location: string;
  locationCoordinates?: {
    lat: number;
    lng: number;
    addressDescription?: string;
  };
  briefingNotes?: string;
}

export interface SalesOpportunities {
  consulting: boolean; // مشاوره
  design: boolean; // طراحی
  productSupply: boolean; // تامین محصول
  execution?: boolean; // اجرا و نصب
  fireApproval?: boolean; // اخذ تاییدیه آتش‌نشانی
}

export interface CrmLead {
  id: string;
  urbanCode: string;
  manualFileNo?: string; // شماره پرونده دستی / بایگانی فیزیکی
  unit: string;
  ownerName: string;
  ownerPhone: string;
  gender?: 'آقا' | 'خانم' | 'حقوقی/شرکت'; // جنسیت مخاطب جهت بانک شماره‌ها و خطاب رسمی
  rejectionReason?: string; // علت عدم عقد قرارداد یا مشکل پرونده جهت تحلیل آماری
  referredToManager?: boolean; // ارجاع به مدیر ارشد جهت تایید و عقد قرارداد
  referredAt?: string;
  referredNote?: string;
  contactRole?: string; // نقش مخاطب (مالک، سازنده، وکیل، مهندس ناظر)
  secondaryPhone?: string; // تلفن دوم یا دفتر
  lawyerName: string;
  lawyerPhone: string;
  address: string;
  municipalityZone?: string; // منطقه شهرداری (مثال: منطقه ۲)
  cadastralNo?: string; // پلاک ثبتی
  buildingUsage: string;
  floorsAbove: string;
  floorsBelow: string;
  builtArea?: string; // متراژ تقریبی زیربنا (مترمربع)
  potentialServices: string[];
  salesOpportunities?: SalesOpportunities; // فرصت فروش (مشاوره، طراحی، تامین محصول، ...)
  salesExpertNotes?: string; // توضیحات کارشناس فروش
  contactDate?: string; // تاریخ تماس
  contactTime?: string; // ساعت تماس
  lastCallResult?: string; // نتیجه تماس کارشناس فروش
  constructionStage?: string; // مرحله ساختمانی (دستور نقشه، اسکلت، سفت‌کاری، نازک‌کاری و...)
  clientDecisionMaker?: string; // شخص تصمیم‌گیرنده
  leadTemperature?: 'داغ' | 'گرم' | 'متوسط' | 'سرد'; // اولویت پیگیری
  estimatedBudget?: string; // برآورد مالی یا ارزش قرارداد
  locationCoordinates?: {
    lat: number;
    lng: number;
    addressDescription?: string;
  };
  status: string;
  nextFollowUpDate: string;
  nextFollowUpTime: string;
  assignedMarketerId: string;
  assignedMarketerName: string;
  assignedExpertId?: string;
  assignedExpertName?: string;
  assignedTo?: string;
  managerId?: string;
  followUps?: CrmFollowUp[];
  followUpHistory: CrmFollowUp[];
  meetingInfo: CrmMeetingInfo | null;
}

// دفتر تلفن و پایگاه جامع مخاطبان و مشتریان
export interface ContactBookItem {
  id: string;
  fullName: string; // نام و نام خانوادگی
  phone: string; // شماره تماس اصلی
  secondaryPhone?: string; // شماره دوم یا ثابت
  nationalId?: string; // شماره ملی
  projectType: 'مهندسی حریق' | 'انرژی' | 'سیستم مدیریت' | 'چندگانه'; // نوع پروژه
  acquisitionChannel: string; // نحوه آشنایی (معرف، شهرداری، بازاریابی تلفنی، وبسایت، نمایشگاه صنعت ساختمان و...)
  associatedProjects: string[]; // در کدوم پروژه‌ها اون فرد حضور داشته
  role: string; // نقش (مالک، سازنده، وکیل، مدیر پروژه، کارشناس انرژی)
  company?: string; // نام شرکت یا سازمان
  notes?: string;
  registeredDate?: string;
}

// بانک اطلاعات تخصصی انرژی
export interface EnergyLeadItem {
  id: string;
  code: string; // کد پرونده انرژی
  manualFileNo?: string; // پرونده دستی / زونکن
  facilityName: string; // نام مجتمع / کارخانه / ساختمان
  clientName: string; // نام کارفرما / مدیر
  clientPhone: string; // شماره تماس
  nationalId?: string; // شناسه یا کد ملی
  facilityType: 'تجاری - اداری' | 'صنعتی - تولیدی' | 'بیمارستانی' | 'مسکونی بلندمرتبه' | 'کشاورزی';
  address: string;
  locationCoordinates?: {
    lat: number;
    lng: number;
    addressDescription?: string;
  };
  energyServiceType: 'ممیزی تفصیلی انرژی' | 'استقرار سیستم مدیریت انرژی (ISO 50001)' | 'نیروگاه و پنل‌های خورشیدی (سولار)' | 'ترکیبی';
  solarCapacityKw?: string; // ظرفیت پنل خورشیدی (کیلووات)
  contractDemandKw?: string; // دیماند برق مصرفی
  averageMonthlyBill?: string; // متوسط قبض ماهانه انرژی (تومان)
  estimatedEnergySaving?: string; // پتانسیل صرفه‌جویی برآوردی (درصد یا مبلغ)
  criticalEquipment?: string[]; // تجهیزات پرمصرف (چیلر، بویلر، موتورخانه، الکتروموتورها)
  salesExpertNotes?: string; // توضیحات کارشناس فروش (با ویس)
  contactDate?: string; // تاریخ تماس
  lastCallResult?: string; // نتیجه آخرین تماس
  nextFollowUpDate: string; // تاریخ پیگیری
  nextFollowUpTime?: string;
  leadTemperature?: 'داغ' | 'گرم' | 'متوسط' | 'سرد';
  status: string;
  assignedExpertId: string;
  assignedExpertName: string;
  gender?: 'آقا' | 'خانم' | 'حقوقی/شرکت';
  rejectionReason?: string;
  referredToManager?: boolean;
  referredAt?: string;
  referredNote?: string;
  followUpHistory: CrmFollowUp[];
}

// بانک اطلاعات تخصصی سیستم‌های مدیریت ISO
export interface ManagementSystemLeadItem {
  id: string;
  code: string; // کد پرونده ایزو
  manualFileNo?: string; // پرونده دستی / زونکن
  companyName: string; // نام شرکت یا سازمان متقاضی
  contactPerson: string; // نام مخاطب / نماینده مدیریت
  contactPhone: string; // شماره تماس
  gender?: 'آقا' | 'خانم' | 'حقوقی/شرکت';
  rejectionReason?: string;
  referredToManager?: boolean;
  referredAt?: string;
  referredNote?: string;
  nationalId?: string; // شناسه ملی شرکت یا کد ملی نماینده
  industryField: string; // حوزه فعالیت / صنعت (غذایی، ساختمانی، دارویی، IT، نفت و گاز...)
  address: string;
  locationCoordinates?: {
    lat: number;
    lng: number;
    addressDescription?: string;
  };
  requestedStandards: string[]; // ایزوهای درخواستی (ISO 9001, ISO 14001, ISO 45001, IMS, ISO 22000, ISO 27001, ...)
  serviceScope: 'مشاوره و استقرار کامل' | 'ممیزی داخلی و گپ آنالیز' | 'ممیزی صدور گواهینامه CB' | 'آموزش و تمدید سالانه';
  employeeCount?: string; // تعداد پرسنل و فرآیندها
  certificationBodyPreference?: string; // مرجع صدور مدنظر (CB)
  salesExpertNotes?: string; // توضیحات کارشناس فروش (با ویس)
  contactDate?: string;
  lastCallResult?: string;
  nextFollowUpDate: string;
  nextFollowUpTime?: string;
  leadTemperature?: 'داغ' | 'گرم' | 'متوسط' | 'سرد';
  status: string;
  assignedExpertId: string;
  assignedExpertName: string;
  followUpHistory: CrmFollowUp[];
}

export interface TimelineItem {
  id: number;
  title: string;
  user: string;
  time: string;
  note?: string;
}

export interface ReceivedLetter {
  id: string;
  senderOrg: string;
  subject: string;
  receiptMethod: string;
  issueDate: string;
  dueDate?: string; // موعد سررسید و مهلت اقدام اداری
  registeredAt: string;
  unit: string;
  projectId: string;
  projectName: string;
  managerId: string;
  managerName: string;
  expertId: string;
  expertName: string;
  scanFileName?: string;
  attachmentFileName?: string | null;
  description: string;
  timeline: TimelineItem[];
}

export interface PriceItem {
  id: number;
  service: string;
  fee: string;
}

export interface TranscriptItem {
  id: number;
  name: string;
  position: string;
  reason: string;
}

export interface SentLetter {
  id: string;
  recipientOrg: string;
  recipientPerson: string;
  subject: string;
  date: string;
  dueDate?: string; // موعد پیگیری یا سررسید نامه صادره
  category?: string; // دسته‌بندی موضوعی/واحدی در بایگانی
  hasAttachment: string;
  attachmentFileName?: string | null;
  attachmentDataUrl?: string | null;
  unit: string;
  projectId: string;
  projectName: string;
  creatorName: string;
  creatorId: string;
  approverName: string;
  signerName: string;
  status: string;
  dispatchMethod?: string;
  deliveredTo?: string;
  trackingCode?: string;
  signedLetterScan?: string | null;
  signedLetterDataUrl?: string | null;
  deliveryReceiptScan?: string | null;
  deliveryReceiptDataUrl?: string | null;
  bodyText: string;
  hasPriceTable?: boolean;
  priceItems?: PriceItem[];
  priceConditions?: string;
  transcripts?: TranscriptItem[];
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  type: string;
  startTime: string;
  endTime: string;
  hoursWorked: number;
  overtimeHours: number;
  projectId?: string;
  projectName?: string;
  description: string;
  status: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  managerId: string;
  managerName?: string;
  approvedAt?: string;
  approvedBy?: string;
  missionLocation?: string;
  meetingType?: string;
  attachmentName?: string | null;
  commissionAmount?: number;
  // Enhanced Leave & Mission Workflow Fields
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  missionProvince?: string; // استان محل مأموریت (۳۱ استان)
  missionCity?: string;     // شهر یا کارگاه
  leaveSubstituteId?: string; // همکار جایگزین
  leaveSubstituteName?: string;
  rejectionReason?: string; // دلیل رد توسط مدیر
  missionAllowance?: number; // حق مأموریت
}

export interface DailyTodoItem {
  id: string;
  employeeId: string;
  employeeName?: string;
  date: string; // e.g. "۱۴۰۵/۰۷/۱۵"
  text: string;
  completed: boolean;
  priority?: 'عادی' | 'مهم' | 'فوری';
  createdAt: string;
}

export interface KpiIndicator {
  id: string;
  employeeId: string;
  title: string;
  category: 'اهداف کمی و پروژه‌ای (OKRs)' | 'کیفیت فنی و مهندسی' | 'نظم سازمانی و تعامل تیمی' | 'فنی و تخصصی' | 'فروش و بازاریابی' | 'انضباط و کار تیمی' | 'سرعت و دقت';
  target: string;
  weight: number; // percentage 1-100
  unit?: string;
  createdAt: string;
}

export interface KpiEvaluationItem {
  indicatorId: string;
  indicatorTitle: string;
  category: string;
  weight: number;
  target: string;
  actual: string;
  score: number; // 0 to 100
  weightedScore: number;
}

export interface KpiMonthlyEvaluation {
  id: string;
  employeeId: string;
  employeeName: string;
  year: number;
  month: number;
  periodStr: string;
  evaluatedBy: string;
  evaluatedAt: string;
  items: KpiEvaluationItem[];
  totalScore: number; // 0 to 100
  grade: 'A+ (سرآمد)' | 'A (عالی)' | 'B (بسیار خوب)' | 'C (متوسط)' | 'D (نیازمند بهبود)' | 'عالی (A)' | 'بسیار خوب (B)' | 'متوسط (C)' | 'نیازمند بهبود (D)';
  managerFeedback: string;
  keyStrengths?: string;
  improvementAreas?: string;
}

export interface KpiRecord {
  id: number;
  employeeId: string;
  month: string;
  title: string;
  score: number;
}

export interface TrainingRecord {
  id: number;
  employeeId: string;
  course: string;
  status: string;
  result: string;
  certificateName?: string;
  nextReview?: string;
}

export interface CompetencySkillItem {
  id: string;
  title: string;
  category: 'مهندسی و طراحی حریق' | 'انرژی و بهینه‌سازی' | 'سیستم‌های مدیریت ISO' | 'مهارت‌های نرم و مدیریتی';
  description?: string;
  requiredLevel: 1 | 2 | 3 | 4; // ۱-مبتدی، ۲-متوسط، ۳-مسلط، ۴-ارشد/مدرس
}

export interface EmployeeCompetencyRating {
  skillId: string;
  currentLevel: 1 | 2 | 3 | 4;
  lastAssessedDate?: string;
  assessedBy?: string;
}

export interface AdvancedTrainingCourse {
  id: string;
  employeeId: string;
  employeeName?: string;
  courseTitle: string;
  category: string;
  provider: string; // موسسه یا برگزارکننده
  hours: number;
  startDate?: string;
  endDate?: string;
  status: 'برنامه‌ریزی شده' | 'در حال برگزاری' | 'کسب گواهینامه' | 'نیازمند آزمون مجدد';
  effectivenessScore?: number; // نمره اثربخشی (۱ تا ۱۰۰)
  certificateName?: string;
  certificateUrl?: string;
  notes?: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  year: number;
  month: number;
  periodStr: string;
  baseSalary: number;
  dailyRate: number;
  workingDays: number;
  workedHours: number;
  overtimeHours: number;
  overtimePay: number;
  housingAllowance: number;
  groceryAllowance: number;
  childAllowance: number;
  missionDays: number;
  missionPay: number;
  commissionPay: number;
  bonusPay: number;
  grossPay: number;
  insuranceDeduction: number;
  taxDeduction: number;
  advanceDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  status: 'پیش‌نویس' | 'نهایی و پرداخت‌شده';
  approvedBy?: string;
  approvedAt?: string;
}

export interface PersonalCalendarEvent {
  id: string;
  userId: string;
  userName?: string;
  date: string; // e.g. "۱۴۰۵/۰۱/۱۵"
  title: string;
  type: 'جلسه' | 'کار شخصی' | 'یادآوری' | 'رویداد' | 'سایر';
  time?: string;
  description?: string;
  color?: string;
  createdAt: string;
}

export interface LeaveMissionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'مرخصی استحقاقی' | 'مرخصی ساعتی' | 'مرخصی استعلاجی' | 'مأموریت روزانه' | 'ماموریت جلسه' | 'مأموریت استانی' | 'سایر';
  category: 'leave' | 'mission';
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  durationHours?: number;
  durationDays?: number;
  missionProvince?: string;
  missionCity?: string;
  missionLocation?: string;
  missionReport?: string;
  missionAllowanceDaily?: number;
  totalMissionPay?: number;
  substituteEmployeeId?: string;
  substituteEmployeeName?: string;
  substituteStatus?: 'pending' | 'accepted' | 'declined';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  status: string;
  managerId: string;
  managerName?: string;
  rejectionReason?: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
}

