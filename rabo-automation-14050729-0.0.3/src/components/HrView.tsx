import React, { useState, useMemo } from 'react';
import { 
  Employee, 
  AttendanceRecord, 
  Project, 
  KpiRecord, 
  TrainingRecord, 
  KpiIndicator, 
  KpiMonthlyEvaluation,
  NezamLicenseRecord,
  EmployeePermissions,
  EMPTY_EMPLOYEE_PERMISSIONS,
  FULL_MANAGER_PERMISSIONS,
  DailyTodoItem,
  PersonalCalendarEvent,
  LeaveMissionRequest,
  PayrollRecord
} from '../types';
import { 
  initialKpiIndicators, 
  initialKpiMonthlyEvaluations,
  initialDailyTodos,
  initialPersonalCalendarEvents,
  initialLeaveMissionRequests,
  initialPayrollRecords,
  initialTrainingRecords
} from '../data/initialData';
import { KpiTrackingModule } from './KpiTrackingModule';
import { GoogleMapsLocationPicker } from './GoogleMapsLocationPicker';
import { ShamsiDatePicker } from './ShamsiDatePicker';
import { VoiceInputButton } from './VoiceInputButton';
import { 
  toFa, 
  toEn,
  padFa, 
  formatJalali, 
  jalaliMonthLength, 
  jalaliToGregorian, 
  jalaliStringToGregorian,
  officialHolidays1405, 
  weekdayFa, 
  getExactShamsiTimestamp 
} from '../utils/jalali';
import { 
  UserPlus, 
  Calendar as CalendarIcon, 
  Printer, 
  FileText, 
  Award, 
  GraduationCap, 
  DollarSign, 
  Check, 
  X, 
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Upload,
  FileCheck,
  Eye,
  Trash2,
  Paperclip,
  ShieldAlert,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Edit2,
  Plus,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { formatNumberWithCommas } from '../utils/formatters';
import { ExcelExportButton } from './ExcelExportButton';
import { exportPersonnelToExcel } from '../utils/excelExport';

interface HrViewProps {
  currentSubView: 'attendance' | 'employees' | 'payroll' | 'kpi' | 'training';
  currentUser: Employee;
  personnelList: Employee[];
  setPersonnelList: React.Dispatch<React.SetStateAction<Employee[]>>;
  projectsList: Project[];
  attendanceRecords: AttendanceRecord[];
  setAttendanceRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  kpiIndicators?: KpiIndicator[];
  setKpiIndicators?: React.Dispatch<React.SetStateAction<KpiIndicator[]>>;
  kpiEvaluations?: KpiMonthlyEvaluation[];
  setKpiEvaluations?: React.Dispatch<React.SetStateAction<KpiMonthlyEvaluation[]>>;
  dailyTodos?: DailyTodoItem[];
  setDailyTodos?: React.Dispatch<React.SetStateAction<DailyTodoItem[]>>;
  personalCalendarEvents?: PersonalCalendarEvent[];
  setPersonalCalendarEvents?: React.Dispatch<React.SetStateAction<PersonalCalendarEvent[]>>;
  leaveMissionRequests?: LeaveMissionRequest[];
  setLeaveMissionRequests?: React.Dispatch<React.SetStateAction<LeaveMissionRequest[]>>;
  payrollRecords?: PayrollRecord[];
  setPayrollRecords?: React.Dispatch<React.SetStateAction<PayrollRecord[]>>;
  trainingMatrix?: TrainingRecord[];
  setTrainingMatrix?: React.Dispatch<React.SetStateAction<TrainingRecord[]>>;
  todayStr: string;
  setToastMessage: (msg: string) => void;
  onInspectLocation?: (address: string) => void;
}

const numberToPersianWords = (num: number): string => {
  if (!num || num <= 0) return 'صفر';
  const millones = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const parts: string[] = [];
  if (milliones > 0) parts.push(`${toFa(milliones.toLocaleString('en-US'))} میلیون`);
  if (thousands > 0) parts.push(`${toFa(thousands)} هزار`);
  return parts.join(' و ') || toFa(num);
};

export const HrView: React.FC<HrViewProps> = ({
  currentSubView,
  currentUser,
  personnelList,
  setPersonnelList,
  projectsList,
  attendanceRecords,
  setAttendanceRecords,
  kpiIndicators: propKpiIndicators,
  setKpiIndicators: propSetKpiIndicators,
  kpiEvaluations: propKpiEvaluations,
  setKpiEvaluations: propSetKpiEvaluations,
  dailyTodos: propDailyTodos,
  setDailyTodos: propSetDailyTodos,
  personalCalendarEvents: propPersonalEvents,
  setPersonalCalendarEvents: propSetPersonalEvents,
  leaveMissionRequests: propLeaveRequests,
  setLeaveMissionRequests: propSetLeaveRequests,
  payrollRecords: propPayrollRecords,
  setPayrollRecords: propSetPayrollRecords,
  trainingMatrix: propTrainingMatrix,
  setTrainingMatrix: propSetTrainingMatrix,
  todayStr,
  setToastMessage,
  onInspectLocation
}) => {
  // Calendar states
  const [calendarYear, setCalendarYear] = useState(1405);
  const [calendarMonth, setCalendarMonth] = useState(7);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(todayStr);

  // Fallback states if not provided via props
  const [localKpiIndicators, setLocalKpiIndicators] = useState<KpiIndicator[]>(initialKpiIndicators);
  const [localKpiEvaluations, setLocalKpiEvaluations] = useState<KpiMonthlyEvaluation[]>(initialKpiMonthlyEvaluations);
  const [localDailyTodos, setLocalDailyTodos] = useState<DailyTodoItem[]>(initialDailyTodos);
  const [localPersonalEvents, setLocalPersonalEvents] = useState<PersonalCalendarEvent[]>(initialPersonalCalendarEvents);
  const [localLeaveRequests, setLocalLeaveRequests] = useState<LeaveMissionRequest[]>(initialLeaveMissionRequests);
  const [localPayrollRecords, setLocalPayrollRecords] = useState<PayrollRecord[]>(initialPayrollRecords);
  const [localTrainingRecords, setLocalTrainingRecords] = useState<TrainingRecord[]>(initialTrainingRecords);

  const activeKpiIndicators = propKpiIndicators || localKpiIndicators;
  const activeSetKpiIndicators = propSetKpiIndicators || setLocalKpiIndicators;
  const activeKpiEvaluations = propKpiEvaluations || localKpiEvaluations;
  const activeSetKpiEvaluations = propSetKpiEvaluations || setLocalKpiEvaluations;
  const activeDailyTodos = propDailyTodos || localDailyTodos;
  const activeSetDailyTodos = propSetDailyTodos || setLocalDailyTodos;
  const activePersonalEvents = propPersonalEvents || localPersonalEvents;
  const activeSetPersonalEvents = propSetPersonalEvents || setLocalPersonalEvents;
  const activeLeaveRequests = propLeaveRequests || localLeaveRequests;
  const activeSetLeaveRequests = propSetLeaveRequests || setLocalLeaveRequests;
  const activePayrollRecords = propPayrollRecords || localPayrollRecords;
  const activeSetPayrollRecords = propSetPayrollRecords || setLocalPayrollRecords;
  const trainingRecords = propTrainingMatrix || localTrainingRecords;
  const setTrainingRecords = propSetTrainingMatrix || setLocalTrainingRecords;

  // Personal Todo & Event quick input states
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<'فوری' | 'عادی' | 'کم‌اهمیت'>('عادی');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('۱۰:۰۰');
  const [newEventCategory, setNewEventCategory] = useState<PersonalCalendarEvent['category']>('جلسه کاری');
  const [previewPayslipPerson, setPreviewPayslipPerson] = useState<Employee | null>(null);

  // Attendance log modal
  const [showLogAttendanceModal, setShowLogAttendanceModal] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({
    date: todayStr,
    type: 'کارکرد عادی',
    startTime: '۰۸:۰۰',
    endTime: '۱۷:۰۰',
    hoursWorked: 8,
    overtimeHours: 0,
    projectId: projectsList[0]?.id || '',
    description: '',
    managerId: currentUser.managerId || 'EMP-01',
    missionLocation: '',
    meetingType: ''
  });

  // Employee search & detail modal
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeSearchField, setEmployeeSearchField] = useState<'name' | 'nationalId'>('name');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [showEmployeeDetail, setShowEmployeeDetail] = useState(false);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardActiveTab, setOnboardActiveTab] = useState<'identity' | 'contact' | 'education' | 'job' | 'salary' | 'documents' | 'guarantee' | 'account'>('identity');

  // مرتب‌سازی تعاملی جدول پرسنل
  type PersonnelSortField = 'lastName' | 'nationalId' | 'role' | 'username' | 'mobile' | 'employmentStatus';
  const [personnelSortField, setPersonnelSortField] = useState<PersonnelSortField | null>('lastName');
  const [personnelSortDirection, setPersonnelSortDirection] = useState<'asc' | 'desc'>('asc');

  const handlePersonnelSort = (field: PersonnelSortField) => {
    if (personnelSortField === field) {
      if (personnelSortDirection === 'asc') {
        setPersonnelSortDirection('desc');
      } else {
        setPersonnelSortField(null);
        setPersonnelSortDirection('asc');
      }
    } else {
      setPersonnelSortField(field);
      setPersonnelSortDirection('asc');
    }
  };

  // Nezam Mohandesi Multi-Row Licenses state
  const [isAddingLicense, setIsAddingLicense] = useState(false);
  const [newLicenseRow, setNewLicenseRow] = useState<NezamLicenseRecord>({
    id: '',
    discipline: 'عمران',
    grade: 'پایه ۳',
    qualification: 'نظارت و محاسبات',
    licenseNo: '',
    validUntil: '',
    documentName: ''
  });

  // Detailed Comprehensive Onboard form state
  const [onboardForm, setOnboardForm] = useState({
    // Identity & Civil
    name: '',
    latinName: '',
    fatherName: '',
    motherName: '',
    motherFullName: '',
    birthDate: '',
    birthDateGregorian: '',
    birthPlace: 'تهران',
    idCertificate: '',
    birthCertificateSerial: '',
    gender: 'مرد',
    nationalId: '',
    maritalStatus: 'مجرد',
    childrenCount: '۰',
    dependentsCount: '۰',
    militaryStatus: 'پایان خدمت',
    militaryCardNumber: '',
    militaryEndDate: '',
    religion: 'اسلام',
    nationality: 'ایرانی',

    // Contact & Google Maps
    homeAddress: '',
    homePhone: '',
    mobile: '',
    emergencyMobile: '',
    postalCode: '',
    province: 'تهران',
    city: 'تهران',
    municipalityZone: 'منطقه ۲',
    mapLocation: {
      lat: 35.7820,
      lng: 51.3730,
      addressDescription: 'تهران، سعادت‌آباد'
    },

    // Relatives & Emergency Contacts
    relativeContact: '',
    relatives: [
      { name: '', relation: 'پدر', phone: '', mobile: '' },
      { name: '', relation: 'همسر / برادر', phone: '', mobile: '' }
    ],

    // Education & Engineering License (Empty default values with placeholders)
    educationLevel: '',
    educationField: '',
    universityName: '',
    graduationYear: '',
    gpa: '',
    nezamMohandesiLicense: {
      licenseNo: '',
      grade: 'پایه ۳',
      branch: 'مهندسی عمران',
      validUntil: ''
    },
    nezamLicenses: [] as NezamLicenseRecord[],
    insuranceNumber: '',
    insuranceHistoryMonths: 0,

    // Job, Role & Module Access
    positionLevel: 'کارشناس',
    role: '',
    unit: 'مهندسی حریق',
    managerId: 'EMP-01',
    contractType: 'قرارداد یکساله قانون کار',
    contractStartDate: '۱۴۰۵/۰۱/۰۱',
    contractEndDate: '۱۴۰۵/۱۲/۲۹',
    serviceStartDate: '۱۴۰۵/۰۱/۰۱',
    serviceLocation: 'دفتر مرکزی رابو',
    permissions: {
      ...EMPTY_EMPLOYEE_PERMISSIONS
    },

    // Salary & Banking
    baseDailySalary: '۱,۸۰۰,۰۰۰',
    baseMonthlySalary: '۵۴,۰۰۰,۰۰۰',
    housingAllowance: '۹,۰۰۰,۰۰۰',
    groceryAllowance: '۱۴,۰۰۰,۰۰۰',
    childAllowance: '۰',
    specialAllowance: '۰',
    overtimeRateHourly: '۳۸۰,۰۰۰',
    holidayRateHourly: '۵۲۰,۰۰۰',
    projectCommissionRate: 3,
    bankName: 'بانک ملت',
    bankAccountNo: '',
    bankCardNo: '',
    bankSheba: '',

    // Guarantee & Legal
    guaranteeType: 'سفته حسن انجام کار',
    guaranteeDetails: 'سفته بانکی تضمین حسن انجام کار',
    guaranteeAmount: '۲۰۰,۰۰۰,۰۰۰ تومان',
    guaranteeSerial: '',
    guarantorName: '',
    guarantorNationalId: '',
    guarantorPhone: '',

    // Account & Notes
    username: '',
    password: '123',
    managerNotes: '',
    additionalNotes: '',
    uploadedDocuments: [
      { id: 'doc-melli', title: 'کارت ملی (تصویر رو و پشت)', type: 'کارت ملی', fileName: '', fileDate: '', status: 'در انتظار بارگذاری' },
      { id: 'doc-shenasnameh', title: 'شناسنامه (صفحات مشخصات و توضیحات)', type: 'شناسنامه', fileName: '', fileDate: '', status: 'در انتظار بارگذاری' },
      { id: 'doc-khedmat', title: 'کارت پایان خدمت یا معافیت دائم', type: 'پایان خدمت', fileName: '', fileDate: '', status: 'در انتظار بارگذاری' },
      { id: 'doc-resume', title: 'رزومه کاری و سوابق حرفه‌ای (PDF)', type: 'رزومه', fileName: '', fileDate: '', status: 'در انتظار بارگذاری' },
      { id: 'doc-photo', title: 'عکس پرسنلی رسمی ۴×۳ با زمینه روشن', type: 'عکس پرسنلی', fileName: '', fileDate: '', status: 'در انتظار بارگذاری' },
      { id: 'doc-tazmin', title: 'چک صیادی بنفش / سفته بانکی حسن انجام کار', type: 'ضمانت‌نامه', fileName: '', fileDate: '', status: 'در انتظار بارگذاری' },
      { id: 'doc-nezam', title: 'پروانه اشتغال به کار مهندسی (نظام مهندسی)', type: 'نظام مهندسی', fileName: '', fileDate: '', status: 'در انتظار بارگذاری' },
      { id: 'doc-madrak', title: 'مدرک تحصیلی دانشگاهی و دانشنامه', type: 'مدرک تحصیلی', fileName: '', fileDate: '', status: 'در انتظار بارگذاری' },
      { id: 'doc-gharardad', title: 'نسخه امضاشده قرارداد کار رسمی', type: 'قرارداد کار', fileName: '', fileDate: '', status: 'در انتظار بارگذاری' }
    ],
    documentsChecklist: {
      idCard: true,
      education: false,
      military: false,
      insuranceHistory: false,
      nezamMohandesi: false,
      jobDesc: true
    }
  });

  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);

  const handleStartAddEmployee = () => {
    setEditingEmployeeId(null);
    setOnboardActiveTab('identity');
    setShowOnboardModal(true);
  };

  const handleEditEmployee = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    const anyEmp = emp as any;
    setOnboardForm({
      name: emp.name || '',
      latinName: anyEmp.latinName || '',
      fatherName: anyEmp.fatherName || '',
      motherName: anyEmp.motherFullName || anyEmp.motherName || '',
      motherFullName: anyEmp.motherFullName || anyEmp.motherName || '',
      birthDate: anyEmp.birthDate || '',
      birthDateGregorian: anyEmp.birthDateGregorian || '',
      birthPlace: anyEmp.birthPlace || 'تهران',
      idCertificate: anyEmp.idCertificate || '',
      birthCertificateSerial: anyEmp.birthCertificateSerial || '',
      gender: anyEmp.gender || 'مرد',
      nationalId: emp.nationalId || '',
      maritalStatus: anyEmp.maritalStatus || 'مجرد',
      childrenCount: anyEmp.childrenCount || '۰',
      dependentsCount: anyEmp.dependentsCount || '۰',
      militaryStatus: anyEmp.militaryStatus || 'پایان خدمت',
      militaryCardNumber: anyEmp.militaryCardNumber || '',
      militaryEndDate: anyEmp.militaryEndDate || '',
      religion: anyEmp.religion || 'اسلام',
      nationality: anyEmp.nationality || 'ایرانی',
      homeAddress: emp.homeAddress || '',
      homePhone: emp.homePhone || '',
      mobile: emp.mobile || '',
      emergencyMobile: anyEmp.emergencyMobile || '',
      postalCode: anyEmp.postalCode || '',
      province: anyEmp.province || 'تهران',
      city: anyEmp.city || 'تهران',
      municipalityZone: anyEmp.municipalityZone || 'منطقه ۲',
      mapLocation: {
        lat: emp.mapLocation?.lat || 35.7820,
        lng: emp.mapLocation?.lng || 51.3730,
        addressDescription: emp.mapLocation?.addressDescription || emp.homeAddress || 'تهران'
      },
      relativeContact: emp.relativeContact || '',
      relatives: anyEmp.relatives && anyEmp.relatives.length > 0 ? anyEmp.relatives : [
        { name: '', relation: 'پدر', phone: '', mobile: '' },
        { name: '', relation: 'همسر / برادر', phone: '', mobile: '' }
      ],
      educationLevel: anyEmp.educationLevel || '',
      educationField: anyEmp.educationField || '',
      universityName: anyEmp.universityName || '',
      graduationYear: anyEmp.graduationYear || '',
      gpa: anyEmp.gpa || '',
      nezamMohandesiLicense: {
        licenseNo: anyEmp.nezamMohandesiLicense?.licenseNo || '',
        grade: anyEmp.nezamMohandesiLicense?.grade || 'پایه ۳',
        branch: anyEmp.nezamMohandesiLicense?.branch || 'مهندسی عمران',
        validUntil: anyEmp.nezamMohandesiLicense?.validUntil || ''
      },
      nezamLicenses: anyEmp.nezamLicenses && anyEmp.nezamLicenses.length > 0 
        ? anyEmp.nezamLicenses 
        : (anyEmp.nezamMohandesiLicense?.licenseNo ? [{
            id: `lic-${Date.now()}`,
            discipline: anyEmp.nezamMohandesiLicense.branch || 'عمران',
            grade: anyEmp.nezamMohandesiLicense.grade || 'پایه ۲',
            licenseNo: anyEmp.nezamMohandesiLicense.licenseNo,
            qualification: 'طراحی و نظارت',
            validUntil: anyEmp.nezamMohandesiLicense.validUntil || '۱۴۰۸/۰۴/۳۱'
          }] : []),
      insuranceNumber: anyEmp.insuranceNumber || '',
      insuranceHistoryMonths: anyEmp.insuranceHistoryMonths || 0,
      positionLevel: anyEmp.positionLevel || (emp.isManager ? 'مدیر ارشد' : 'کارشناس'),
      role: emp.role || '',
      unit: anyEmp.unit || 'مهندسی حریق',
      managerId: emp.managerId || 'EMP-01',
      contractType: anyEmp.contractType || 'قرارداد یکساله قانون کار',
      contractStartDate: anyEmp.contractStartDate || '۱۴۰۵/۰۱/۰۱',
      contractEndDate: anyEmp.contractEndDate || '۱۴۰۵/۱۲/۲۹',
      serviceStartDate: anyEmp.serviceStartDate || '۱۴۰۵/۰۱/۰۱',
      serviceLocation: anyEmp.serviceLocation || 'دفتر مرکزی رابو',
      permissions: emp.permissions ? { ...EMPTY_EMPLOYEE_PERMISSIONS, ...emp.permissions } : { ...EMPTY_EMPLOYEE_PERMISSIONS },
      baseDailySalary: anyEmp.baseDailySalary || '۱,۸۰۰,۰۰۰',
      baseMonthlySalary: anyEmp.baseMonthlySalary || '۵۴,۰۰۰,۰۰۰',
      housingAllowance: anyEmp.housingAllowance || '۹,۰۰۰,۰۰۰',
      groceryAllowance: anyEmp.groceryAllowance || '۱۴,۰۰۰,۰۰۰',
      childAllowance: anyEmp.childAllowance || '۰',
      specialAllowance: anyEmp.specialAllowance || '۰',
      overtimeRateHourly: anyEmp.overtimeRateHourly || '۳۸۰,۰۰۰',
      holidayRateHourly: anyEmp.holidayRateHourly || '۵۲۰,۰۰۰',
      projectCommissionRate: emp.projectCommissionRate || 3,
      bankName: anyEmp.bankName || 'بانک ملت',
      bankAccountNo: anyEmp.bankAccountNo || '',
      bankCardNo: anyEmp.bankCardNo || '',
      bankSheba: anyEmp.bankSheba || '',
      guaranteeType: anyEmp.guaranteeType || 'سفته حسن انجام کار',
      guaranteeDetails: anyEmp.guaranteeDetails || 'سفته بانکی تضمین حسن انجام کار',
      guaranteeAmount: anyEmp.guaranteeAmount || '۲۰۰,۰۰۰,۰۰۰ تومان',
      guaranteeSerial: anyEmp.guaranteeSerial || '',
      guarantorName: anyEmp.guarantorName || '',
      guarantorNationalId: anyEmp.guarantorNationalId || '',
      guarantorPhone: anyEmp.guarantorPhone || '',
      username: emp.username || '',
      password: emp.password || '123',
      managerNotes: emp.managerNotes || '',
      additionalNotes: emp.additionalNotes || '',
      uploadedDocuments: anyEmp.uploadedDocuments || [
        { id: 'doc-melli', title: 'کارت ملی (تصویر رو و پشت)', type: 'کارت ملی', fileName: '', fileDate: '', status: 'در انتظار بارگذاری' },
        { id: 'doc-shenasnameh', title: 'شناسنامه (صفحات مشخصات و توضیحات)', type: 'شناسنامه', fileName: '', fileDate: '', status: 'در انتظار بارگذاری' },
        { id: 'doc-khedmat', title: 'کارت پایان خدمت یا معافیت دائم', type: 'پایان خدمت', fileName: '', fileDate: '', status: 'در انتظار بارگذاری' },
        { id: 'doc-resume', title: 'رزومه کاری و سوابق حرفه‌ای (PDF)', type: 'رزومه', fileName: '', fileDate: '', status: 'در انتظار بارگذاری' },
        { id: 'doc-photo', title: 'عکس پرسنلی رسمی ۴×۳ با زمینه روشن', type: 'عکس پرسنلی', fileName: '', fileDate: '', status: 'در انتظار بارگذاری' },
        { id: 'doc-tazmin', title: 'چک صیادی بنفش / سفته بانکی حسن انجام کار', type: 'ضمانت‌نامه', fileName: '', fileDate: '', status: 'در انتظار بارگذاری' },
        { id: 'doc-nezam', title: 'پروانه اشتغال به کار مهندسی (نظام مهندسی)', type: 'نظام مهندسی', fileName: '', fileDate: '', status: 'در انتظار بارگذاری' },
        { id: 'doc-madrak', title: 'مدرک تحصیلی دانشگاهی و دانشنامه', type: 'مدرک تحصیلی', fileName: '', fileDate: '', status: 'در انتظار بارگذاری' },
        { id: 'doc-gharardad', title: 'نسخه امضاشده قرارداد کار رسمی', type: 'قرارداد کار', fileName: '', fileDate: '', status: 'در انتظار بارگذاری' }
      ],
      documentsChecklist: {
        idCard: Boolean(anyEmp.documentsChecklist?.idCard ?? true),
        education: Boolean(anyEmp.documentsChecklist?.education ?? false),
        military: Boolean(anyEmp.documentsChecklist?.military ?? false),
        insuranceHistory: Boolean(anyEmp.documentsChecklist?.insuranceHistory ?? false),
        nezamMohandesi: Boolean(anyEmp.documentsChecklist?.nezamMohandesi ?? false),
        jobDesc: Boolean(anyEmp.documentsChecklist?.jobDesc ?? true)
      }
    });
    setOnboardActiveTab('identity');
    setShowOnboardModal(true);
  };

  const handleDeleteEmployee = (empId: string, empName: string) => {
    if (empId === currentUser.id) {
      setToastMessage('خطا: امکان حذف حساب کاربری جاری خودتان وجود ندارد.');
      return;
    }
    setPersonnelList(prev => prev.filter(p => p.id !== empId));
    setToastMessage(`پرونده پرسنلی ${empName} با موفقیت حذف گردید.`);
    if (selectedEmployeeId === empId) {
      setSelectedEmployeeId(null);
      setShowEmployeeDetail(false);
    }
  };

  // KPI & Training form states
  const [kpiRecords, setKpiRecords] = useState<KpiRecord[]>([]);
  const [selectedKpiEmployee, setSelectedKpiEmployee] = useState('');
  const [kpiTitle, setKpiTitle] = useState('');
  const [kpiScore, setKpiScore] = useState(85);
  const [selectedTrainingEmployee, setSelectedTrainingEmployee] = useState('');
  const [trainingCourse, setTrainingCourse] = useState('');
  const [ payrollPayments, setPayrollPayments] = useState<Record<string, { paid: boolean; receipt: string; at: string }>>({});

  // Dynamic Jalali Calendar days computation
  const calendarDays = useMemo(() => {
    const days = [];
    const len = jalaliMonthLength(calendarYear, calendarMonth);
    for (let d = 1; d <= len; d++) {
      const dt = jalaliToGregorian(calendarYear, calendarMonth, d);
      const key = `${calendarMonth}/${d}`;
      const holiday = calendarYear === 1405 ? officialHolidays1405[key] : null;
      days.push({
        day: d,
        date: `${toFa(calendarYear)}/${padFa(calendarMonth)}/${padFa(d)}`,
        weekday: weekdayFa[dt.getDay()],
        isFriday: dt.getDay() === 5,
        holidayTitle: holiday || '',
        isHoliday: Boolean(holiday) || dt.getDay() === 5
      });
    }
    const firstDay = (jalaliToGregorian(calendarYear, calendarMonth, 1).getDay() + 1) % 7;
    return { days, leading: Array.from({ length: firstDay }, (_, i) => i) };
  }, [calendarYear, calendarMonth]);

  // Scheduled hours calculation based on 44-hour weekly legal requirement
  const scheduledHoursForMonth = (year: number, month: number) => {
    const len = jalaliMonthLength(year, month);
    let total = 0;
    for (let d = 1; d <= len; d++) {
      const dt = jalaliToGregorian(year, month, d);
      const dow = dt.getDay(); // 0 is Sunday, 5 is Friday, 4 is Thursday
      const key = `${month}/${d}`;
      const holiday = year === 1405 && officialHolidays1405[key];
      if (dow === 4 || dow === 5 || holiday) continue;
      total += dow === 3 ? 8 : 9; // Thursday half-day or 44hr distribution
    }
    return total || 176;
  };

  // Comprehensive Iranian Labor Law Payroll Calculator
  const calculatePayroll = (person: Employee, year = calendarYear, month = calendarMonth) => {
    const daysInMonth = jalaliMonthLength(year, month);
    const monthPrefix = `${toFa(year)}/${padFa(month)}/`;
    const monthRecords = attendanceRecords.filter(
      r => r.employeeId === person.id && r.date.startsWith(monthPrefix) && r.approvalStatus === 'approved'
    );

    const worked = monthRecords.reduce((s, r) => s + Number(r.hoursWorked || 0), 0);
    const overtime = monthRecords.reduce((s, r) => s + Number(r.overtimeHours || 0), 0);
    const daily = Number(String(person.baseDailySalary || '0').replace(/[^0-9]/g, '')) || 0;
    const base = Math.round(daily * daysInMonth);
    const housing = Number(String(person.housingAllowance || '0').replace(/[^0-9]/g, '')) || 0;
    const grocery = Number(String(person.groceryAllowance || '0').replace(/[^0-9]/g, '')) || 0;
    const child = Number(String(person.childAllowance || '0').replace(/[^0-9]/g, '')) || 0;

    // Overtime hourly = (daily salary / 7.333) * 1.4
    const overtimeRate = Math.round((daily * 1.4) / 7.333333);
    const overtimePay = Math.round(overtime * overtimeRate);
    const projectCommission = Number(String(person.commissionAmount || '0').replace(/[^0-9]/g, '')) || 0;

    const gross = base + housing + grocery + child + overtimePay + projectCommission;
    const insuranceBase = base + housing + grocery + child;
    const employeeInsurance = Math.round(insuranceBase * 0.07);
    const advance = Number(person.currentAdvance || 0);
    const net = gross - employeeInsurance - advance;
    const scheduledHours = scheduledHoursForMonth(year, month);

    return {
      daysInMonth,
      scheduledHours,
      worked,
      overtime,
      base,
      housing,
      grocery,
      child,
      overtimePay,
      projectCommission,
      gross,
      insuranceBase,
      employeeInsurance,
      advance,
      net
    };
  };

  // Approval of attendance
  const handleApproval = (id: string, approved: boolean) => {
    setAttendanceRecords(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              approvalStatus: approved ? 'approved' : 'rejected',
              status: approved ? 'تأیید شده' : 'رد شده',
              approvedAt: getExactShamsiTimestamp(),
              approvedBy: currentUser.name
            }
          : r
      )
    );
    setToastMessage(approved ? 'تردد کارمند تأیید شد.' : 'درخواست تردد رد شد.');
  };

  // Print Payslip in standard A4 Official size with Rabo Letterhead & IRANSans
  const printPayslip = (person: Employee) => {
    const x = calculatePayroll(person);
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) return;
    w.document.write(`
      <!doctype html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="utf-8">
        <title>فیش حقوقی رسمی A4 - ${person.name}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'IRANSans', Tahoma, Arial, sans-serif; margin: 0; color: #13213c; direction: rtl; background: #fff; }
          .sheet { border: 2px solid #13213c; padding: 12mm; border-radius: 6px; min-height: 265mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; }
          .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #13213c; padding-bottom: 5mm; margin-bottom: 6mm; }
          .title { font-size: 15pt; font-weight: 900; color: #13213c; }
          .sub { font-size: 9pt; color: #b45309; font-weight: bold; margin-top: 1mm; }
          .meta { font-size: 9pt; text-align: left; line-height: 1.6; }
          .emp-info { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; font-size: 9.5pt; margin-bottom: 6mm; background: #f8fafc; border: 1px solid #cbd5e1; padding: 4mm; border-radius: 5px; }
          .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-bottom: 6mm; }
          .col-box { border: 1.5px solid #cbd5e1; border-radius: 5px; overflow: hidden; }
          .col-head { background: #13213c; color: #fff; padding: 2.5mm 4mm; font-size: 10pt; font-weight: bold; }
          .col-head.ded { background: #800000; }
          .row-item { display: flex; justify-content: space-between; padding: 2.5mm 4mm; border-bottom: 1px solid #e2e8f0; font-size: 9.5pt; }
          .total { padding: 4mm 5mm; background: #13213c; color: #fff; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 6mm; }
          .total-words { font-size: 9.5pt; color: #fde68a; margin-top: 1.5mm; }
          .sign { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; margin-top: 10mm; font-size: 9pt; text-align: center; }
          .sign-box { border: 1px dashed #94a3b8; border-radius: 5px; padding: 4mm; min-height: 22mm; display: flex; flex-direction: column; justify-content: space-between; }
          .foot { margin-top: 6mm; padding-top: 3mm; border-top: 1px solid #cbd5e1; font-size: 8pt; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div>
            <div class="head">
              <div>
                <div class="title">شرکت مهندسی رهنمون کیفیت رابو (سهامی خاص)</div>
                <div class="sub">فیش رسمی حقوق و دستمزد پرسنل - منطبق بر قانون کار و تأمین اجتماعی</div>
              </div>
              <div class="meta">
                <strong>شماره سند:</strong> PAY-${calendarYear}${padFa(calendarMonth)}-${person.id}<br>
                <strong>دوره عملکرد:</strong> ${toFa(calendarYear)}/${padFa(calendarMonth)}<br>
                <strong>تاریخ صدور:</strong> ${todayStr}
              </div>
            </div>
            <div class="emp-info">
              <div><strong>نام و نام خانوادگی:</strong> ${person.name}</div>
              <div><strong>کد ملی:</strong> ${toFa(person.nationalId || '-')}</div>
              <div><strong>دپارتمان / واحد:</strong> ${person.unit}</div>
              <div><strong>سمت سازمانی:</strong> ${person.role}</div>
              <div><strong>کد پرسنلی:</strong> ${toFa(person.id)}</div>
              <div><strong>کارکرد موظف:</strong> ${toFa(x.worked)} ساعت</div>
              <div><strong>اضافه‌کار تأییدشده:</strong> ${toFa(x.overtime)} ساعت</div>
              <div><strong>شماره شبا / بانک:</strong> ${person.bankName || 'بانک ملت'}</div>
            </div>
            <div class="cols">
              <div class="col-box">
                <div class="col-head">الف) شرح حقوق و مزایای قانونی (ریال)</div>
                <div class="row-item"><span>حقوق پایه ماهانه (${toFa(x.daysInMonth)} روز)</span><strong>${x.base.toLocaleString('fa-IR')}</strong></div>
                <div class="row-item"><span>حق مسکن مصوب</span><strong>${x.housing.toLocaleString('fa-IR')}</strong></div>
                <div class="row-item"><span>بن خواروبار و رفاهی</span><strong>${x.grocery.toLocaleString('fa-IR')}</strong></div>
                <div class="row-item"><span>حق اولاد و عائله‌مندی</span><strong>${x.child.toLocaleString('fa-IR')}</strong></div>
                <div class="row-item"><span>فوق‌العاده اضافه‌کاری (${toFa(x.overtime)} ساعت)</span><strong>${x.overtimePay.toLocaleString('fa-IR')}</strong></div>
                <div class="row-item"><span>پورسانت و کارانه مهندسی پروژه‌ها</span><strong>${x.projectCommission.toLocaleString('fa-IR')}</strong></div>
                <div class="row-item" style="background:#f1f5f9;font-weight:bold;"><span>جمع کل ناخالص حقوق و مزایا</span><span>${x.gross.toLocaleString('fa-IR')} ریال</span></div>
              </div>
              <div class="col-box">
                <div class="col-head ded">ب) شرح کسورات قانونی و توافقی (ریال)</div>
                <div class="row-item"><span>حق بیمه تأمین اجتماعی سهم کارمند (۷٪)</span><strong>${x.employeeInsurance.toLocaleString('fa-IR')}</strong></div>
                <div class="row-item"><span>مالیات بر حقوق ماهانه</span><strong>۰</strong></div>
                <div class="row-item"><span>مساعده و علی‌الحساب دریافتی</span><strong>${x.advance.toLocaleString('fa-IR')}</strong></div>
                <div class="row-item"><span>اقساط وام صندوق شرکت</span><strong>۰</strong></div>
                <div class="row-item" style="background:#fef2f2;font-weight:bold;color:#991b1b;"><span>جمع کل کسورات</span><span>${(x.employeeInsurance + x.advance).toLocaleString('fa-IR')} ریال</span></div>
              </div>
            </div>
            <div class="total">
              <div>
                <div style="font-size:12pt;font-weight:900;">خالص پرداختی قابل واریز به حساب پرسنل:</div>
                <div class="total-words">به حروف: ${numberToPersianWords(x.net)} ریال تمام</div>
              </div>
              <div style="font-size:16pt;font-weight:900;color:#fde68a;">
                ${x.net.toLocaleString('fa-IR')} ریال
              </div>
            </div>
          </div>
          <div>
            <div class="sign">
              <div class="sign-box"><strong>امضای کارمند و گواهی دریافت</strong><span>${person.name}</span></div>
              <div class="sign-box"><strong>تأیید واحد مالی و حسابداری رابو</strong><span>بررسی و تسویه حساب</span></div>
              <div class="sign-box"><strong>مهر و امضای مدیریت ارشد شرکت رابو</strong><span>مهندس رضا محمدی</span></div>
            </div>
            <div class="foot">
              نشانی دفتر مرکزی: تهران، سعادت‌آباد، میدان کاج | این فیش حقوقی از سامانه یکپارچه اتوماسیون مهندسی رابو با فونت استاندارد IRANSans صادر گردیده است.
            </div>
          </div>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    w.document.close();
  };

  return (
    <div className="space-y-6">
      {/* 1. ATTENDANCE & LEAVE CALENDAR */}
      {currentSubView === 'attendance' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-[#13213c] flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-amber-600" />
                  <span>تقویم جامع تردد، مأموریت و مرخصی (شمسی پویا)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  برای ثبت کارکرد روزانه، مأموریت، یا مرخصی بر روی روز مورد نظر کلیک فرمایید.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={calendarYear}
                  onChange={e => setCalendarYear(Number(e.target.value))}
                  className="text-xs p-2 border border-slate-300 rounded-lg outline-none font-bold"
                >
                  {Array.from({ length: 11 }, (_, i) => 1405 + i).map(y => (
                    <option key={y} value={y}>{toFa(y)}</option>
                  ))}
                </select>
                <select
                  value={calendarMonth}
                  onChange={e => setCalendarMonth(Number(e.target.value))}
                  className="text-xs p-2 border border-slate-300 rounded-lg outline-none font-bold"
                >
                  {[
                    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
                    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
                  ].map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
              {['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'].map(d => (
                <div
                  key={d}
                  className={`py-2 text-xs font-bold rounded-lg ${
                    d === 'جمعه' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-7 gap-1.5 text-right">
              {calendarDays.leading.map(i => (
                <div key={`lead-${i}`} className="min-h-[85px] bg-slate-50/50 rounded-lg border border-transparent" />
              ))}

              {calendarDays.days.map(d => {
                const dayRecords = attendanceRecords.filter(
                  r => r.employeeId === currentUser.id && r.date === d.date
                );
                const isSelected = selectedCalendarDate === d.date;

                const dayBirthdays = personnelList.filter(p => {
                  if (!p.birthDate) return false;
                  const clean = toEn(p.birthDate).trim().replace(/-/g, '/');
                  const parts = clean.split('/');
                  if (parts.length >= 3) {
                    const bMonth = parseInt(parts[1], 10);
                    const bDay = parseInt(parts[2], 10);
                    return bMonth === calendarMonth && bDay === d.day;
                  }
                  return false;
                });

                return (
                  <div
                    key={d.day}
                    onClick={() => {
                      setSelectedCalendarDate(d.date);
                      setAttendanceForm({
                        ...attendanceForm,
                        date: d.date,
                        managerId: currentUser.managerId || 'EMP-01'
                      });
                      setShowLogAttendanceModal(true);
                    }}
                    className={`min-h-[85px] p-2 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#13213c] ring-2 ring-[#13213c]/20 bg-amber-50/30'
                        : d.isHoliday
                        ? 'bg-rose-50/40 border-rose-200 hover:bg-rose-50/70'
                        : 'bg-white border-slate-200 hover:border-amber-400 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${d.isHoliday ? 'text-rose-600' : 'text-slate-800'}`}>
                        {toFa(d.day)}
                      </span>
                      {d.isHoliday && (
                        <span className="text-[9px] bg-rose-100 text-rose-700 px-1 py-0.5 rounded font-bold">
                          تعطیل
                        </span>
                      )}
                    </div>

                    {d.holidayTitle && (
                      <div className="text-[9px] text-rose-700 leading-tight truncate font-medium">
                        {d.holidayTitle}
                      </div>
                    )}

                    <div className="space-y-1 mt-1">
                      {/* 🎂 زادروز پرسنل شرکت مهندسی رابو */}
                      {dayBirthdays.map(bEmp => (
                        <div
                          key={`bday-${bEmp.id}`}
                          className="text-[9.5px] px-1.5 py-0.5 rounded-md font-bold truncate bg-pink-100/90 text-pink-900 border border-pink-300 flex items-center gap-1 shadow-2xs"
                          title={`🎂 زادروز ${bEmp.name} (${bEmp.role || 'پرسنل رابو'})`}
                        >
                          <span className="shrink-0 text-[11px]">🎂</span>
                          <span className="truncate">زادروز {bEmp.name}</span>
                        </div>
                      ))}

                      {dayRecords.slice(0, 2).map(r => (
                        <div
                          key={r.id}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-medium truncate ${
                            r.approvalStatus === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.type} ({toFa(r.hoursWorked)}س)
                        </div>
                      ))}

                      {activePersonalEvents
                        .filter(ev => ev.userId === currentUser.id && ev.date === d.date)
                        .slice(0, 2)
                        .map(ev => (
                          <div
                            key={ev.id}
                            className="text-[9px] px-1.5 py-0.5 rounded font-bold truncate bg-indigo-100 text-indigo-900 border border-indigo-200"
                          >
                            📌 {ev.title}
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Personalized Daily To-Do List & Personal Events Panel for Current User */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Daily To-Do List */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h4 className="text-sm font-black text-[#13213c]">
                    چک‌لیست برنامه‌ها و کارهای روزانه من ({selectedCalendarDate || todayStr})
                  </h4>
                  <p className="text-[11px] text-slate-500">اختصاصی کارتابل {currentUser.name}</p>
                </div>
                <VoiceInputButton onTranscript={(t) => setNewTodoText(prev => prev ? `${prev} ${t}` : t)} />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTodoText}
                  onChange={e => setNewTodoText(e.target.value)}
                  placeholder="عنوان کار یا برنامه شخصی در این روز..."
                  className="flex-1 text-xs p-2.5 border border-slate-300 rounded-lg outline-none"
                />
                <select
                  value={newTodoPriority}
                  onChange={e => setNewTodoPriority(e.target.value as any)}
                  className="text-xs p-2.5 border border-slate-300 rounded-lg bg-white font-bold"
                >
                  <option value="فوری">فوری</option>
                  <option value="عادی">عادی</option>
                  <option value="کم‌اهمیت">کم‌اهمیت</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!newTodoText.trim()) return;
                    const item: DailyTodoItem = {
                      id: `TODO-${Date.now()}`,
                      userId: currentUser.id,
                      userName: currentUser.name,
                      date: selectedCalendarDate || todayStr,
                      text: newTodoText.trim(),
                      completed: false,
                      priority: newTodoPriority,
                      createdAt: getExactShamsiTimestamp()
                    };
                    activeSetDailyTodos([item, ...activeDailyTodos]);
                    setNewTodoText('');
                    setToastMessage('برنامه روزانه در تقویم شخصی شما ذخیره شد.');
                  }}
                  className="bg-[#13213c] hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg text-xs font-bold cursor-pointer"
                >
                  افزودن
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {activeDailyTodos
                  .filter(t => t.userId === currentUser.id)
                  .map(todo => (
                    <div
                      key={todo.id}
                      className={`p-3 rounded-lg border flex items-center justify-between gap-2 text-xs ${
                        todo.completed ? 'bg-emerald-50/50 border-emerald-200 line-through text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => {
                            activeSetDailyTodos(
                              activeDailyTodos.map(x => x.id === todo.id ? { ...x, completed: !x.completed } : x)
                            );
                          }}
                          className="rounded text-emerald-600"
                        />
                        <span className="font-bold">{todo.text}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({todo.date})</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => activeSetDailyTodos(activeDailyTodos.filter(x => x.id !== todo.id))}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Personal Calendar Events */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h4 className="text-sm font-black text-[#13213c]">
                    رویدادها و یادآورهای تقویم شخصی ({selectedCalendarDate || todayStr})
                  </h4>
                  <p className="text-[11px] text-slate-500">ثبت جلسات، بازدیدهای کارگاهی و یادآورهای فردی</p>
                </div>
                <VoiceInputButton onTranscript={(t) => setNewEventTitle(prev => prev ? `${prev} ${t}` : t)} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={e => setNewEventTitle(e.target.value)}
                  placeholder="عنوان جلسه یا یادآور تقویم..."
                  className="flex-1 text-xs p-2.5 border border-slate-300 rounded-lg outline-none"
                />
                <input
                  type="time"
                  value={newEventTime}
                  onChange={e => setNewEventTime(e.target.value)}
                  className="text-xs p-2 border border-slate-300 rounded-lg"
                />
                <select
                  value={newEventCategory}
                  onChange={e => setNewEventCategory(e.target.value as any)}
                  className="text-xs p-2.5 border border-slate-300 rounded-lg bg-white font-bold"
                >
                  <option value="جلسه کاری">جلسه کاری</option>
                  <option value="بازدید کارگاهی">بازدید کارگاهی</option>
                  <option value="پیگیری شخصی">پیگیری شخصی</option>
                  <option value="ضرب‌الاجل پروژه">ضرب‌الاجل پروژه</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!newEventTitle.trim()) return;
                    const ev: PersonalCalendarEvent = {
                      id: `PEV-${Date.now()}`,
                      userId: currentUser.id,
                      userName: currentUser.name,
                      date: selectedCalendarDate || todayStr,
                      title: newEventTitle.trim(),
                      time: newEventTime,
                      category: newEventCategory,
                      color: 'indigo',
                      completed: false
                    };
                    activeSetPersonalEvents([ev, ...activePersonalEvents]);
                    setNewEventTitle('');
                    setToastMessage('رویداد جدید در تقویم شخصی شما ثبت شد.');
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold cursor-pointer"
                >
                  ثبت رویداد
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {activePersonalEvents
                  .filter(ev => ev.userId === currentUser.id)
                  .map(ev => (
                    <div key={ev.id} className="p-3 rounded-lg border border-indigo-100 bg-indigo-50/40 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-indigo-950">📌 {ev.title}</div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">
                          {ev.category} | تاریخ: {ev.date} | ساعت: {toFa(ev.time || '۱۰:۰۰')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => activeSetPersonalEvents(activePersonalEvents.filter(x => x.id !== ev.id))}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Pending approval queue */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm overflow-hidden">
            <h3 className="text-sm font-bold text-[#13213c] mb-4">کارتابل درخواست‌های تردد و مرخصی</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-bold text-[11.5px]">
                    <th className="p-3 border-l border-slate-200/70">نام پرسنل</th>
                    <th className="p-3 border-l border-slate-200/70">تاریخ</th>
                    <th className="p-3 border-l border-slate-200/70">نوع درخواست</th>
                    <th className="p-3 border-l border-slate-200/70">ساعت کار / مدت</th>
                    <th className="p-3 border-l border-slate-200/70">شرح مأموریت / فعالیت</th>
                    <th className="p-3 border-l border-slate-200/70">وضعیت</th>
                    <th className="p-3 text-center">عملیات تأیید</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {attendanceRecords.map((r, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <tr 
                        key={r.id} 
                        className={`group transition-all duration-150 ${
                          isEven ? 'bg-white' : 'bg-slate-50/60'
                        } hover:bg-amber-50/70`}
                      >
                        <td className="p-3 font-bold text-slate-800 border-l border-slate-200/60 group-hover:border-r-3 group-hover:border-r-amber-500 transition-all">
                          {r.employeeName}
                        </td>
                        <td className="p-3 text-slate-600 font-mono text-[11.5px] border-l border-slate-200/60">
                          {r.date}
                        </td>
                        <td className="p-3 border-l border-slate-200/60">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                            {r.type}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 font-mono border-l border-slate-200/60">
                          {r.startTime} تا {r.endTime} ({r.hoursWorked} ساعت)
                        </td>
                        <td className="p-3 text-slate-600 max-w-xs truncate border-l border-slate-200/60">
                          {r.description}
                        </td>
                        <td className="p-3 border-l border-slate-200/60">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            r.approvalStatus === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : r.approvalStatus === 'rejected'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                        {currentUser.isManager && r.approvalStatus === 'pending' && (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleApproval(r.id, true)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white p-1 rounded-md text-[11px] cursor-pointer"
                              title="تأیید تردد"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleApproval(r.id, false)}
                              className="bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-md text-[11px] cursor-pointer"
                              title="رد درخواست"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. EMPLOYEES & DOSSIERS */}
      {currentSubView === 'employees' && (() => {
        const q = employeeSearch.trim().toLowerCase();
        const filtered = personnelList.filter(p =>
          !q ||
          (employeeSearchField === 'name'
            ? (p.name || '').toLowerCase().includes(q)
            : (p.nationalId || '').replace(/\s/g, '').includes(q))
        );

        // استخراج نام خانوادگی جهت مرتب‌سازی الفبایی طبق دستور کاربر
        const getLastName = (fullName: string): string => {
          const parts = (fullName || '').trim().split(/\s+/);
          return parts.length > 1 ? parts.slice(1).join(' ') : (fullName || '');
        };

        const sortedPersonnel: Employee[] = [...filtered].sort((a, b) => {
          if (!personnelSortField) return 0;
          let res = 0;
          if (personnelSortField === 'lastName') {
            const lastA = getLastName(a.name);
            const lastB = getLastName(b.name);
            res = lastA.localeCompare(lastB, 'fa');
          } else if (personnelSortField === 'nationalId') {
            res = (a.nationalId || a.id || '').localeCompare(b.nationalId || b.id || '', 'fa');
          } else if (personnelSortField === 'role') {
            res = (a.role || '').localeCompare(b.role || '', 'fa');
          } else if (personnelSortField === 'username') {
            res = (a.username || '').localeCompare(b.username || '', 'fa');
          } else if (personnelSortField === 'mobile') {
            res = (a.mobile || '').localeCompare(b.mobile || '', 'fa');
          } else if (personnelSortField === 'employmentStatus') {
            res = (a.employmentStatus || '').localeCompare(b.employmentStatus || '', 'fa');
          }
          return personnelSortDirection === 'asc' ? res : -res;
        });

        return (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#13213c]">
                    بانک اطلاعات کارکنان و پرونده‌های پرسنلی
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    قراردادهای قانون کار، مدارک هویتی، تضامین و مشخصات سازمانی
                  </p>
                </div>

                {currentUser.isManager && (
                  <button
                    onClick={handleStartAddEmployee}
                    className="flex items-center gap-1.5 bg-[#800000] hover:bg-[#9a0000] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>پذیرش و استخدام کارمند جدید</span>
                  </button>
                )}
              </div>

              {/* Search Bar & Excel Export */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <div className="flex gap-2 flex-1">
                  <select
                    value={employeeSearchField}
                    onChange={e => setEmployeeSearchField(e.target.value as any)}
                    className="w-40 text-xs p-2.5 border border-slate-300 rounded-lg outline-none font-medium bg-white"
                  >
                    <option value="name">جستجو بر اساس نام</option>
                    <option value="nationalId">جستجو بر اساس کد ملی</option>
                  </select>
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    <input
                      type="text"
                      value={employeeSearch}
                      onChange={e => setEmployeeSearch(e.target.value)}
                      placeholder="کلمه کلیدی را تایپ فرمایید..."
                      className="w-full text-xs pr-9 pl-3 p-2.5 border border-slate-300 rounded-lg outline-none bg-white"
                    />
                  </div>
                </div>

                <ExcelExportButton
                  onExportFiltered={() => {
                    exportPersonnelToExcel(sortedPersonnel, 'filtered');
                    setToastMessage(`فایل اکسل با موفقیت ایجاد و دانلود شد (${sortedPersonnel.length} کارمند فیلترشده).`);
                  }}
                  onExportFull={() => {
                    exportPersonnelToExcel(personnelList, 'full');
                    setToastMessage(`فایل اکسل کلیه پرسنل با موفقیت ایجاد و دانلود شد (${personnelList.length} کارمند).`);
                  }}
                  filteredCount={sortedPersonnel.length}
                  totalCount={personnelList.length}
                  entityName="پرسنل"
                />
              </div>
            </div>

            {/* نحوه نمایش ردیفی کارمندان با قابلیت مرتب‌سازی تعاملی ستون‌ها و خطوط راهنمای خوانا */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              {personnelSortField && (
                <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-950">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="text-slate-600">مرتب‌سازی بر اساس:</span>
                    <span className="bg-amber-200/90 text-amber-900 px-2.5 py-0.5 rounded-md font-black text-xs flex items-center gap-1">
                      {personnelSortField === 'lastName' ? 'نام و نام خانوادگی' :
                       personnelSortField === 'nationalId' ? 'کد ملی / پرسنلی' :
                       personnelSortField === 'role' ? 'سمت سازمانی' :
                       personnelSortField === 'username' ? 'نام کاربری' :
                       personnelSortField === 'mobile' ? 'شماره تماس' : 'وضعیت اشتغال'}
                      <span>{personnelSortDirection === 'asc' ? '(صعودی ⬆)' : '(نزولی ⬇)'}</span>
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">| {sortedPersonnel.length} کارمند</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPersonnelSortField(null)}
                    className="flex items-center gap-1 text-slate-500 hover:text-rose-700 font-bold hover:underline cursor-pointer text-xs"
                    title="بازنشانی مرتب‌سازی به حالت پیش‌فرض"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>بازنشانی ترتیب</span>
                  </button>
                </div>
              )}

              <div className="overflow-x-auto w-full">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/95 text-slate-700 border-b border-slate-200 text-[11.5px] font-bold">
                      <th className="p-3 w-12 text-center border-l border-slate-200/70">ردیف</th>

                      <th 
                        onClick={() => handlePersonnelSort('lastName')}
                        className={`p-3 cursor-pointer select-none transition-colors border-l border-slate-200/70 hover:bg-slate-200/90 ${
                          personnelSortField === 'lastName' ? 'bg-amber-100/80 text-[#13213c] font-black' : ''
                        }`}
                        title="کلیک برای مرتب‌سازی بر اساس نام خانوادگی"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span>مشخصات و نام خانوادگی</span>
                          {personnelSortField === 'lastName' ? (
                            personnelSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-700" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-700" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                          )}
                        </div>
                      </th>

                      <th 
                        onClick={() => handlePersonnelSort('nationalId')}
                        className={`p-3 cursor-pointer select-none transition-colors border-l border-slate-200/70 hover:bg-slate-200/90 ${
                          personnelSortField === 'nationalId' ? 'bg-amber-100/80 text-[#13213c] font-black' : ''
                        }`}
                        title="کلیک برای مرتب‌سازی بر اساس کد ملی / پرسنلی"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span>کد ملی / پرسنلی</span>
                          {personnelSortField === 'nationalId' ? (
                            personnelSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-700" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-700" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                          )}
                        </div>
                      </th>

                      <th 
                        onClick={() => handlePersonnelSort('role')}
                        className={`p-3 cursor-pointer select-none transition-colors border-l border-slate-200/70 hover:bg-slate-200/90 ${
                          personnelSortField === 'role' ? 'bg-amber-100/80 text-[#13213c] font-black' : ''
                        }`}
                        title="کلیک برای مرتب‌سازی بر اساس سمت و واحد"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span>سمت و واحد سازمانی</span>
                          {personnelSortField === 'role' ? (
                            personnelSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-700" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-700" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                          )}
                        </div>
                      </th>

                      <th 
                        onClick={() => handlePersonnelSort('username')}
                        className={`p-3 cursor-pointer select-none transition-colors border-l border-slate-200/70 hover:bg-slate-200/90 ${
                          personnelSortField === 'username' ? 'bg-amber-100/80 text-[#13213c] font-black' : ''
                        }`}
                        title="کلیک برای مرتب‌سازی بر اساس نام کاربری"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span>نام کاربری و دسترسی‌ها</span>
                          {personnelSortField === 'username' ? (
                            personnelSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-700" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-700" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                          )}
                        </div>
                      </th>

                      <th 
                        onClick={() => handlePersonnelSort('mobile')}
                        className={`p-3 cursor-pointer select-none transition-colors border-l border-slate-200/70 hover:bg-slate-200/90 ${
                          personnelSortField === 'mobile' ? 'bg-amber-100/80 text-[#13213c] font-black' : ''
                        }`}
                        title="کلیک برای مرتب‌سازی بر اساس شماره تماس"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span>شماره تماس</span>
                          {personnelSortField === 'mobile' ? (
                            personnelSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-700" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-700" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                          )}
                        </div>
                      </th>

                      <th 
                        onClick={() => handlePersonnelSort('employmentStatus')}
                        className={`p-3 cursor-pointer select-none transition-colors border-l border-slate-200/70 hover:bg-slate-200/90 ${
                          personnelSortField === 'employmentStatus' ? 'bg-amber-100/80 text-[#13213c] font-black' : ''
                        }`}
                        title="کلیک برای مرتب‌سازی بر اساس نوع قرارداد و وضعیت"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span>نوع قرارداد و وضعیت</span>
                          {personnelSortField === 'employmentStatus' ? (
                            personnelSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-700" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-700" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                          )}
                        </div>
                      </th>

                      <th className="p-3 text-center border-l border-slate-200/70">مدارک شناسایی</th>
                      <th className="p-3 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80">
                    {sortedPersonnel.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-10 text-center text-slate-400">
                          هیچ پرسنلی با این مشخصات یافت نشد.
                        </td>
                      </tr>
                    ) : (
                      sortedPersonnel.map((emp, idx) => {
                        const lastName = getLastName(emp.name);
                        const firstName = (emp.name || '').replace(lastName, '').trim();
                        const isEven = idx % 2 === 0;

                        return (
                          <tr
                            key={emp.id}
                            className={`group cursor-pointer transition-all duration-150 ${
                              isEven ? 'bg-white' : 'bg-slate-50/60'
                            } hover:bg-amber-50/80 hover:shadow-xs`}
                            onClick={() => {
                              setSelectedEmployeeId(emp.id);
                              setShowEmployeeDetail(true);
                            }}
                          >
                            <td className="p-3 text-center text-slate-400 font-mono text-[11px] border-l border-slate-200/60 group-hover:text-amber-800 group-hover:font-bold group-hover:border-r-3 group-hover:border-r-[#13213c] transition-all">
                              {idx + 1}
                            </td>
                            <td className="p-3 border-l border-slate-200/60">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={emp.avatar}
                                  alt={emp.name}
                                  className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                                />
                                <div>
                                  <div className="text-slate-900 group-hover:text-[#13213c] transition-colors leading-snug">
                                    <span className="text-slate-600 ml-1">{firstName}</span>
                                    <span className="font-black text-slate-900 text-xs">{lastName}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    {emp.latinName || emp.id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-700 text-xs border-l border-slate-200/60">
                              <div>{emp.nationalId}</div>
                              <div className="text-[10.5px] text-slate-400 font-normal">{emp.id}</div>
                            </td>
                            <td className="p-3 border-l border-slate-200/60">
                              <div className="font-bold text-amber-800 text-[11.5px]">{emp.role}</div>
                              <div className="text-[10.5px] text-slate-500">{emp.unit} | {emp.positionLevel}</div>
                            </td>
                            <td className="p-3 border-l border-slate-200/60">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="font-mono font-bold text-[11px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
                                  {emp.username || 'user'}
                                </span>
                                {emp.isManager && (
                                  <span className="text-[9.5px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                                    مدیر ارشد
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {emp.permissions?.finance && (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 rounded">
                                    مالی
                                  </span>
                                )}
                                {emp.permissions?.projects && (
                                  <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-1 rounded">
                                    پروژه‌ها
                                  </span>
                                )}
                                {emp.permissions?.crm && (
                                  <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-200 px-1 rounded">
                                    CRM
                                  </span>
                                )}
                                {emp.permissions?.letters && (
                                  <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200 px-1 rounded">
                                    نامه‌ها
                                  </span>
                                )}
                                {emp.permissions?.hr && (
                                  <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1 rounded">
                                    پرسنلی
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 font-mono text-slate-700 text-xs border-l border-slate-200/60">
                              <div>{emp.mobile || '-'}</div>
                              <div className="text-[10px] text-slate-400">{emp.homePhone || ''}</div>
                            </td>
                            <td className="p-3 border-l border-slate-200/60">
                              <span className="inline-block text-[10.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                                {emp.employmentStatus || 'شاغل / فعال'}
                              </span>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {emp.contractType || 'قانون کار'}
                              </div>
                            </td>
                            <td className="p-3 text-center border-l border-slate-200/60">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
                                <FileCheck className="w-3 h-3" />
                                <span>کامل و تأییدشده</span>
                              </span>
                            </td>
                            <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedEmployeeId(emp.id);
                                    setShowEmployeeDetail(true);
                                  }}
                                  className="text-xs bg-[#13213c] hover:bg-[#1d325a] text-white px-2.5 py-1.5 rounded-lg font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                                  title="مشاهده جزئیات پرونده"
                                >
                                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                                  <span>مشاهده</span>
                                </button>

                                {currentUser.isManager && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleEditEmployee(emp)}
                                      className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-2 py-1.5 rounded-lg font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                                      title="ویرایش کامل پرونده پرسنلی"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                                      <span>ویرایش پرونده</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                                      className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-1.5 rounded-lg font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                                      title="حذف پرونده کارمند"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>حذف</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. PAYROLL & COMPENSATION */}
      {currentSubView === 'payroll' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-[#13213c] flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>حقوق و دستمزد قانون کار شرکت مهندسی رابو</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                محاسبه بر مبنای کارکرد تأییدشده، ۴۴ ساعت کار هفتگی، اضافه‌کاری ۱.۴ برابر، و حق بیمه سهم کارمند (۷٪)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-bold text-[11.5px]">
                  <th className="p-3 border-l border-slate-200/70">کارمند</th>
                  <th className="p-3 border-l border-slate-200/70">کارکرد</th>
                  <th className="p-3 border-l border-slate-200/70">اضافه‌کار</th>
                  <th className="p-3 border-l border-slate-200/70">حقوق پایه</th>
                  <th className="p-3 border-l border-slate-200/70">مزایای مصوب</th>
                  <th className="p-3 border-l border-slate-200/70">پورسانت</th>
                  <th className="p-3 border-l border-slate-200/70">بیمه ۷٪</th>
                  <th className="p-3 border-l border-slate-200/70">خالص پرداختی</th>
                  <th className="p-3 text-center">فیش رسمی A5</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {personnelList
                  .filter(p => currentUser.isManager || p.id === currentUser.id)
                  .map((person, idx) => {
                    const pay = calculatePayroll(person);
                    const isEven = idx % 2 === 0;
                    return (
                      <tr 
                        key={person.id} 
                        className={`group transition-all duration-150 ${
                          isEven ? 'bg-white' : 'bg-slate-50/60'
                        } hover:bg-amber-50/70`}
                      >
                        <td className="p-3 border-l border-slate-200/60 group-hover:border-r-3 group-hover:border-r-[#13213c] transition-all">
                          <div className="font-bold text-slate-800">{person.name}</div>
                          <div className="text-[10px] text-slate-400">{person.unit}</div>
                        </td>
                        <td className="p-3 text-slate-600 font-mono border-l border-slate-200/60">{pay.worked} ساعت</td>
                        <td className="p-3 text-slate-600 font-mono border-l border-slate-200/60">{pay.overtime} ساعت</td>
                        <td className="p-3 font-mono text-slate-800 border-l border-slate-200/60">{pay.base.toLocaleString('fa-IR')}</td>
                        <td className="p-3 font-mono text-slate-800 border-l border-slate-200/60">{(pay.housing + pay.grocery + pay.child).toLocaleString('fa-IR')}</td>
                        <td className="p-3 font-mono text-slate-800 border-l border-slate-200/60">{pay.projectCommission.toLocaleString('fa-IR')}</td>
                        <td className="p-3 font-mono text-rose-600 border-l border-slate-200/60">{pay.employeeInsurance.toLocaleString('fa-IR')}</td>
                        <td className="p-3 font-mono font-bold text-emerald-700 border-l border-slate-200/60">{pay.net.toLocaleString('fa-IR')} ریال</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setPreviewPayslipPerson(person)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-700" />
                              <span>پیش‌نمایش A4</span>
                            </button>
                            <button
                              onClick={() => printPayslip(person)}
                              className="bg-[#13213c] hover:bg-[#1d325a] text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1 shadow-2xs"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>چاپ فیش A4</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Interactive Official A4 Payslip Preview Modal */}
          {previewPayslipPerson && (() => {
            const x = calculatePayroll(previewPayslipPerson);
            return (
              <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl border-2 border-[#13213c] max-w-4xl w-full p-6 shadow-2xl space-y-5 text-xs">
                  <div className="flex items-center justify-between border-b-2 border-[#13213c] pb-4">
                    <div>
                      <h4 className="text-base font-black text-[#13213c]">شرکت مهندسی رهنمون کیفیت رابو (سهامی خاص)</h4>
                      <p className="text-xs font-bold text-amber-700 mt-0.5">فیش رسمی حقوق و دستمزد استاندارد A4 - منطبق بر قانون کار و تأمین اجتماعی</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => printPayslip(previewPayslipPerson)}
                        className="bg-[#13213c] hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-amber-400" />
                        <span>چاپ رسمی A4</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewPayslipPerson(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-bold cursor-pointer"
                      >
                        بستن
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div><span className="text-slate-400 block text-[10px]">نام و نام خانوادگی:</span><strong>{previewPayslipPerson.name}</strong></div>
                    <div><span className="text-slate-400 block text-[10px]">کد ملی:</span><strong>{toFa(previewPayslipPerson.nationalId || '-')}</strong></div>
                    <div><span className="text-slate-400 block text-[10px]">واحد سازمانی:</span><strong>{previewPayslipPerson.unit}</strong></div>
                    <div><span className="text-slate-400 block text-[10px]">سمت:</span><strong>{previewPayslipPerson.role}</strong></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-[#13213c] text-white px-4 py-2.5 font-bold">الف) مزایا و فوق‌العاده‌های قانونی (ریال)</div>
                      <div className="divide-y divide-slate-100 p-3 space-y-2">
                        <div className="flex justify-between pt-1"><span>حقوق پایه ماهانه ({toFa(x.daysInMonth)} روز)</span><strong className="font-mono">{x.base.toLocaleString('fa-IR')}</strong></div>
                        <div className="flex justify-between pt-2"><span>حق مسکن مصوب</span><strong className="font-mono">{x.housing.toLocaleString('fa-IR')}</strong></div>
                        <div className="flex justify-between pt-2"><span>بن خواروبار و رفاهی</span><strong className="font-mono">{x.grocery.toLocaleString('fa-IR')}</strong></div>
                        <div className="flex justify-between pt-2"><span>حق اولاد</span><strong className="font-mono">{x.child.toLocaleString('fa-IR')}</strong></div>
                        <div className="flex justify-between pt-2"><span>فوق‌العاده اضافه‌کاری ({toFa(x.overtime)} ساعت)</span><strong className="font-mono">{x.overtimePay.toLocaleString('fa-IR')}</strong></div>
                        <div className="flex justify-between pt-2"><span>پورسانت و کارانه پروژه‌ها</span><strong className="font-mono">{x.projectCommission.toLocaleString('fa-IR')}</strong></div>
                        <div className="flex justify-between pt-2 font-black text-emerald-800 bg-emerald-50 p-2 rounded"><span>جمع کل ناخالص مزایا</span><span>{x.gross.toLocaleString('fa-IR')} ریال</span></div>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-[#800000] text-white px-4 py-2.5 font-bold">ب) کسورات قانونی و توافقی (ریال)</div>
                      <div className="divide-y divide-slate-100 p-3 space-y-2">
                        <div className="flex justify-between pt-1"><span>حق بیمه تأمین اجتماعی سهم کارمند (۷٪)</span><strong className="font-mono">{x.employeeInsurance.toLocaleString('fa-IR')}</strong></div>
                        <div className="flex justify-between pt-2"><span>مالیات بر حقوق ماهانه</span><strong className="font-mono">۰</strong></div>
                        <div className="flex justify-between pt-2"><span>مساعده و علی‌الحساب دریافتی</span><strong className="font-mono">{x.advance.toLocaleString('fa-IR')}</strong></div>
                        <div className="flex justify-between pt-2 font-black text-rose-800 bg-rose-50 p-2 rounded"><span>جمع کل کسورات</span><span>{(x.employeeInsurance + x.advance).toLocaleString('fa-IR')} ریال</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#13213c] text-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-black">خالص پرداختی قابل واریز:</div>
                      <div className="text-xs text-amber-300 mt-1">به حروف: {numberToPersianWords(x.net)} ریال تمام</div>
                    </div>
                    <div className="text-lg font-black text-amber-400 font-mono">
                      {x.net.toLocaleString('fa-IR')} ریال
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center pt-2">
                    <div className="border border-dashed border-slate-300 rounded-xl p-4">امضای کارمند ({previewPayslipPerson.name})</div>
                    <div className="border border-dashed border-slate-300 rounded-xl p-4">امور مالی و حسابداری رابو</div>
                    <div className="border border-dashed border-slate-300 rounded-xl p-4">مهر و امضای مدیریت ارشد رابو</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 4. STRUCTURED KPI TRACKING VIEW */}
      {currentSubView === 'kpi' && (
        <KpiTrackingModule
          currentUser={currentUser}
          personnelList={personnelList}
          kpiIndicators={activeKpiIndicators}
          setKpiIndicators={activeSetKpiIndicators}
          kpiEvaluations={activeKpiEvaluations}
          setKpiEvaluations={activeSetKpiEvaluations}
          setToastMessage={setToastMessage}
        />
      )}

      {/* 5. TRAINING MATRIX */}
      {currentSubView === 'training' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-[#13213c] flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>ماتریس شایستگی و آموزش پرسنل</span>
            </h3>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-3 items-center">
            <select
              value={selectedTrainingEmployee}
              onChange={e => setSelectedTrainingEmployee(e.target.value)}
              className="text-xs p-2 border border-slate-300 rounded-lg outline-none bg-white"
            >
              <option value="">انتخاب کارمند</option>
              {personnelList.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="عنوان دوره آموزشی (مثال: استاندارد NFPA 13 یا ISO 9001)"
              value={trainingCourse}
              onChange={e => setTrainingCourse(e.target.value)}
              className="text-xs p-2 border border-slate-300 rounded-lg outline-none flex-1 bg-white"
            />
            <button
              onClick={() => {
                if (!selectedTrainingEmployee || !trainingCourse.trim()) return;
                setTrainingRecords([
                  {
                    id: Date.now(),
                    employeeId: selectedTrainingEmployee,
                    course: trainingCourse,
                    status: 'نیازمند آموزش',
                    result: 'دوره برنامه‌ریزی شد'
                  },
                  ...trainingRecords
                ]);
                setTrainingCourse('');
                setToastMessage('دوره به ماتریس آموزشی اضافه گردید.');
              }}
              className="bg-[#13213c] hover:bg-[#1d325a] text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all"
            >
              افزودن به ماتریس
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="p-3">کارمند</th>
                  <th className="p-3">دوره آموزشی</th>
                  <th className="p-3">وضعیت</th>
                  <th className="p-3">نتیجه ارزیابی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trainingRecords.map(t => (
                  <tr key={t.id}>
                    <td className="p-3 font-bold text-slate-800">
                      {personnelList.find(p => p.id === t.employeeId)?.name}
                    </td>
                    <td className="p-3 text-slate-700">{t.course}</td>
                    <td className="p-3">
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{t.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Log Attendance / Mission / Leave */}
      {showLogAttendanceModal && (
        <div className="fixed inset-0 bg-[#13213c]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-[#13213c]">
                ثبت کارکرد / مأموریت / مرخصی ({attendanceForm.date})
              </h3>
              <button
                onClick={() => setShowLogAttendanceModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                const newRec: AttendanceRecord = {
                  id: `ATT-${Date.now()}`,
                  employeeId: currentUser.id,
                  employeeName: currentUser.name,
                  date: attendanceForm.date,
                  type: attendanceForm.type,
                  startTime: attendanceForm.startTime,
                  endTime: attendanceForm.endTime,
                  hoursWorked: Number(attendanceForm.hoursWorked || 0),
                  overtimeHours: Number(attendanceForm.overtimeHours || 0),
                  projectId: attendanceForm.projectId,
                  projectName: projectsList.find(p => p.id === attendanceForm.projectId)?.name || '',
                  description: attendanceForm.description,
                  managerId: attendanceForm.managerId,
                  managerName: personnelList.find(p => p.id === attendanceForm.managerId)?.name || '',
                  approvalStatus: currentUser.isManager ? 'approved' : 'pending',
                  status: currentUser.isManager ? 'تأیید شده' : 'در انتظار تأیید مدیر',
                  missionLocation: attendanceForm.missionLocation,
                  meetingType: attendanceForm.meetingType
                };
                setAttendanceRecords([newRec, ...attendanceRecords]);
                setShowLogAttendanceModal(false);
                setToastMessage(currentUser.isManager ? 'تردد ثبت و تأیید گردید.' : 'درخواست به کارتابل مدیر ارسال شد.');
              }}
              className="p-5 space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع کارکرد / درخواست</label>
                  <select
                    value={attendanceForm.type}
                    onChange={e => setAttendanceForm({ ...attendanceForm, type: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none"
                  >
                    <option value="کارکرد عادی">کارکرد عادی</option>
                    <option value="مأموریت روزانه">مأموریت روزانه</option>
                    <option value="ماموریت جلسه">ماموریت جلسه</option>
                    <option value="مرخصی استحقاقی">مرخصی استحقاقی</option>
                    <option value="مرخصی ساعتی">مرخصی ساعتی</option>
                    <option value="مرخصی استعلاجی">مرخصی استعلاجی</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مدیر تأییدکننده</label>
                  <select
                    value={attendanceForm.managerId}
                    onChange={e => setAttendanceForm({ ...attendanceForm, managerId: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none"
                  >
                    {personnelList.filter(p => p.isManager).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">از ساعت</label>
                  <input
                    type="time"
                    value={attendanceForm.startTime}
                    onChange={e => setAttendanceForm({ ...attendanceForm, startTime: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تا ساعت</label>
                  <input
                    type="time"
                    value={attendanceForm.endTime}
                    onChange={e => setAttendanceForm({ ...attendanceForm, endTime: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مدت کارکرد (ساعت)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={attendanceForm.hoursWorked}
                    onChange={e => setAttendanceForm({ ...attendanceForm, hoursWorked: Number(e.target.value) })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اضافه‌کار (ساعت)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={attendanceForm.overtimeHours}
                    onChange={e => setAttendanceForm({ ...attendanceForm, overtimeHours: Number(e.target.value) })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">پروژه مرتبط</label>
                <select
                  value={attendanceForm.projectId}
                  onChange={e => setAttendanceForm({ ...attendanceForm, projectId: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none"
                >
                  <option value="">انتخاب پروژه</option>
                  {projectsList.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">شرح فعالیت یا مأموریت *</label>
                  <VoiceInputButton onTranscript={(t) => setAttendanceForm(prev => ({ ...prev, description: prev.description ? `${prev.description} ${t}` : t }))} />
                </div>
                <textarea
                  rows={2}
                  required
                  value={attendanceForm.description}
                  onChange={e => setAttendanceForm({ ...attendanceForm, description: e.target.value })}
                  placeholder="اقدامات انجام شده در پروژه یا محل مأموریت..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLogAttendanceModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="bg-[#800000] hover:bg-[#9a0000] text-white px-5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-sm"
                >
                  ثبت نهایی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Detailed Employee Dossier View */}
      {showEmployeeDetail && selectedEmployeeId && (() => {
        const emp = personnelList.find(p => p.id === selectedEmployeeId);
        if (!emp) return null;
        return (
          <div className="fixed inset-0 bg-[#13213c]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#13213c] text-white flex items-center justify-center font-bold text-xs">
                    RB
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#13213c]">
                      پرونده پرسنلی الکترونیک: {emp.name} ({emp.id})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      ثبت شده در دبیرخانه و کارگزینی مهندسی رابو | کد پرسنلی: {emp.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEmployeeDetail(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto text-xs flex-1">
                {/* Profile Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 bg-slate-50/70 p-4 rounded-xl">
                  <div className="flex items-center gap-4">
                    <img
                      src={emp.avatar}
                      alt={emp.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 shadow-sm"
                    />
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">{emp.name}</h4>
                      <p className="text-slate-500">{emp.latinName || 'Reza Mohammadi'} | فرزند {emp.fatherName || 'حسین'}</p>
                      <p className="text-amber-700 font-bold mt-0.5">{emp.role} - دپارتمان {emp.unit}</p>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="inline-block bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold text-[11px]">
                      وضعیت: {emp.employmentStatus || 'شاغل فعال'}
                    </span>
                    <div className="text-[11px] text-slate-500 mt-1">
                      جایگاه: <strong className="text-slate-800">{emp.positionLevel}</strong>
                    </div>
                  </div>
                </div>

                {/* Section 1: Identity & Civil info */}
                <div>
                  <h5 className="font-bold text-slate-800 mb-2 pb-1 border-b border-slate-200">
                    ۱. مشخصات هویتی و شناسنامه‌ای
                  </h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">کد ملی</span>
                      <strong className="font-mono text-slate-800">{emp.nationalId}</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">شماره شناسنامه</span>
                      <strong className="text-slate-800">{emp.idCertificate}</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">تاریخ تولد شمسی</span>
                      <strong className="text-slate-800">{emp.birthDate}</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">جنسیت</span>
                      <strong className="text-slate-800">{emp.gender}</strong>
                    </div>
                  </div>
                </div>

                {/* Section 2: Contact & Address with Google Maps */}
                <div>
                  <h5 className="font-bold text-slate-800 mb-2 pb-1 border-b border-slate-200 flex items-center justify-between">
                    <span>۲. ارتباطات و نشانی سکونت</span>
                    {onInspectLocation && (
                      <button
                        type="button"
                        onClick={() => onInspectLocation(`نشانی سکونت پرسنل: ${emp.homeAddress}`)}
                        className="text-[11px] bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3 text-red-600" />
                        <span>مکان‌یابی در Google Maps</span>
                      </button>
                    )}
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-2">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">تلفن همراه</span>
                      <strong className="font-mono text-slate-800">{emp.mobile || '۰۹۱۲...'}</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">تلفن منزل</span>
                      <strong className="font-mono text-slate-800">{emp.homePhone || '-'}</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">کد پستی</span>
                      <strong className="font-mono text-slate-800">{emp.postalCode || '-'}</strong>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] mb-0.5">آدرس دقیق محل سکونت:</span>
                    <span className="text-slate-800 font-medium">{emp.homeAddress}</span>
                  </div>
                </div>

                {/* Section 3: Relatives & Emergency Contacts */}
                <div>
                  <h5 className="font-bold text-slate-800 mb-2 pb-1 border-b border-slate-200">
                    ۳. مشخصات بستگان درجه یک و معرفین اضطراری
                  </h5>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-700 leading-relaxed">
                    {emp.relativeContact || 'مهندس حسینی (برادر) - 09121112233 - سعادت‌آباد'}
                  </div>
                </div>

                {/* Section 4: Contract, Guarantee & Legal */}
                <div>
                  <h5 className="font-bold text-slate-800 mb-2 pb-1 border-b border-slate-200">
                    ۴. ساختار قرارداد و تضامین حسن انجام کار
                  </h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">نوع قرارداد</span>
                      <strong>{emp.contractType || 'قرارداد رسمی قانون کار'}</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">شروع همکاری</span>
                      <strong>{emp.serviceStartDate || '۱۴۰۰/۰۱/۱۵'}</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">نوع ضمانت</span>
                      <strong className="text-amber-800">{emp.guaranteeType || 'چک صیادی'}</strong>
                    </div>
                  </div>
                  <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200 mt-2">
                    <span className="text-amber-900 block text-[10px] font-bold mb-0.5">جزئیات تضمین و پرونده ضمانتی:</span>
                    <span className="text-slate-800">{emp.guaranteeDetails || 'سفته تضمین حسن انجام کار به مبلغ ۲۰۰ میلیون تومان در گاوصندوق شرکت'}</span>
                  </div>
                </div>

                {/* Section 5: Compensation details */}
                <div>
                  <h5 className="font-bold text-slate-800 mb-2 pb-1 border-b border-slate-200">
                    ۵. اقلام حقوقی و مزایای قانون کار
                  </h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">حقوق پایه ماهانه</span>
                      <strong className="font-mono">{emp.baseMonthlySalary} ریال</strong>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">حق مسکن</span>
                      <strong className="font-mono">{emp.housingAllowance} ریال</strong>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">بن خواروبار</span>
                      <strong className="font-mono">{emp.groceryAllowance} ریال</strong>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">پورسانت پروژه‌ها</span>
                      <strong className="font-mono text-emerald-700">{emp.projectCommissionRate || 3}٪</strong>
                    </div>
                  </div>
                </div>

                {/* Section 6: Education & Nezam Mohandesi */}
                <div>
                  <h5 className="font-bold text-slate-800 mb-2 pb-1 border-b border-slate-200">
                    ۶. سوابق تحصیلی و پروانه نظام مهندسی
                  </h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">مقطع تحصیلی</span>
                      <strong className="text-slate-800">{emp.educationLevel || 'کارشناسی ارشد'}</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">رشته تحصیلی</span>
                      <strong className="text-slate-800">{emp.educationField || 'مهندسی عمران / ایمنی'}</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">دانشگاه</span>
                      <strong className="text-slate-800">{emp.universityName || 'دانشگاه تهران'}</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">پروانه نظام مهندسی</span>
                      <strong className="text-amber-800">{emp.nezamMohandesiLicense?.grade || 'پایه ۲'} ({emp.nezamMohandesiLicense?.branch || 'تاسیسات'})</strong>
                    </div>
                  </div>
                </div>

                {/* Section 7: Bank & Account details */}
                <div>
                  <h5 className="font-bold text-slate-800 mb-2 pb-1 border-b border-slate-200">
                    ۷. اطلاعات حساب بانکی جهت واریز حقوق
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">بانک عامل</span>
                      <strong className="text-slate-800">{emp.bankName || 'بانک ملت'}</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">شماره حساب / کارت</span>
                      <strong className="font-mono text-slate-800">{emp.bankCardNo || emp.bankAccountNo || '۶۱۰۴-۳۳۷۸-...'}</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">شماره شبا (IBAN)</span>
                      <strong className="font-mono text-slate-800 text-[11px]">{emp.bankSheba || 'IR-'}</strong>
                    </div>
                  </div>
                </div>

                {/* Section 8: Google Maps Location Preview */}
                <div>
                  <h5 className="font-bold text-slate-800 mb-2 pb-1 border-b border-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      <span>۸. موقعیت مکانی سکونت روی Google Maps</span>
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${emp.mapLocation?.lat || 35.7820},${emp.mapLocation?.lng || 51.3730}&z=15&hl=fa`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-md text-[11px] font-bold"
                    >
                      مشاهده مستقیم در Google Maps
                    </a>
                  </h5>
                  <div className="rounded-xl overflow-hidden border border-slate-200 h-44 w-full relative">
                    <iframe
                      title="Employee Residence Location"
                      src={`https://maps.google.com/maps?q=${emp.mapLocation?.lat || 35.7820},${emp.mapLocation?.lng || 51.3730}&z=14&output=embed&hl=fa`}
                      className="w-full h-full border-0"
                    />
                  </div>
                </div>

                {/* Section 9: Documents & Manager Notes */}
                {currentUser.isManager && emp.managerNotes && (
                  <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-600 block text-[10px] font-bold mb-0.5">یادداشت‌های محرمانه مدیریتی:</span>
                    <span className="text-slate-800">{emp.managerNotes}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal 3: Comprehensive Onboarding New Employee */}
      {showOnboardModal && (
        <div className="fixed inset-0 bg-[#13213c]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header - سرمه‌ای دقیقا مثل ثبت پرونده‌های CRM طبق دستور کاربر */}
            <div className="p-4 sm:p-5 border-b border-amber-500/20 flex items-center justify-between bg-[#13213c] text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-400 text-[#13213c] flex items-center justify-center font-black">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-black text-white">
                    {editingEmployeeId ? `ویرایش پرونده پرسنلی: ${onboardForm.name || 'کارمند'}` : 'فرم جامع استخدام و تشکیل پرونده پرسنلی کارمند جدید (آنبوردینگ)'}
                  </h3>
                  <p className="text-[11px] text-amber-200/90 mt-0.5 font-medium">
                    {editingEmployeeId ? 'بروزرسانی مشخصات هویتی، تماس، مدارک شناسایی، تضامین، حقوق و سطح دسترسی‌ها' : 'ثبت مشخصات هویتی، بارگذاری مدارک شناسایی، تضامین، اطلاعات حقوق و تعیین دقیق سطح دسترسی‌ها'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOnboardModal(false)}
                className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg p-1.5 font-bold cursor-pointer transition-colors"
                title="بستن فرم"
              >
                ✕
              </button>
            </div>

            {/* Tab Navigation inside Onboard Modal */}
            <div className="flex items-center gap-1 overflow-x-auto bg-slate-100 p-2 border-b border-slate-200 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setOnboardActiveTab('identity')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                  onboardActiveTab === 'identity' ? 'bg-white text-[#13213c] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ۱. هویتی و شناسنامه‌ای
              </button>
              <button
                type="button"
                onClick={() => setOnboardActiveTab('contact')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  onboardActiveTab === 'contact' ? 'bg-white text-red-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                <span>۲. نشانی و نقشه (Google Maps)</span>
              </button>
              <button
                type="button"
                onClick={() => setOnboardActiveTab('education')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                  onboardActiveTab === 'education' ? 'bg-white text-[#13213c] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ۳. تحصیلی و نظام مهندسی
              </button>
              <button
                type="button"
                onClick={() => setOnboardActiveTab('job')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                  onboardActiveTab === 'job' ? 'bg-white text-[#13213c] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ۴. شغل و مسئولیت
              </button>
              <button
                type="button"
                onClick={() => setOnboardActiveTab('salary')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                  onboardActiveTab === 'salary' ? 'bg-white text-[#13213c] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ۵. حقوق و حساب بانکی
              </button>
              <button
                type="button"
                onClick={() => setOnboardActiveTab('documents')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  onboardActiveTab === 'documents' ? 'bg-white text-[#13213c] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-amber-500" />
                <span>۶. بارگذاری مدارک شناسایی</span>
              </button>
              <button
                type="button"
                onClick={() => setOnboardActiveTab('guarantee')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                  onboardActiveTab === 'guarantee' ? 'bg-white text-[#13213c] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ۷. تضامین، چک و معرفین
              </button>
              <button
                type="button"
                onClick={() => setOnboardActiveTab('account')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                  onboardActiveTab === 'account' ? 'bg-white text-[#13213c] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ۸. نام کاربری و سطح دسترسی‌ها
              </button>
            </div>

            {/* Modal Form Body */}
            <form
              onSubmit={e => {
                e.preventDefault();
                const isNewManager = onboardForm.positionLevel === 'مدیر ارشد';
                const effectivePermissions: EmployeePermissions = isNewManager
                  ? { ...FULL_MANAGER_PERMISSIONS }
                  : {
                      ...EMPTY_EMPLOYEE_PERMISSIONS,
                      ...onboardForm.permissions,
                      dashboard: Boolean(onboardForm.permissions?.dashboard_personal || onboardForm.permissions?.dashboard_executive),
                      letters: Boolean(onboardForm.permissions?.letters_inbox || onboardForm.permissions?.letters_outbox_create || onboardForm.permissions?.letters_archive),
                      crm: Boolean(onboardForm.permissions?.crm_fire || onboardForm.permissions?.crm_energy || onboardForm.permissions?.crm_management || onboardForm.permissions?.crm_customers || onboardForm.permissions?.crm_followups),
                      projects: Boolean(onboardForm.permissions?.projects_view || onboardForm.permissions?.projects_manage),
                      tasks: Boolean(onboardForm.permissions?.tasks_board || onboardForm.permissions?.tasks_chat),
                      finance: Boolean(onboardForm.permissions?.finance_petty_cash || onboardForm.permissions?.finance_audit),
                      hr: Boolean(onboardForm.permissions?.hr_employees || onboardForm.permissions?.hr_attendance || onboardForm.permissions?.hr_payroll || onboardForm.permissions?.hr_kpi || onboardForm.permissions?.hr_training)
                    };

                const firstNezam = onboardForm.nezamLicenses && onboardForm.nezamLicenses.length > 0
                  ? {
                      licenseNo: onboardForm.nezamLicenses[0].licenseNo,
                      grade: onboardForm.nezamLicenses[0].grade,
                      branch: onboardForm.nezamLicenses[0].discipline,
                      validUntil: onboardForm.nezamLicenses[0].validUntil || ''
                    }
                  : onboardForm.nezamMohandesiLicense;

                if (editingEmployeeId) {
                  // Edit existing employee
                  setPersonnelList(prev => prev.map(p => {
                    if (p.id === editingEmployeeId) {
                      return {
                        ...p,
                        ...onboardForm,
                        motherName: onboardForm.motherFullName || onboardForm.motherName,
                        motherFullName: onboardForm.motherFullName || onboardForm.motherName,
                        nezamMohandesiLicense: firstNezam,
                        isManager: isNewManager || p.isManager,
                        relativeContact: onboardForm.relatives.map(r => `${r.name} (${r.relation}) - ${r.mobile || r.phone}`).filter(Boolean).join(' | '),
                        permissions: effectivePermissions
                      };
                    }
                    return p;
                  }));
                  setShowOnboardModal(false);
                  setEditingEmployeeId(null);
                  setToastMessage(`اطلاعات پرونده پرسنلی ${onboardForm.name} با موفقیت ویرایش و ذخیره شد.`);
                } else {
                  // Create new employee
                  const newId = `EMP-${String(personnelList.length + 1).padStart(2, '0')}`;
                  const newEmp: Employee = {
                    ...onboardForm,
                    id: newId,
                    motherName: onboardForm.motherFullName || onboardForm.motherName,
                    motherFullName: onboardForm.motherFullName || onboardForm.motherName,
                    nezamMohandesiLicense: firstNezam,
                    isManager: isNewManager,
                    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250',
                    relativeContact: onboardForm.relatives.map(r => `${r.name} (${r.relation}) - ${r.mobile || r.phone}`).filter(Boolean).join(' | '),
                    permissions: effectivePermissions
                  };
                  setPersonnelList([...personnelList, newEmp]);
                  setShowOnboardModal(false);
                  setToastMessage(`پرونده پرسنلی کامل ${newEmp.name} تشکیل و در سامانه ثبت گردید.`);
                }
              }}
              className="p-6 space-y-4 overflow-y-auto flex-1 text-xs"
            >
              {/* TAB 1: Identity & Civil */}
              {onboardActiveTab === 'identity' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <h4 className="font-bold text-slate-800 pb-2 border-b border-slate-200">
                    اطلاعات هویتی و شناسنامه‌ای پرسنل
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">نام و نام خانوادگی *</label>
                      <input
                        type="text"
                        required
                        value={onboardForm.name}
                        onChange={e => setOnboardForm({ ...onboardForm, name: e.target.value })}
                        placeholder="مهندس علی حسینی"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">نام و نام خانوادگی لاتین</label>
                      <input
                        type="text"
                        value={onboardForm.latinName}
                        onChange={e => setOnboardForm({ ...onboardForm, latinName: e.target.value })}
                        placeholder="Ali Hosseini"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">نام پدر</label>
                      <input
                        type="text"
                        value={onboardForm.fatherName}
                        onChange={e => setOnboardForm({ ...onboardForm, fatherName: e.target.value })}
                        placeholder="محمد"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">نام و نام خانوادگی مادر</label>
                      <input
                        type="text"
                        value={onboardForm.motherFullName || onboardForm.motherName}
                        onChange={e => setOnboardForm({ ...onboardForm, motherName: e.target.value, motherFullName: e.target.value })}
                        placeholder="زهرا کاظمی"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">کد ملی (۱۰ رقم) *</label>
                      <input
                        type="text"
                        required
                        value={onboardForm.nationalId}
                        onChange={e => setOnboardForm({ ...onboardForm, nationalId: e.target.value })}
                        placeholder="0071829341"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono placeholder:text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">شماره شناسنامه</label>
                      <input
                        type="text"
                        value={onboardForm.idCertificate}
                        onChange={e => setOnboardForm({ ...onboardForm, idCertificate: e.target.value })}
                        placeholder="۴۸۲۹"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono placeholder:text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">سری و سریال شناسنامه</label>
                      <input
                        type="text"
                        value={onboardForm.birthCertificateSerial}
                        onChange={e => setOnboardForm({ ...onboardForm, birthCertificateSerial: e.target.value })}
                        placeholder="الف/۲۴ - ۹۸۲۳۴۵"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono placeholder:text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">محل صدور شناسنامه</label>
                      <input
                        type="text"
                        value={onboardForm.birthPlace}
                        onChange={e => setOnboardForm({ ...onboardForm, birthPlace: e.target.value })}
                        placeholder="تهران - حوزه ۱"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">تاریخ تولد شمسی</label>
                      <ShamsiDatePicker
                        value={onboardForm.birthDate}
                        onChange={val => {
                          const greg = jalaliStringToGregorian(val);
                          setOnboardForm(prev => ({
                            ...prev,
                            birthDate: val,
                            birthDateGregorian: greg || prev.birthDateGregorian
                          }));
                        }}
                        placeholder="۱۳۶۸/۰۵/۲۰"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">تاریخ تولد میلادی</label>
                      <input
                        type="date"
                        value={onboardForm.birthDateGregorian}
                        onChange={e => setOnboardForm({ ...onboardForm, birthDateGregorian: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none bg-white font-mono text-left"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">جنسیت</label>
                      <select
                        value={onboardForm.gender}
                        onChange={e => setOnboardForm({ ...onboardForm, gender: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                      >
                        <option value="مرد">مرد</option>
                        <option value="زن">زن</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">وضعیت تاهل</label>
                      <select
                        value={onboardForm.maritalStatus}
                        onChange={e => setOnboardForm({ ...onboardForm, maritalStatus: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                      >
                        <option value="مجرد">مجرد</option>
                        <option value="متاهل">متاهل</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">تعداد فرزندان</label>
                      <input
                        type="text"
                        value={onboardForm.childrenCount}
                        onChange={e => setOnboardForm({ ...onboardForm, childrenCount: e.target.value })}
                        placeholder="۰"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">تعداد افراد تحت تکفل</label>
                      <input
                        type="text"
                        value={onboardForm.dependentsCount}
                        onChange={e => setOnboardForm({ ...onboardForm, dependentsCount: e.target.value })}
                        placeholder="۰"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">وضعیت نظام وظیفه</label>
                      <select
                        value={onboardForm.militaryStatus}
                        onChange={e => setOnboardForm({ ...onboardForm, militaryStatus: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                      >
                        <option value="پایان خدمت">کارت پایان خدمت</option>
                        <option value="معافیت دائم">معافیت دائم پزشکی / کفالت</option>
                        <option value="معافیت تحصیلی">معافیت تحصیلی</option>
                        <option value="غیر مشمول">غیر مشمول (بانوان)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">شماره کارت پایان خدمت</label>
                      <input
                        type="text"
                        value={onboardForm.militaryCardNumber}
                        onChange={e => setOnboardForm({ ...onboardForm, militaryCardNumber: e.target.value })}
                        placeholder="شماره سریال کارت هوشمند"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Contact & Address with Google Maps */}
              {onboardActiveTab === 'contact' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h4 className="font-bold text-slate-800">
                      اطلاعات تماس، نشانی و ثبت موقعیت روی Google Maps
                    </h4>
                    {onInspectLocation && (
                      <button
                        type="button"
                        onClick={() => onInspectLocation(`موقعیت مکانی محل سکونت پرسنل: ${onboardForm.homeAddress || 'تهران'}`)}
                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <MapPin className="w-3.5 h-3.5 text-red-600" />
                        <span>بررسی موقعیت مکانی در Google Maps</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">شماره تلفن همراه اصلی *</label>
                      <input
                        type="text"
                        required
                        value={onboardForm.mobile}
                        onChange={e => setOnboardForm({ ...onboardForm, mobile: e.target.value })}
                        placeholder="09121112233"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">شماره همراه دوم / اضطراری</label>
                      <input
                        type="text"
                        value={onboardForm.emergencyMobile}
                        onChange={e => setOnboardForm({ ...onboardForm, emergencyMobile: e.target.value })}
                        placeholder="0912..."
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">تلفن ثابت منزل</label>
                      <input
                        type="text"
                        value={onboardForm.homePhone}
                        onChange={e => setOnboardForm({ ...onboardForm, homePhone: e.target.value })}
                        placeholder="02122334455"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">کد پستی (۱۰ رقم)</label>
                      <input
                        type="text"
                        value={onboardForm.postalCode}
                        onChange={e => setOnboardForm({ ...onboardForm, postalCode: e.target.value })}
                        placeholder="1998765432"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">استان</label>
                      <input
                        type="text"
                        value={onboardForm.province}
                        onChange={e => setOnboardForm({ ...onboardForm, province: e.target.value })}
                        placeholder="تهران"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">شهر</label>
                      <input
                        type="text"
                        value={onboardForm.city}
                        onChange={e => setOnboardForm({ ...onboardForm, city: e.target.value })}
                        placeholder="تهران"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">منطقه شهرداری</label>
                      <input
                        type="text"
                        value={onboardForm.municipalityZone}
                        onChange={e => setOnboardForm({ ...onboardForm, municipalityZone: e.target.value })}
                        placeholder="منطقه ۲ / منطقه ۳"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">آدرس کامل متنی محل سکونت *</label>
                    <textarea
                      rows={2}
                      required
                      value={onboardForm.homeAddress}
                      onChange={e => setOnboardForm({ ...onboardForm, homeAddress: e.target.value })}
                      placeholder="تهران، منطقه ۲، سعادت‌آباد، خیابان سرو غربی، کوچه ارغوان، پلاک ۲۴، واحد ۶"
                      className="w-full p-2.5 border border-slate-300 rounded-lg outline-none leading-relaxed"
                    />
                  </div>

                  {/* Integrated Google Maps Location Picker */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <GoogleMapsLocationPicker
                      initialLocation={onboardForm.mapLocation}
                      onSelectLocation={(loc) => {
                        setOnboardForm(prev => ({
                          ...prev,
                          mapLocation: {
                            lat: loc.lat,
                            lng: loc.lng,
                            addressDescription: loc.addressDescription || ''
                          },
                          homeAddress: loc.addressDescription || prev.homeAddress
                        }));
                      }}
                      title="مکان‌یابی دقیق سکونت پرسنل روی Google Maps و محاسبه فاصله تا دفتر رابو"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: Education & Nezam Mohandesi License */}
              {onboardActiveTab === 'education' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <h4 className="font-bold text-slate-800 pb-2 border-b border-slate-200">
                    سوابق تحصیلی، پروانه‌های اشتغال به کار مهندسی (نظام مهندسی) و سوابق بیمه
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">آخرین مقطع تحصیلی *</label>
                      <select
                        value={onboardForm.educationLevel}
                        onChange={e => setOnboardForm({ ...onboardForm, educationLevel: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none bg-white"
                      >
                        <option value="">انتخاب مقطع تحصیلی...</option>
                        <option value="دیپلم">دیپلم متوسطه</option>
                        <option value="کاردانی">کاردانی (فوق دیپلم)</option>
                        <option value="کارشناسی">کارشناسی (لیسانس)</option>
                        <option value="کارشناسی ارشد">کارشناسی ارشد (فوق لیسانس)</option>
                        <option value="دکتری">دکتری تخصصی (PhD)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">رشته و گرایش تحصیلی *</label>
                      <input
                        type="text"
                        value={onboardForm.educationField}
                        onChange={e => setOnboardForm({ ...onboardForm, educationField: e.target.value })}
                        placeholder="مهندسی عمران / ایمنی و حریق"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none placeholder:text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">دانشگاه / موسسه آموزش عالی</label>
                      <input
                        type="text"
                        value={onboardForm.universityName}
                        onChange={e => setOnboardForm({ ...onboardForm, universityName: e.target.value })}
                        placeholder="دانشگاه تهران / صنعتی شریف"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">سال فراغت از تحصیل</label>
                      <input
                        type="text"
                        value={onboardForm.graduationYear}
                        onChange={e => setOnboardForm({ ...onboardForm, graduationYear: e.target.value })}
                        placeholder="۱۳۹۸"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono placeholder:text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">معدل کل</label>
                      <input
                        type="text"
                        value={onboardForm.gpa}
                        onChange={e => setOnboardForm({ ...onboardForm, gpa: e.target.value })}
                        placeholder="۱۷.۵۰"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  {/* Nezam Mohandesi Multi-Row Section */}
                  <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200/90 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-700" />
                        <span className="font-bold text-amber-950 text-xs">
                          پروانه‌های اشتغال به کار مهندسی (سازمان نظام مهندسی ساختمان):
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNewLicenseRow({
                            id: `lic-${Date.now()}`,
                            discipline: 'عمران',
                            grade: 'پایه ۳',
                            qualification: 'نظارت و محاسبات',
                            licenseNo: '',
                            validUntil: '',
                            documentName: ''
                          });
                          setIsAddingLicense(true);
                        }}
                        className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>افزودن پروانه جدید</span>
                      </button>
                    </div>

                    {/* Adding New License Form */}
                    {isAddingLicense && (
                      <div className="bg-white p-3.5 rounded-xl border border-amber-300 shadow-sm space-y-3 animate-in fade-in duration-150">
                        <div className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-1.5 flex items-center justify-between">
                          <span>ثبت مشخصات پروانه مهندسی جدید</span>
                          <button
                            type="button"
                            onClick={() => setIsAddingLicense(false)}
                            className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[11px] text-slate-700 font-bold mb-1">رشته مهندسی *</label>
                            <select
                              value={newLicenseRow.discipline}
                              onChange={e => setNewLicenseRow({ ...newLicenseRow, discipline: e.target.value })}
                              className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none"
                            >
                              <option value="عمران">مهندسی عمران</option>
                              <option value="معماری">مهندسی معماری</option>
                              <option value="مکانیک">تاسیسات مکانیکی</option>
                              <option value="برق">تاسیسات برقی</option>
                              <option value="نقشه‌برداری">نقشه‌برداری</option>
                              <option value="ترافیک">ترافیک</option>
                              <option value="شهرسازی">شهرسازی</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-700 font-bold mb-1">پایه مهندسی *</label>
                            <select
                              value={newLicenseRow.grade}
                              onChange={e => setNewLicenseRow({ ...newLicenseRow, grade: e.target.value })}
                              className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none"
                            >
                              <option value="پایه ۳">پایه ۳</option>
                              <option value="پایه ۲">پایه ۲</option>
                              <option value="پایه ۱">پایه ۱</option>
                              <option value="پایه ارشد">پایه ارشد</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-700 font-bold mb-1">صلاحیت پروانه *</label>
                            <select
                              value={newLicenseRow.qualification}
                              onChange={e => setNewLicenseRow({ ...newLicenseRow, qualification: e.target.value })}
                              className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none"
                            >
                              <option value="طراحی">طراحی / محاسبات</option>
                              <option value="نظارت">نظارت</option>
                              <option value="اجرا">اجرا (مجری ذیصلاح)</option>
                              <option value="طراحی و نظارت">طراحی و نظارت</option>
                              <option value="بازرسی">بازرسی فنی / گاز / آسانسور</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[11px] text-slate-700 font-bold mb-1">شماره پروانه اشتغال *</label>
                            <input
                              type="text"
                              value={newLicenseRow.licenseNo}
                              onChange={e => setNewLicenseRow({ ...newLicenseRow, licenseNo: e.target.value })}
                              placeholder="۱۰-۳-۰-۱۲۳۴۵"
                              className="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none font-mono placeholder:text-slate-300"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-700 font-bold mb-1">تاریخ انقضای اعتبار</label>
                            <ShamsiDatePicker
                              value={newLicenseRow.validUntil || ''}
                              onChange={val => setNewLicenseRow({ ...newLicenseRow, validUntil: val })}
                              placeholder="۱۴۰۸/۰۴/۳۱"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-700 font-bold mb-1">بارگذاری تصویر پروانه</label>
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setNewLicenseRow(prev => ({ ...prev, documentName: file.name }));
                                }
                              }}
                              className="w-full text-xs text-slate-600 file:mr-0 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-bold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setIsAddingLicense(false)}
                            className="text-xs text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-lg cursor-pointer font-medium"
                          >
                            انصراف
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!newLicenseRow.licenseNo.trim()) {
                                setToastMessage('لطفاً شماره پروانه اشتغال را وارد نمایید.');
                                return;
                              }
                              const updatedLicenses = [...(onboardForm.nezamLicenses || []), { ...newLicenseRow, id: `lic-${Date.now()}` }];
                              setOnboardForm({
                                ...onboardForm,
                                nezamLicenses: updatedLicenses,
                                nezamMohandesiLicense: {
                                  licenseNo: updatedLicenses[0].licenseNo,
                                  grade: updatedLicenses[0].grade,
                                  branch: updatedLicenses[0].discipline,
                                  validUntil: updatedLicenses[0].validUntil || ''
                                }
                              });
                              setIsAddingLicense(false);
                              setToastMessage(`پروانه مهندسی ${newLicenseRow.discipline} با موفقیت افزوده شد.`);
                            }}
                            className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-1.5 rounded-lg cursor-pointer transition-colors"
                          >
                            ثبت و افزودن پروانه
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Nezam Licenses Table */}
                    {onboardForm.nezamLicenses && onboardForm.nezamLicenses.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white shadow-2xs">
                        <table className="w-full text-right text-xs">
                          <thead>
                            <tr className="bg-amber-100/70 text-amber-950 font-bold border-b border-amber-200">
                              <th className="p-2.5">رشته</th>
                              <th className="p-2.5">پایه</th>
                              <th className="p-2.5">صلاحیت</th>
                              <th className="p-2.5">شماره پروانه</th>
                              <th className="p-2.5">اعتبار تا</th>
                              <th className="p-2.5">مدرک</th>
                              <th className="p-2.5 text-center">حذف</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100">
                            {onboardForm.nezamLicenses.map((lic, idx) => (
                              <tr key={lic.id || idx} className="hover:bg-amber-50/50">
                                <td className="p-2.5 font-bold text-slate-800">{lic.discipline}</td>
                                <td className="p-2.5">
                                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                    {lic.grade}
                                  </span>
                                </td>
                                <td className="p-2.5 text-slate-700">{lic.qualification}</td>
                                <td className="p-2.5 font-mono text-slate-800">{lic.licenseNo}</td>
                                <td className="p-2.5 font-mono text-slate-600">{lic.validUntil || '-'}</td>
                                <td className="p-2.5">
                                  {lic.documentName ? (
                                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-mono truncate max-w-[100px] inline-block">
                                      {lic.documentName}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[10px]">-</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = onboardForm.nezamLicenses.filter((_, i) => i !== idx);
                                      setOnboardForm({
                                        ...onboardForm,
                                        nezamLicenses: updated,
                                        nezamMohandesiLicense: updated.length > 0 ? {
                                          licenseNo: updated[0].licenseNo,
                                          grade: updated[0].grade,
                                          branch: updated[0].discipline,
                                          validUntil: updated[0].validUntil || ''
                                        } : {
                                          licenseNo: '',
                                          grade: 'پایه ۳',
                                          branch: 'مهندسی عمران',
                                          validUntil: ''
                                        }
                                      });
                                    }}
                                    className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 cursor-pointer"
                                    title="حذف پروانه"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bg-white/80 p-4 rounded-lg border border-dashed border-amber-300 text-center text-xs text-amber-900">
                        هنوز پروانه نظام مهندسی برای این پرسنل ثبت نشده است. در صورت دارا بودن پروانه اشتغال، روی دکمه «افزودن پروانه جدید» کلیک فرمایید.
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">شماره بیمه تأمین اجتماعی</label>
                      <input
                        type="text"
                        value={onboardForm.insuranceNumber}
                        onChange={e => setOnboardForm({ ...onboardForm, insuranceNumber: e.target.value })}
                        placeholder="شماره بیمه ۱۰ رقمی"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono placeholder:text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">مجموع سوابق پرداخت بیمه (ماه)</label>
                      <input
                        type="number"
                        min="0"
                        value={onboardForm.insuranceHistoryMonths || ''}
                        onChange={e => setOnboardForm({ ...onboardForm, insuranceHistoryMonths: Number(e.target.value) })}
                        placeholder="۳۶"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                </div>
              )}


              {/* TAB 4: Job & System Permissions */}
              {onboardActiveTab === 'job' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <h4 className="font-bold text-slate-800 pb-2 border-b border-slate-200">
                    ساختار سازمانی، قرارداد کاری و دسترسی‌های ماژول‌ها
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">سمت سازمانی مصوب *</label>
                      <input
                        type="text"
                        required
                        value={onboardForm.role}
                        onChange={e => setOnboardForm({ ...onboardForm, role: e.target.value })}
                        placeholder="مثال: کارشناس ارشد حریق و آتش‌نشانی"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">واحد دپارتمان *</label>
                      <select
                        value={onboardForm.unit}
                        onChange={e => setOnboardForm({ ...onboardForm, unit: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                      >
                        <option value="مهندسی حریق">مهندسی حریق</option>
                        <option value="سیستم مدیریت">سیستم مدیریت</option>
                        <option value="انرژی">انرژی</option>
                        <option value="بازاریابی و CRM">بازاریابی و CRM</option>
                        <option value="امور مالی و تنخواه">امور مالی و تنخواه</option>
                        <option value="سرمایه انسانی">سرمایه انسانی</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">رده سازمانی</label>
                      <select
                        value={onboardForm.positionLevel}
                        onChange={e => setOnboardForm({ ...onboardForm, positionLevel: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                      >
                        <option value="کارشناس">کارشناس</option>
                        <option value="سرپرست">سرپرست</option>
                        <option value="مدیر">مدیر دپارتمان</option>
                        <option value="مدیر ارشد">مدیر ارشد</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">مدیر مستقیم بالادست</label>
                      <select
                        value={onboardForm.managerId}
                        onChange={e => setOnboardForm({ ...onboardForm, managerId: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                      >
                        {personnelList.filter(p => p.isManager).map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">نوع قرارداد کار</label>
                      <select
                        value={onboardForm.contractType}
                        onChange={e => setOnboardForm({ ...onboardForm, contractType: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                      >
                        <option value="قرارداد یکساله قانون کار">قرارداد یکساله قانون کار</option>
                        <option value="قرارداد تمام‌وقت با پورسانت فروش">قرارداد تمام‌وقت با پورسانت فروش</option>
                        <option value="قرارداد رسمی مدیریتی">قرارداد رسمی مدیریتی</option>
                        <option value="قرارداد آزمایشی سه ماهه">قرارداد آزمایشی سه ماهه</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">محل خدمت</label>
                      <input
                        type="text"
                        value={onboardForm.serviceLocation}
                        onChange={e => setOnboardForm({ ...onboardForm, serviceLocation: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">شروع همکاری با رابو</label>
                      <input
                        type="text"
                        value={onboardForm.serviceStartDate}
                        onChange={e => setOnboardForm({ ...onboardForm, serviceStartDate: e.target.value })}
                        placeholder="۱۴۰۵/۰۱/۰۱"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">تاریخ آغاز قرارداد</label>
                      <input
                        type="text"
                        value={onboardForm.contractStartDate}
                        onChange={e => setOnboardForm({ ...onboardForm, contractStartDate: e.target.value })}
                        placeholder="۱۴۰۵/۰۱/۰۱"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">تاریخ پایان قرارداد</label>
                      <input
                        type="text"
                        value={onboardForm.contractEndDate}
                        onChange={e => setOnboardForm({ ...onboardForm, contractEndDate: e.target.value })}
                        placeholder="۱۴۰۵/۱۲/۲۹"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* System Permissions Matrix */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                    <span className="font-bold text-slate-700 block text-xs">
                      تنظیم دسترسی‌های کارمند به ماژول‌های سامانه اتوماسیون:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={onboardForm.permissions.letters}
                          onChange={e => setOnboardForm({
                            ...onboardForm,
                            permissions: { ...onboardForm.permissions, letters: e.target.checked }
                          })}
                          className="rounded text-amber-600"
                        />
                        <span>کارتابل نامه‌ها و مکاتبات اداری</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={onboardForm.permissions.crm}
                          onChange={e => setOnboardForm({
                            ...onboardForm,
                            permissions: { ...onboardForm.permissions, crm: e.target.checked }
                          })}
                          className="rounded text-amber-600"
                        />
                        <span>بانک CRM و پرونده شهرسازی</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={onboardForm.permissions.hr}
                          onChange={e => setOnboardForm({
                            ...onboardForm,
                            permissions: { ...onboardForm.permissions, hr: e.target.checked }
                          })}
                          className="rounded text-amber-600"
                        />
                        <span>تقویم تردد و ثبت کارکرد</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={onboardForm.permissions.projects}
                          onChange={e => setOnboardForm({
                            ...onboardForm,
                            permissions: { ...onboardForm.permissions, projects: e.target.checked }
                          })}
                          className="rounded text-amber-600"
                        />
                        <span>پروژه‌های مهندسی رابو</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: Salary & Banking */}
              {onboardActiveTab === 'salary' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <h4 className="font-bold text-slate-800 pb-2 border-b border-slate-200">
                    حقوق، دستمزد، مزایای مصوب قانون کار و اطلاعات حساب بانکی
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">دستمزد روزانه قانون کار (ریال)</label>
                      <input
                        type="text"
                        value={onboardForm.baseDailySalary}
                        onChange={e => setOnboardForm({ ...onboardForm, baseDailySalary: e.target.value })}
                        placeholder="۱,۸۰۰,۰۰۰"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">حقوق پایه ماهانه (ریال)</label>
                      <input
                        type="text"
                        value={onboardForm.baseMonthlySalary}
                        onChange={e => setOnboardForm({ ...onboardForm, baseMonthlySalary: e.target.value })}
                        placeholder="۵۴,۰۰۰,۰۰۰"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">حق مسکن مصوب (ریال)</label>
                      <input
                        type="text"
                        value={onboardForm.housingAllowance}
                        onChange={e => setOnboardForm({ ...onboardForm, housingAllowance: e.target.value })}
                        placeholder="۹,۰۰۰,۰۰۰"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">بن خواروبار و اقلام مصرفی (ریال)</label>
                      <input
                        type="text"
                        value={onboardForm.groceryAllowance}
                        onChange={e => setOnboardForm({ ...onboardForm, groceryAllowance: e.target.value })}
                        placeholder="۱۴,۰۰۰,۰۰۰"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">حق اولاد (ریال)</label>
                      <input
                        type="text"
                        value={onboardForm.childAllowance}
                        onChange={e => setOnboardForm({ ...onboardForm, childAllowance: e.target.value })}
                        placeholder="۰"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">حق تخصص / مسئولیت (ریال)</label>
                      <input
                        type="text"
                        value={onboardForm.specialAllowance}
                        onChange={e => setOnboardForm({ ...onboardForm, specialAllowance: e.target.value })}
                        placeholder="۰"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">نرخ ساعت اضافه‌کاری (ریال)</label>
                      <input
                        type="text"
                        value={onboardForm.overtimeRateHourly}
                        onChange={e => setOnboardForm({ ...onboardForm, overtimeRateHourly: e.target.value })}
                        placeholder="۳۸۰,۰۰۰"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">نرخ ساعت جمعه‌کاری (ریال)</label>
                      <input
                        type="text"
                        value={onboardForm.holidayRateHourly}
                        onChange={e => setOnboardForm({ ...onboardForm, holidayRateHourly: e.target.value })}
                        placeholder="۵۲۰,۰۰۰"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">درصد پورسانت پروژه‌ها (٪)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={onboardForm.projectCommissionRate}
                        onChange={e => setOnboardForm({ ...onboardForm, projectCommissionRate: Number(e.target.value) })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Bank Account Details */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <span className="font-bold text-slate-800 block text-xs">
                      اطلاعات حساب بانکی جهت واریز حقوق، پایا و ساتنا:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-700 mb-1">نام بانک عامل</label>
                        <input
                          type="text"
                          value={onboardForm.bankName}
                          onChange={e => setOnboardForm({ ...onboardForm, bankName: e.target.value })}
                          placeholder="بانک ملت / سامان"
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-700 mb-1">شماره حساب بانکی</label>
                        <input
                          type="text"
                          value={onboardForm.bankAccountNo}
                          onChange={e => setOnboardForm({ ...onboardForm, bankAccountNo: e.target.value })}
                          placeholder="شماره حساب"
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-700 mb-1">شماره کارت (۱۶ رقم)</label>
                        <input
                          type="text"
                          value={onboardForm.bankCardNo}
                          onChange={e => setOnboardForm({ ...onboardForm, bankCardNo: e.target.value })}
                          placeholder="۶۱۰۴-۳۳۷۸-..."
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-700 mb-1">شماره شبا (IBAN)</label>
                        <input
                          type="text"
                          value={onboardForm.bankSheba}
                          onChange={e => setOnboardForm({ ...onboardForm, bankSheba: e.target.value })}
                          placeholder="IR000000000000000000000000"
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: Upload Identity & Credential Documents */}
              {onboardActiveTab === 'documents' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">
                        بارگذاری مدارک هویتی، تصاویر شناسنامه، کارت ملی، تضامین و پروانه نظام مهندسی
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        فایل‌های اسکن‌شده با فرمت JPG، PNG یا PDF را برای هر مدرک بارگذاری فرمایید.
                      </p>
                    </div>
                    <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold shrink-0">
                      {onboardForm.uploadedDocuments.filter(d => d.fileName).length} از {onboardForm.uploadedDocuments.length} مدرک بارگذاری شده
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {onboardForm.uploadedDocuments.map((doc, idx) => (
                      <div
                        key={doc.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          doc.fileName
                            ? 'bg-emerald-50/40 border-emerald-300'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              doc.fileName ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {doc.fileName ? <FileCheck className="w-4 h-4" /> : <Paperclip className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-slate-800 leading-tight">
                                {doc.title}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                نوع: {doc.type}
                              </div>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            doc.fileName
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {doc.fileName ? 'بارگذاری شده ✓' : 'در انتظار بارگذاری'}
                          </span>
                        </div>

                        {doc.fileName ? (
                          <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-emerald-200 text-[11px]">
                            <div className="truncate max-w-[180px] font-mono font-medium text-emerald-900">
                              {doc.fileName}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-slate-400 font-mono">{doc.fileDate}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...onboardForm.uploadedDocuments];
                                  updated[idx].fileName = '';
                                  updated[idx].fileDate = '';
                                  setOnboardForm({ ...onboardForm, uploadedDocuments: updated });
                                }}
                                className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 cursor-pointer"
                                title="حذف فایل"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-dashed border-slate-300 hover:border-amber-500 py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5 text-amber-600" />
                            <span>انتخاب و بارگذاری فایل سند</span>
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const updated = [...onboardForm.uploadedDocuments];
                                  updated[idx].fileName = file.name;
                                  updated[idx].fileDate = todayStr;
                                  setOnboardForm({ ...onboardForm, uploadedDocuments: updated });
                                  setToastMessage(`مدرک «${doc.title}» با موفقیت پیوست شد.`);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* دکمه افزودن مدرک اختصاصی جدید */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const title = prompt('عنوان مدرک جدید را وارد نمایید (مثلاً: گواهی عدم سوء‌پیشینه، آزمایش طب کار، ...):');
                        if (title && title.trim()) {
                          const newDoc = {
                            id: `doc-custom-${Date.now()}`,
                            title: title.trim(),
                            type: 'سایر مدارک',
                            fileName: '',
                            fileDate: '',
                            status: 'در انتظار بارگذاری'
                          };
                          setOnboardForm({
                            ...onboardForm,
                            uploadedDocuments: [...onboardForm.uploadedDocuments, newDoc]
                          });
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 font-bold px-3 py-2 rounded-lg cursor-pointer transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                      <span>افزودن مدرک شناسایی یا گواهینامه جدید به چک‌لیست</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 7: Guarantees, Relatives & Documents */}
              {onboardActiveTab === 'guarantee' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <h4 className="font-bold text-slate-800 pb-2 border-b border-slate-200">
                    تضامین حسن انجام کار، معرفین اضطراری و چک‌لیست مدارک
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">نوع ضمانت</label>
                      <select
                        value={onboardForm.guaranteeType}
                        onChange={e => setOnboardForm({ ...onboardForm, guaranteeType: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                      >
                        <option value="سفته حسن انجام کار">سفته بانکی حسن انجام کار</option>
                        <option value="چک صیادی">چک صیادی بنفش</option>
                        <option value="ضمانت‌نامه بانکی">ضمانت‌نامه معتبر بانکی</option>
                        <option value="سند ملکی">تعهدنامه رسمی محضری</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">مبلغ تضمین</label>
                      <input
                        type="text"
                        value={onboardForm.guaranteeAmount}
                        onChange={e => setOnboardForm({ ...onboardForm, guaranteeAmount: e.target.value })}
                        placeholder="۲۰۰,۰۰۰,۰۰۰ تومان"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">شماره سند یا چک صیادی</label>
                      <input
                        type="text"
                        value={onboardForm.guaranteeSerial}
                        onChange={e => setOnboardForm({ ...onboardForm, guaranteeSerial: e.target.value })}
                        placeholder="شماره صیادی ۱۶ رقمی"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">نام ضامن معتبر</label>
                      <input
                        type="text"
                        value={onboardForm.guarantorName}
                        onChange={e => setOnboardForm({ ...onboardForm, guarantorName: e.target.value })}
                        placeholder="نام و نام خانوادگی ضامن"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                      />
                    </div>
                  </div>

                  {/* Relatives list */}
                  <div className="space-y-3">
                    <span className="font-bold text-slate-700 block text-xs">
                      مشخصات بستگان درجه یک و معرفین اضطراری:
                    </span>
                    {onboardForm.relatives.map((rel, idx) => (
                      <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                        <span className="font-bold text-slate-700 block text-xs">
                          معرف شماره {toFa(idx + 1)}:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[11px] text-slate-600 mb-1">نام و نام خانوادگی</label>
                            <input
                              type="text"
                              value={rel.name}
                              onChange={e => {
                                const updated = [...onboardForm.relatives];
                                updated[idx].name = e.target.value;
                                setOnboardForm({ ...onboardForm, relatives: updated });
                              }}
                              placeholder="نام معرف"
                              className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-600 mb-1">نسبت</label>
                            <input
                              type="text"
                              value={rel.relation}
                              onChange={e => {
                                const updated = [...onboardForm.relatives];
                                updated[idx].relation = e.target.value;
                                setOnboardForm({ ...onboardForm, relatives: updated });
                              }}
                              placeholder="پدر، همسر، برادر"
                              className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-600 mb-1">شماره همراه</label>
                            <input
                              type="text"
                              value={rel.mobile}
                              onChange={e => {
                                const updated = [...onboardForm.relatives];
                                updated[idx].mobile = e.target.value;
                                setOnboardForm({ ...onboardForm, relatives: updated });
                              }}
                              placeholder="0912..."
                              className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-600 mb-1">تلفن ثابت</label>
                            <input
                              type="text"
                              value={rel.phone}
                              onChange={e => {
                                const updated = [...onboardForm.relatives];
                                updated[idx].phone = e.target.value;
                                setOnboardForm({ ...onboardForm, relatives: updated });
                              }}
                              placeholder="021..."
                              className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Documents checklist */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                    <span className="font-bold text-slate-700 block text-xs">
                      چک‌لیست مدارک فیزیکی تحویل‌شده به کارگزینی رابو:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={onboardForm.documentsChecklist.idCard}
                          onChange={e => setOnboardForm({
                            ...onboardForm,
                            documentsChecklist: { ...onboardForm.documentsChecklist, idCard: e.target.checked }
                          })}
                          className="rounded text-amber-600"
                        />
                        <span>کارت ملی و شناسنامه</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={onboardForm.documentsChecklist.education}
                          onChange={e => setOnboardForm({
                            ...onboardForm,
                            documentsChecklist: { ...onboardForm.documentsChecklist, education: e.target.checked }
                          })}
                          className="rounded text-amber-600"
                        />
                        <span>مدرک تحصیلی مهندسی</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={onboardForm.documentsChecklist.military}
                          onChange={e => setOnboardForm({
                            ...onboardForm,
                            documentsChecklist: { ...onboardForm.documentsChecklist, military: e.target.checked }
                          })}
                          className="rounded text-amber-600"
                        />
                        <span>کارت پایان خدمت</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={onboardForm.documentsChecklist.insuranceHistory}
                          onChange={e => setOnboardForm({
                            ...onboardForm,
                            documentsChecklist: { ...onboardForm.documentsChecklist, insuranceHistory: e.target.checked }
                          })}
                          className="rounded text-amber-600"
                        />
                        <span>سوابق بیمه تأمین اجتماعی</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={onboardForm.documentsChecklist.nezamMohandesi}
                          onChange={e => setOnboardForm({
                            ...onboardForm,
                            documentsChecklist: { ...onboardForm.documentsChecklist, nezamMohandesi: e.target.checked }
                          })}
                          className="rounded text-amber-600"
                        />
                        <span>پروانه نظام مهندسی</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={onboardForm.documentsChecklist.jobDesc}
                          onChange={e => setOnboardForm({
                            ...onboardForm,
                            documentsChecklist: { ...onboardForm.documentsChecklist, jobDesc: e.target.checked }
                          })}
                          className="rounded text-amber-600"
                        />
                        <span>شرح شغل امضاشده</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 8: User Account & Access Control (RBAC) */}
              {onboardActiveTab === 'account' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="pb-2 border-b border-slate-200">
                    <h4 className="font-bold text-slate-800 text-sm">
                      حساب کاربری سامانه، رمز عبور و تعیین دقیق سطوح دسترسی (RBAC)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      مشخص نمایید این کارمند به کدام بخش‌های سامانه اتوماسیون رابو دسترسی خواهد داشت.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">نام کاربری اختصاصی پرسنل *</label>
                      <input
                        type="text"
                        required
                        value={onboardForm.username}
                        onChange={e => setOnboardForm({ ...onboardForm, username: e.target.value })}
                        placeholder="user_rabo"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono text-left"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">کلمه عبور پیش‌فرض *</label>
                      <input
                        type="text"
                        required
                        value={onboardForm.password}
                        onChange={e => setOnboardForm({ ...onboardForm, password: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono text-left"
                      />
                    </div>
                  </div>

                  {/* تفکیک سطوح دسترسی دانه‌دانه به بخش‌ها و زیرماژول‌های مختلف */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">
                          ماتریس تفکیک‌شده سطوح دسترسی زیرماژول‌های سامانه (Granular RBAC):
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          دسترسی‌های مجاز این کارمند را دقیقاً بر اساس دپارتمان و شرح وظایف شغلی وی تعیین فرمایید.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        <button
                          type="button"
                          onClick={() => setOnboardForm({
                            ...onboardForm,
                            permissions: { ...FULL_MANAGER_PERMISSIONS }
                          })}
                          className="text-[11px] bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded font-bold cursor-pointer transition-colors"
                        >
                          انتخاب همه
                        </button>
                        <button
                          type="button"
                          onClick={() => setOnboardForm({
                            ...onboardForm,
                            permissions: { ...EMPTY_EMPLOYEE_PERMISSIONS }
                          })}
                          className="text-[11px] bg-slate-200 text-slate-700 hover:bg-slate-300 px-2 py-1 rounded font-bold cursor-pointer transition-colors"
                        >
                          لغو همه
                        </button>
                      </div>
                    </div>

                    {/* Presets Bar */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px]">
                      <span className="font-bold text-slate-500 shrink-0">الگوهای سریع:</span>
                      <button
                        type="button"
                        onClick={() => setOnboardForm({
                          ...onboardForm,
                          permissions: {
                            ...EMPTY_EMPLOYEE_PERMISSIONS,
                            dashboard_personal: true,
                            crm_fire: true,
                            crm_energy: true,
                            crm_management: true,
                            crm_customers: true,
                            crm_followups: true,
                            tasks_board: true,
                            tasks_chat: true
                          }
                        })}
                        className="bg-amber-100/70 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-md font-bold whitespace-nowrap cursor-pointer transition-colors"
                      >
                        🎯 کارشناس بازاریابی و CRM
                      </button>
                      <button
                        type="button"
                        onClick={() => setOnboardForm({
                          ...onboardForm,
                          permissions: {
                            ...EMPTY_EMPLOYEE_PERMISSIONS,
                            dashboard_personal: true,
                            letters_inbox: true,
                            projects_view: true,
                            projects_manage: true,
                            tasks_board: true,
                            tasks_chat: true,
                            hr_attendance: true
                          }
                        })}
                        className="bg-blue-100/70 hover:bg-blue-200 text-blue-900 border border-blue-300 px-2.5 py-1 rounded-md font-bold whitespace-nowrap cursor-pointer transition-colors"
                      >
                        📐 مهندس ناظر و مدیر پروژه
                      </button>
                      <button
                        type="button"
                        onClick={() => setOnboardForm({
                          ...onboardForm,
                          permissions: {
                            ...EMPTY_EMPLOYEE_PERMISSIONS,
                            dashboard_personal: true,
                            letters_inbox: true,
                            letters_outbox_create: true,
                            letters_archive: true,
                            finance_petty_cash: true,
                            hr_attendance: true
                          }
                        })}
                        className="bg-emerald-100/70 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-md font-bold whitespace-nowrap cursor-pointer transition-colors"
                      >
                        💼 مسئول دفتر و دبیرخانه
                      </button>
                    </div>

                    {/* Categorized Permission Matrix */}
                    <div className="space-y-3.5">
                      {/* ۱. داشبورد و گزارش‌ها */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                        <div className="font-bold text-xs text-[#13213c] flex items-center gap-1.5 pb-1 border-b border-slate-100">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span>۱. داشبورد و گزارش‌ها (Dashboard & Analytics)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.dashboard_personal)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, dashboard_personal: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">کارتابل شخصی پرسنل (dashboard_personal)</div>
                              <div className="text-[10px] text-slate-400">مشاهده داشبورد اختصاصی، وظایف، نامه‌ها و اعلان‌های من</div>
                            </div>
                          </label>
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.dashboard_executive)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, dashboard_executive: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">گزارش‌های مدیریتی BI (dashboard_executive)</div>
                              <div className="text-[10px] text-slate-400">تحلیل آمارهای کلان سازمان، نمودارهای پیشرفته و خروجی PDF</div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* ۲. کارتابل نامه‌ها و دبیرخانه */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                        <div className="font-bold text-xs text-[#13213c] flex items-center gap-1.5 pb-1 border-b border-slate-100">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span>۲. کارتابل نامه‌ها و دبیرخانه (Letters & Secretarial)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.letters_inbox)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, letters_inbox: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">نامه‌های دریافتی (letters_inbox)</div>
                              <div className="text-[10px] text-slate-400">مشاهده نامه‌های وارده ارجاع‌شده به من</div>
                            </div>
                          </label>
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.letters_outbox_create)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, letters_outbox_create: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">صدور و ایجاد نامه (letters_outbox_create)</div>
                              <div className="text-[10px] text-slate-400">تنظیم پیش‌نویس، تولید سربرگ و صدور نامه</div>
                            </div>
                          </label>
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.letters_archive)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, letters_archive: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">بایگانی و پیگیری (letters_archive)</div>
                              <div className="text-[10px] text-slate-400">بایگانی نامه‌های صادره و ثبت رسید تحویل</div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* ۳. بازاریابی و CRM */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                        <div className="font-bold text-xs text-[#13213c] flex items-center gap-1.5 pb-1 border-b border-slate-100">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span>۳. بازاریابی و پرونده‌های CRM (Customer Relationship Management)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.crm_fire)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, crm_fire: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">بانک حریق (crm_fire)</div>
                              <div className="text-[10px] text-slate-400">پرونده‌ها و استعلام‌های آتش‌نشانی</div>
                            </div>
                          </label>
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.crm_energy)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, crm_energy: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">بانک انرژی (crm_energy)</div>
                              <div className="text-[10px] text-slate-400">بهینه‌سازی مصرف و نیروگاه‌های خورشیدی</div>
                            </div>
                          </label>
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.crm_management)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, crm_management: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">بانک سیستم مدیریت (crm_management)</div>
                              <div className="text-[10px] text-slate-400">پرونده‌های مشاوره‌ای ایزو و استانداردهای کیفی</div>
                            </div>
                          </label>
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.crm_customers)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, crm_customers: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">مشتریان و مخاطبان (crm_customers)</div>
                              <div className="text-[10px] text-slate-400">دفتر تلفن مخاطبان و مشتریان قطعی</div>
                            </div>
                          </label>
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer sm:col-span-2">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.crm_followups)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, crm_followups: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">کارتابل پیگیری‌ها (crm_followups)</div>
                              <div className="text-[10px] text-slate-400">پیگیری‌های موعد امروز، تماس‌های مشتریان و ثبت نتایج مذاکره</div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* ۴. پروژه‌ها و وظایف */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                        <div className="font-bold text-xs text-[#13213c] flex items-center gap-1.5 pb-1 border-b border-slate-100">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span>۴. پروژه‌ها، تسک‌ها و گفتگوی تیمی (Projects & Collaboration)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.projects_view)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, projects_view: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">مشاهده پروژه‌ها (projects_view)</div>
                              <div className="text-[10px] text-slate-400">مشاهده لیست و پرونده پروژه‌ها</div>
                            </div>
                          </label>
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.projects_manage)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, projects_manage: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">مدیریت پروژه‌ها (projects_manage)</div>
                              <div className="text-[10px] text-slate-400">ثبت، ویرایش و مدیریت مالی و فنی</div>
                            </div>
                          </label>
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.tasks_board)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, tasks_board: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">برد وظایف (tasks_board)</div>
                              <div className="text-[10px] text-slate-400">ارجاعات کاری، تسک‌ها و چک‌لیست</div>
                            </div>
                          </label>
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.tasks_chat)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, tasks_chat: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">پیام‌رسان تیمی (tasks_chat)</div>
                              <div className="text-[10px] text-slate-400">چت تیمی، کانال‌ها و پیام خصوصی</div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* ۵. امور مالی و تنخواه */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                        <div className="font-bold text-xs text-[#13213c] flex items-center gap-1.5 pb-1 border-b border-slate-100">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span>۵. امور مالی و تنخواه‌گردان (Finance & Petty Cash)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.finance_petty_cash)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, finance_petty_cash: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">تنخواه‌گردان (finance_petty_cash)</div>
                              <div className="text-[10px] text-slate-400">ثبت فاکتورها، هزینه‌ها و شارژ تنخواه</div>
                            </div>
                          </label>
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.finance_audit)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, finance_audit: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">رسیدگی و تایید مالی (finance_audit)</div>
                              <div className="text-[10px] text-slate-400">ممیزی، تأیید اسناد تنخواه و بستن دوره‌های مالی</div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* ۶. سرمایه انسانی HR */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                        <div className="font-bold text-xs text-[#13213c] flex items-center gap-1.5 pb-1 border-b border-slate-100">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span>۶. سرمایه انسانی و کارگزینی (Human Resources)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.hr_employees)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, hr_employees: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">پرونده پرسنلی (hr_employees)</div>
                              <div className="text-[10px] text-slate-400">ثبت‌نام، قراردادها و مدارک کارکنان</div>
                            </div>
                          </label>
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.hr_attendance)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, hr_attendance: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">تقویم و تردد (hr_attendance)</div>
                              <div className="text-[10px] text-slate-400">ثبت و تایید مرخصی، مأموریت و اضافه‌کار</div>
                            </div>
                          </label>
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.hr_payroll)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, hr_payroll: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">حقوق و دستمزد (hr_payroll)</div>
                              <div className="text-[10px] text-slate-400">احکام کارگزینی، فیش حقوقی و پورسانت</div>
                            </div>
                          </label>
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.hr_kpi)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, hr_kpi: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">ارزیابی عملکرد (hr_kpi)</div>
                              <div className="text-[10px] text-slate-400">شاخص‌های KPI و ارزشیابی ماهانه</div>
                            </div>
                          </label>
                          <label className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-amber-50/40 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(onboardForm.permissions.hr_training)}
                              onChange={e => setOnboardForm({
                                ...onboardForm,
                                permissions: { ...onboardForm.permissions, hr_training: e.target.checked }
                              })}
                              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800">آموزش و ارتقا (hr_training)</div>
                              <div className="text-[10px] text-slate-400">دوره‌های آموزشی و ماتریس شایستگی</div>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1 text-xs">
                      یادداشت‌های محرمانه مصاحبه استخدامی و ارزیابی اولیه مدیر ارشد
                    </label>
                    <textarea
                      rows={3}
                      value={onboardForm.managerNotes}
                      onChange={e => setOnboardForm({ ...onboardForm, managerNotes: e.target.value })}
                      placeholder="مهارت‌های فنی، توانمندی‌های کارگاهی، سوابق حرفه‌ای قبلی و ارزیابی مصاحبه..."
                      className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <span className="text-slate-500 text-[11px]">
                  * تکمیل فیلدهای ستاره‌دار الزامی است.
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOnboardModal(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="bg-[#800000] hover:bg-[#660000] active:bg-[#500000] text-white px-6 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-md flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>{editingEmployeeId ? 'ذخیره تغییرات پرونده پرسنلی' : 'تشکیل نهایی پرونده پرسنلی و صدور دسترسی'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
