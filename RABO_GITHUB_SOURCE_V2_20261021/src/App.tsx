import React, { useState, useEffect, useRef } from 'react';
import { 
  initialPersonnel, 
  initialProjects, 
  letterTemplates, 
  initialCrmLeads, 
  initialReceivedLetters, 
  initialSentLetters, 
  initialAttendanceRecords,
  initialKpiIndicators,
  initialKpiMonthlyEvaluations,
  initialDailyTodos,
  initialPersonalCalendarEvents,
  initialLeaveMissionRequests,
  initialPayrollRecords,
  initialTrainingRecords,
  initialContactBook,
  initialEnergyLeads,
  initialManagementLeads
} from './data/initialData';
import { 
  Employee, 
  Project, 
  CrmLead, 
  ReceivedLetter, 
  SentLetter, 
  AttendanceRecord,
  KpiIndicator,
  KpiMonthlyEvaluation,
  DailyTodoItem,
  PersonalCalendarEvent,
  LeaveMissionRequest,
  PayrollRecord,
  ContactBookItem,
  EnergyLeadItem,
  ManagementSystemLeadItem
} from './types';
import { getTodayShamsi, getExactShamsiTimestamp } from './utils/jalali';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { LettersView } from './components/LettersView';
import { CrmView } from './components/CrmView';
import { HrView } from './components/HrView';
import { RaboLogo } from './components/RaboLogo';
import { ProjectsView } from './components/ProjectsView';
import { TasksCollaborationView, EnhancedTaskItem, ChatMessage } from './components/TasksCollaborationView';
import { PettyCashView, PettyCashInflow, PettyCashExpense } from './components/PettyCashView';
import { MapsGroundingModal } from './components/MapsGroundingModal';
import { LiveVoiceAssistant } from './components/LiveVoiceAssistant';
import { InAppNotificationToast } from './components/InAppNotificationToast';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { ExecutiveReportingView } from './components/ExecutiveReportingView';
import { checkDueLettersAndNotify, isDueDateReached } from './utils/browserNotifications';
import { LogIn, CheckCircle, Lock } from 'lucide-react';

const LOCAL_STORAGE_DB_KEY = 'rabo_database_v1';

export const canAccessView = (view: string, user: Employee | null): boolean => {
  if (!user) return false;
  if (user.isManager) return true;
  const p = user.permissions;
  if (!p) return false;

  switch (view) {
    case 'dashboard':
      return Boolean(p.dashboard_personal);
    case 'dashboard-reporting':
      return Boolean(p.dashboard_executive);
    case 'letters-inbox':
      return Boolean(p.letters_inbox);
    case 'letters-outbox-create':
      return Boolean(p.letters_outbox_create);
    case 'letters-outbox-archive':
      return Boolean(p.letters_archive);
    case 'crm-leads':
      return Boolean(p.crm_fire || p.crm_customers);
    case 'crm-leads-energy':
      return Boolean(p.crm_energy);
    case 'crm-leads-management':
      return Boolean(p.crm_management);
    case 'crm-due-today':
      return Boolean(p.crm_followups);
    case 'crm-customers':
    case 'crm-meetings':
      return Boolean(p.crm_customers || p.crm_followups);
    case 'projects':
      return Boolean(p.projects_view || p.projects_manage);
    case 'tasks':
      return Boolean(p.tasks_board);
    case 'tasks-chat':
      return Boolean(p.tasks_chat);
    case 'petty-cash':
      return Boolean(p.finance_petty_cash || p.finance_audit);
    case 'hr-attendance':
      // تقویم شخصی، مرخصی‌ها، مأموریت و چک‌لیست برای کلیه پرسنل در دسترس است
      return true;
    case 'hr-employees':
      return Boolean(p.hr_employees);
    case 'hr-payroll':
      // مشاهده فیش حقوقی شخصی برای کلیه پرسنل مجاز است (مدیران دسترسی ویرایش و محاسبات دارند)
      return true;
    case 'hr-kpi':
      // مشاهده کارنامه عملکرد شخصی برای کلیه پرسنل مجاز است
      return true;
    case 'hr-training':
      // ماتریس مهارت و دوره‌های آموزشی برای پرسنل در دسترس است
      return true;
    default:
      return true;
  }
};

export const getDefaultLandingView = (user: Employee): string => {
  if (user.isManager) return 'dashboard';
  const p = user.permissions;
  if (p?.dashboard_personal) return 'dashboard';
  if (p?.letters_inbox) return 'letters-inbox';
  if (p?.crm_fire) return 'crm-leads';
  if (p?.crm_energy) return 'crm-leads-energy';
  if (p?.crm_management) return 'crm-leads-management';
  if (p?.crm_customers) return 'crm-customers';
  if (p?.crm_followups) return 'crm-due-today';
  if (p?.projects_view || p?.projects_manage) return 'projects';
  if (p?.tasks_board) return 'tasks';
  if (p?.tasks_chat) return 'tasks-chat';
  if (p?.finance_petty_cash || p?.finance_audit) return 'petty-cash';
  if (p?.hr_attendance) return 'hr-attendance';
  if (p?.hr_employees) return 'hr-employees';
  if (p?.hr_payroll) return 'hr-payroll';
  if (p?.hr_kpi) return 'hr-kpi';
  if (p?.hr_training) return 'hr-training';
  if (p?.dashboard_executive) return 'dashboard-reporting';
  return 'dashboard';
};

export default function App() {
  // Database Entity States
  const [personnelList, setPersonnelList] = useState<Employee[]>(initialPersonnel);
  const [projectsList, setProjectsList] = useState<Project[]>(initialProjects);
  const [crmLeads, setCrmLeads] = useState<CrmLead[]>(initialCrmLeads);
  const [receivedLetters, setReceivedLetters] = useState<ReceivedLetter[]>(initialReceivedLetters);
  const [sentLetters, setSentLetters] = useState<SentLetter[]>(initialSentLetters);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(initialAttendanceRecords);
  const [dailyTodos, setDailyTodos] = useState<DailyTodoItem[]>(initialDailyTodos);
  const [personalCalendarEvents, setPersonalCalendarEvents] = useState<PersonalCalendarEvent[]>(initialPersonalCalendarEvents);
  const [leaveMissionRequests, setLeaveMissionRequests] = useState<LeaveMissionRequest[]>(initialLeaveMissionRequests);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(initialPayrollRecords);
  const [trainingMatrix, setTrainingMatrix] = useState<any[]>(initialTrainingRecords);
  const [kpiIndicators, setKpiIndicators] = useState<KpiIndicator[]>(initialKpiIndicators);
  const [kpiEvaluations, setKpiEvaluations] = useState<KpiMonthlyEvaluation[]>(initialKpiMonthlyEvaluations);
  const [tasksList, setTasksList] = useState<EnhancedTaskItem[]>([]);
  const [pettyCashInflows, setPettyCashInflows] = useState<PettyCashInflow[]>([]);
  const [pettyCashExpenses, setPettyCashExpenses] = useState<PettyCashExpense[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [contactsList, setContactsList] = useState<ContactBookItem[]>(initialContactBook);
  const [energyLeads, setEnergyLeads] = useState<EnergyLeadItem[]>(initialEnergyLeads);
  const [managementLeads, setManagementLeads] = useState<ManagementSystemLeadItem[]>(initialManagementLeads);

  // Flag to avoid syncing initial state back to server before hydration
  const isHydratedRef = useRef(false);

  // Maps Grounding & Live API states
  const [isMapsModalOpen, setIsMapsModalOpen] = useState(false);
  const [mapsInitialQuery, setMapsInitialQuery] = useState('استعلام موقعیت مکانی و نشانی پروژه در تهران');
  const [isLiveAssistantOpen, setIsLiveAssistantOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  // Authentication: App ALWAYS starts on Login page
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [loginInput, setLoginInput] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Navigation: Default view after login is 'dashboard'
  const [currentView, setCurrentView] = useState('dashboard');
  const [toastMessage, setToastMessage] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sidebar accordions: ALL closed initially so only main headers with icons show first
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    dashboard: false,
    letters: false,
    crm: false,
    finance: false,
    hr: false,
    devOpportunities: false,
    projects: false,
    tasks: false
  });
  const [openSentLetters, setOpenSentLetters] = useState(false);

  const toggleMenu = (key: string) => {
    setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Date calculation
  const today = getTodayShamsi();
  const todayStr = `${today.year}/${today.month}/${today.day}`;

  const receiptMethods = [
    'پیک موتوری',
    'پست پیشتاز',
    'واتساپ / شبکه‌های اجتماعی',
    'ایمیل رسمی',
    'تحویل حضوری',
    'شبکه دولت / سیتاد',
    'فکس'
  ];

  const todayDueCount = crmLeads.filter(
    l => l.nextFollowUpDate === todayStr && l.status !== 'جلسه حضوری هماهنگ شد' && !l.status.includes('قرارداد')
  ).length;

  const dueLettersCount = receivedLetters.filter(l => {
    const target = l.dueDate || l.issueDate;
    return isDueDateReached(target, todayStr);
  }).length;

  // 1. Initial Hydration from LocalStorage and Backend /api/db
  useEffect(() => {
    // A. Instant LocalStorage Hydration
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_DB_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.personnel?.length) setPersonnelList(parsed.personnel);
        if (Array.isArray(parsed.projects)) setProjectsList(parsed.projects);
        if (Array.isArray(parsed.crmLeads)) setCrmLeads(parsed.crmLeads);
        if (Array.isArray(parsed.receivedLetters)) setReceivedLetters(parsed.receivedLetters);
        if (Array.isArray(parsed.sentLetters)) setSentLetters(parsed.sentLetters);
        if (Array.isArray(parsed.attendanceRecords)) setAttendanceRecords(parsed.attendanceRecords);
        if (Array.isArray(parsed.dailyTodos)) setDailyTodos(parsed.dailyTodos);
        if (Array.isArray(parsed.personalCalendarEvents)) setPersonalCalendarEvents(parsed.personalCalendarEvents);
        if (Array.isArray(parsed.leaveMissionRequests)) setLeaveMissionRequests(parsed.leaveMissionRequests);
        if (Array.isArray(parsed.payrollRecords)) setPayrollRecords(parsed.payrollRecords);
        if (Array.isArray(parsed.trainingMatrix)) setTrainingMatrix(parsed.trainingMatrix);
        if (Array.isArray(parsed.kpiIndicators)) setKpiIndicators(parsed.kpiIndicators);
        if (Array.isArray(parsed.kpiEvaluations)) setKpiEvaluations(parsed.kpiEvaluations);
        if (Array.isArray(parsed.tasks)) setTasksList(parsed.tasks);
        if (Array.isArray(parsed.pettyCashInflows)) setPettyCashInflows(parsed.pettyCashInflows);
        if (Array.isArray(parsed.pettyCashExpenses)) setPettyCashExpenses(parsed.pettyCashExpenses);
        if (Array.isArray(parsed.chatMessages)) setChatMessages(parsed.chatMessages);
        if (Array.isArray(parsed.contactBook)) setContactsList(parsed.contactBook);
        if (Array.isArray(parsed.energyLeads)) setEnergyLeads(parsed.energyLeads);
        if (Array.isArray(parsed.managementLeads)) setManagementLeads(parsed.managementLeads);
      }
    } catch (e) {
      console.warn('LocalStorage read error:', e);
    }

    // B. Server DB Fetch
    fetch('/api/db')
      .then(res => res.json())
      .then(db => {
        if (db && typeof db === 'object') {
          if (Array.isArray(db.personnel) && db.personnel.length > 0) setPersonnelList(db.personnel);
          if (Array.isArray(db.projects)) setProjectsList(db.projects);
          if (Array.isArray(db.crmLeads)) setCrmLeads(db.crmLeads);
          if (Array.isArray(db.receivedLetters)) setReceivedLetters(db.receivedLetters);
          if (Array.isArray(db.sentLetters)) setSentLetters(db.sentLetters);
          if (Array.isArray(db.attendanceRecords)) setAttendanceRecords(db.attendanceRecords);
          if (Array.isArray(db.dailyTodos)) setDailyTodos(db.dailyTodos);
          if (Array.isArray(db.personalCalendarEvents)) setPersonalCalendarEvents(db.personalCalendarEvents);
          if (Array.isArray(db.leaveMissionRequests)) setLeaveMissionRequests(db.leaveMissionRequests);
          if (Array.isArray(db.payrollRecords)) setPayrollRecords(db.payrollRecords);
          if (Array.isArray(db.trainingMatrix)) setTrainingMatrix(db.trainingMatrix);
          if (Array.isArray(db.kpiIndicators)) setKpiIndicators(db.kpiIndicators);
          if (Array.isArray(db.kpiEvaluations)) setKpiEvaluations(db.kpiEvaluations);
          if (Array.isArray(db.tasks)) setTasksList(db.tasks);
          if (Array.isArray(db.pettyCashInflows)) setPettyCashInflows(db.pettyCashInflows);
          if (Array.isArray(db.pettyCashExpenses)) setPettyCashExpenses(db.pettyCashExpenses);
          if (Array.isArray(db.chatMessages)) setChatMessages(db.chatMessages);
          if (Array.isArray(db.contactBook)) setContactsList(db.contactBook);
          if (Array.isArray(db.energyLeads)) setEnergyLeads(db.energyLeads);
          if (Array.isArray(db.managementLeads)) setManagementLeads(db.managementLeads);

          // Update local cache
          try {
            localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(db));
          } catch {}
        }
      })
      .catch(err => {
        console.warn('Error fetching from /api/db:', err);
      })
      .finally(() => {
        isHydratedRef.current = true;
      });
  }, []);

  // 2. Debounced Auto-sync to LocalStorage and Backend /api/db/sync
  useEffect(() => {
    if (!isHydratedRef.current) return;

    const timer = setTimeout(() => {
      const payload = {
        personnel: personnelList,
        projects: projectsList,
        crmLeads,
        receivedLetters,
        sentLetters,
        attendanceRecords,
        dailyTodos,
        personalCalendarEvents,
        leaveMissionRequests,
        payrollRecords,
        trainingMatrix,
        kpiIndicators,
        kpiEvaluations,
        tasks: tasksList,
        pettyCashInflows,
        pettyCashExpenses,
        chatMessages,
        contactBook: contactsList,
        energyLeads,
        managementLeads
      };

      // Save locally
      try {
        localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(payload));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }

      // Sync to backend file
      fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(err => {
        console.error('Failed to sync to /api/db/sync:', err);
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [
    personnelList,
    projectsList,
    crmLeads,
    receivedLetters,
    sentLetters,
    attendanceRecords,
    dailyTodos,
    personalCalendarEvents,
    leaveMissionRequests,
    payrollRecords,
    trainingMatrix,
    kpiIndicators,
    kpiEvaluations,
    tasksList,
    pettyCashInflows,
    pettyCashExpenses,
    chatMessages,
    contactsList,
    energyLeads,
    managementLeads
  ]);

  // پایش دوره‌ای و خودکار موعد سررسید نامه‌ها
  useEffect(() => {
    if (!currentUser) return;

    const initialTimer = setTimeout(() => {
      checkDueLettersAndNotify(receivedLetters, todayStr);
    }, 1000);

    const interval = setInterval(() => {
      checkDueLettersAndNotify(receivedLetters, todayStr);
    }, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [receivedLetters, todayStr, currentUser]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4500);
  };

  // Full system JSON backup
  const handleBackupDownload = () => {
    const backupData = {
      backupTimestamp: getExactShamsiTimestamp(),
      company: 'شرکت مهندسی رابو',
      receivedLetters,
      sentLetters,
      crmLeads,
      projects: projectsList,
      personnel: personnelList,
      attendanceRecords,
      kpiIndicators,
      kpiEvaluations,
      tasks: tasksList,
      pettyCashInflows,
      pettyCashExpenses
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rabo-Full-Backup-${today.year}-${today.month}-${today.day}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('فایل پشتیبان کامل دیتابیس رابو با موفقیت دریافت شد.');
  };

  // Login View - Clean, Secure, and Ultra-Minimalist Design
  if (!currentUser) {
    return (
      <div 
        dir="rtl" 
        className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] p-4 text-slate-800"
      >
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 w-full max-w-sm p-7 sm:p-8 transition-all">
          {/* Logo at the Top */}
          <div className="flex justify-center mb-4">
            <RaboLogo size="lg" variant="full" textColor="dark" />
          </div>

          {/* Requested Title */}
          <h1 className="text-sm sm:text-[15px] font-black text-[#13213c] text-center leading-snug mb-6">
            سامانه اتوماسیون شرکت رهنمون کیفیت رابو
          </h1>

          {loginError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-2.5 rounded-xl mb-4 text-center font-bold">
              {loginError}
            </div>
          )}

          <form
            onSubmit={e => {
              e.preventDefault();
              const found = personnelList.find(
                p => p.username === loginInput.username.trim() && p.password === loginInput.password.trim()
              );
              if (found) {
                const landing = getDefaultLandingView(found);
                setCurrentUser(found);
                setCurrentView(landing);
                setLoginError('');
                showToast(`خوش آمدید، ${found.name}`);
              } else {
                setLoginError('نام کاربری یا کلمه عبور نادرست است.');
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">نام کاربری</label>
              <input
                type="text"
                required
                value={loginInput.username}
                onChange={e => setLoginInput({ ...loginInput, username: e.target.value })}
                placeholder="نام کاربری سازمانی"
                className="w-full text-xs p-3 bg-slate-50/60 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#13213c] focus:ring-1 focus:ring-[#13213c] transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">کلمه عبور</label>
              <input
                type="password"
                required
                value={loginInput.password}
                onChange={e => setLoginInput({ ...loginInput, password: e.target.value })}
                placeholder="••••••••"
                className="w-full text-xs p-3 bg-slate-50/60 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#13213c] focus:ring-1 focus:ring-[#13213c] transition-all font-medium"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#13213c] hover:bg-[#1c325c] text-white py-3 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <LogIn className="w-4 h-4 text-amber-400" />
              <span>ورود به سامانه</span>
            </button>
          </form>
        </div>

        {/* Minimal Footer */}
        <p className="text-[11px] text-slate-400 mt-6 text-center">
          کلیه حقوق متعلق به شرکت مهندسی رهنمون کیفیت رابو است © ۱۴۰۵
        </p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Sidebar - با بسته‌بودن اولیه تمامی آکاردئون‌ها و اعمال کامل RBAC */}
      <Sidebar
        currentUser={currentUser}
        currentView={currentView}
        setCurrentView={(view) => {
          if (canAccessView(view, currentUser)) {
            setCurrentView(view);
          } else {
            showToast('شما مجوز دسترسی به این بخش را ندارید.');
          }
          setIsMobileMenuOpen(false);
        }}
        openMenus={openMenus}
        toggleMenu={toggleMenu}
        openSentLetters={openSentLetters}
        setOpenSentLetters={setOpenSentLetters}
        todayDueCount={todayDueCount}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onLogout={() => {
          setCurrentUser(null);
          showToast('از سامانه خارج شدید.');
        }}
      />

      {/* Main Container */}
      <main className="flex-1 p-3 sm:p-5 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Sticky Header with Quick Messenger */}
        <Header
          currentView={currentView}
          currentUser={currentUser}
          todayStr={todayStr}
          onBackup={handleBackupDownload}
          onLogout={() => {
            setCurrentUser(null);
            showToast('از سامانه خارج شدید.');
          }}
          onToggleMenu={() => setIsMobileMenuOpen(prev => !prev)}
          notificationsCount={dueLettersCount}
          onCheckDueLetters={() => {
            const items = checkDueLettersAndNotify(receivedLetters, todayStr, { force: true });
            if (items.length > 0) {
              showToast(`اعلان مرورگری برای ${items.length} نامه دارای موعد سررسید ارسال گردید.`);
            } else {
              showToast('هیچ نامه‌ای با موعد سررسید امروز یا سپری‌شده یافت نشد.');
            }
          }}
          onNavigate={(view) => {
            if (canAccessView(view, currentUser)) {
              setCurrentView(view);
            } else {
              showToast('شما مجوز دسترسی به این بخش را ندارید.');
            }
          }}
          onOpenNotificationCenter={() => setIsNotificationCenterOpen(true)}
        />

        {toastMessage && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-xs font-bold mb-6 flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* --- VIEW ROUTER WITH STRICT RBAC GUARD --- */}
        {!canAccessView(currentView, currentUser) ? (
          <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center shadow-xs max-w-lg mx-auto my-12 animate-in fade-in">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-2">عدم دسترسی به این بخش (RBAC)</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              کاربر گرامی {currentUser.name}، شما بر اساس سطوح دسترسی سازمانی به این بخش دسترسی ندارید. جهت فعال‌سازی این زیرماژول با مدیریت ارشد شرکت مهندسی رابو تماس حاصل فرمایید.
            </p>
            <button
              type="button"
              onClick={() => setCurrentView(getDefaultLandingView(currentUser))}
              className="bg-[#13213c] hover:bg-[#1c325c] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-all shadow-xs"
            >
              بازگشت به کارتابل مجاز
            </button>
          </div>
        ) : (
          <>
            {/* 1. Dashboard */}
            {currentView === 'dashboard' && (
              <DashboardView
                currentUser={currentUser}
                crmLeads={crmLeads}
                todayDueLeads={crmLeads.filter(
                  l => l.nextFollowUpDate === todayStr && l.status !== 'جلسه حضوری هماهنگ شد' && !l.status.includes('قرارداد')
                )}
                receivedLetters={receivedLetters}
                sentLetters={sentLetters}
                attendanceRecords={attendanceRecords}
                leaveMissionRequests={leaveMissionRequests}
                personnelList={personnelList}
                todayStr={todayStr}
                projectsList={projectsList}
                onNavigate={setCurrentView}
                onOpenNotificationCenter={() => setIsNotificationCenterOpen(true)}
              />
            )}

        {/* 1.1 Executive Reporting */}
        {currentView === 'dashboard-reporting' && (
          <ExecutiveReportingView
            currentUser={currentUser}
            projectsList={projectsList}
            crmLeads={crmLeads}
            personnelList={personnelList}
            attendanceRecords={attendanceRecords}
            todayStr={todayStr}
            onNavigate={setCurrentView}
            setToastMessage={showToast}
          />
        )}

        {/* 2. Letters */}
        {currentView === 'letters-inbox' && (
          <LettersView
            currentSubView="inbox"
            currentUser={currentUser}
            projectsList={projectsList}
            setProjectsList={setProjectsList}
            personnelList={personnelList}
            letterTemplates={letterTemplates}
            receivedLetters={receivedLetters}
            setReceivedLetters={setReceivedLetters}
            sentLetters={sentLetters}
            setSentLetters={setSentLetters}
            receiptMethods={receiptMethods}
            todayStr={todayStr}
            todayYear={today.year}
            todayMonth={today.month}
            todayDay={today.day}
            setToastMessage={showToast}
          />
        )}

        {currentView === 'letters-outbox-create' && (
          <LettersView
            currentSubView="outbox-create"
            currentUser={currentUser}
            projectsList={projectsList}
            setProjectsList={setProjectsList}
            personnelList={personnelList}
            letterTemplates={letterTemplates}
            receivedLetters={receivedLetters}
            setReceivedLetters={setReceivedLetters}
            sentLetters={sentLetters}
            setSentLetters={setSentLetters}
            receiptMethods={receiptMethods}
            todayStr={todayStr}
            todayYear={today.year}
            todayMonth={today.month}
            todayDay={today.day}
            setToastMessage={showToast}
          />
        )}

        {currentView === 'letters-outbox-archive' && (
          <LettersView
            currentSubView="outbox-archive"
            currentUser={currentUser}
            projectsList={projectsList}
            setProjectsList={setProjectsList}
            personnelList={personnelList}
            letterTemplates={letterTemplates}
            receivedLetters={receivedLetters}
            setReceivedLetters={setReceivedLetters}
            sentLetters={sentLetters}
            setSentLetters={setSentLetters}
            receiptMethods={receiptMethods}
            todayStr={todayStr}
            todayYear={today.year}
            todayMonth={today.month}
            todayDay={today.day}
            setToastMessage={showToast}
          />
        )}

        {/* 3. Marketing / CRM */}
        {(currentView === 'crm-leads' || currentView === 'crm-leads-energy' || currentView === 'crm-leads-management') && (
          <CrmView
            currentSubView={
              currentView === 'crm-leads-energy'
                ? 'leads-energy'
                : currentView === 'crm-leads-management'
                ? 'leads-management'
                : 'leads'
            }
            currentUser={currentUser}
            crmLeads={crmLeads}
            setCrmLeads={setCrmLeads}
            energyLeads={energyLeads}
            setEnergyLeads={setEnergyLeads}
            managementLeads={managementLeads}
            setManagementLeads={setManagementLeads}
            contactsList={contactsList}
            setContactsList={setContactsList}
            personnelList={personnelList}
            projectsList={projectsList}
            setProjectsList={setProjectsList}
            setPersonnelList={setPersonnelList}
            todayStr={todayStr}
            setToastMessage={showToast}
            onInspectLocation={(addr) => {
              setMapsInitialQuery(`مسیرهای دسترسی و موقعیت ملک: ${addr}`);
              setIsMapsModalOpen(true);
            }}
          />
        )}

        {currentView === 'crm-due-today' && (
          <CrmView
            currentSubView="due-today"
            currentUser={currentUser}
            crmLeads={crmLeads}
            setCrmLeads={setCrmLeads}
            energyLeads={energyLeads}
            setEnergyLeads={setEnergyLeads}
            managementLeads={managementLeads}
            setManagementLeads={setManagementLeads}
            contactsList={contactsList}
            setContactsList={setContactsList}
            personnelList={personnelList}
            projectsList={projectsList}
            setProjectsList={setProjectsList}
            setPersonnelList={setPersonnelList}
            todayStr={todayStr}
            setToastMessage={showToast}
            onInspectLocation={(addr) => {
              setMapsInitialQuery(`مسیرهای دسترسی و موقعیت ملک: ${addr}`);
              setIsMapsModalOpen(true);
            }}
          />
        )}

        {(currentView === 'crm-customers' || currentView === 'crm-meetings') && (
          <CrmView
            currentSubView={currentView === 'crm-customers' ? 'customers' : 'meetings'}
            currentUser={currentUser}
            crmLeads={crmLeads}
            setCrmLeads={setCrmLeads}
            energyLeads={energyLeads}
            setEnergyLeads={setEnergyLeads}
            managementLeads={managementLeads}
            setManagementLeads={setManagementLeads}
            contactsList={contactsList}
            setContactsList={setContactsList}
            personnelList={personnelList}
            projectsList={projectsList}
            setProjectsList={setProjectsList}
            setPersonnelList={setPersonnelList}
            todayStr={todayStr}
            setToastMessage={showToast}
            onInspectLocation={(addr) => {
              setMapsInitialQuery(`مسیرهای دسترسی و موقعیت ملک: ${addr}`);
              setIsMapsModalOpen(true);
            }}
          />
        )}

        {/* Projects View */}
        {currentView === 'projects' && (
          <ProjectsView
            currentUser={currentUser}
            projectsList={projectsList}
            setProjectsList={setProjectsList}
            todayStr={todayStr}
            setToastMessage={showToast}
            personnelList={personnelList}
            receivedLetters={receivedLetters}
            sentLetters={sentLetters}
            onInspectLocation={(addr) => {
              setMapsInitialQuery(`مسیرهای دسترسی و موقعیت پروژه: ${addr}`);
              setIsMapsModalOpen(true);
            }}
          />
        )}

        {/* Tasks & Collaboration View */}
        {(currentView === 'tasks' || currentView === 'tasks-chat') && (
          <TasksCollaborationView
            currentUser={currentUser}
            personnelList={personnelList}
            projectsList={projectsList}
            todayStr={todayStr}
            setToastMessage={showToast}
            tasksList={tasksList}
            setTasksList={setTasksList}
            messages={chatMessages}
            setMessages={setChatMessages}
            initialTab={currentView === 'tasks-chat' ? 'chat' : 'tasks'}
          />
        )}

        {/* Petty Cash View (مالی و تنخواه‌گردان) */}
        {currentView === 'petty-cash' && (
          <PettyCashView
            currentUser={currentUser}
            projectsList={projectsList}
            personnelList={personnelList}
            todayStr={todayStr}
            setToastMessage={showToast}
            inflows={pettyCashInflows}
            setInflows={setPettyCashInflows}
            expenses={pettyCashExpenses}
            setExpenses={setPettyCashExpenses}
          />
        )}

        {/* 4. HR Modules (Protected by RBAC) */}
        {currentView === 'hr-attendance' && (
          <HrView
            currentSubView="attendance"
            currentUser={currentUser}
            personnelList={personnelList}
            setPersonnelList={setPersonnelList}
            projectsList={projectsList}
            attendanceRecords={attendanceRecords}
            setAttendanceRecords={setAttendanceRecords}
            dailyTodos={dailyTodos}
            setDailyTodos={setDailyTodos}
            personalCalendarEvents={personalCalendarEvents}
            setPersonalCalendarEvents={setPersonalCalendarEvents}
            leaveMissionRequests={leaveMissionRequests}
            setLeaveMissionRequests={setLeaveMissionRequests}
            payrollRecords={payrollRecords}
            setPayrollRecords={setPayrollRecords}
            trainingMatrix={trainingMatrix}
            setTrainingMatrix={setTrainingMatrix}
            todayStr={todayStr}
            setToastMessage={showToast}
          />
        )}

        {currentView === 'hr-employees' && (
          <HrView
            currentSubView="employees"
            currentUser={currentUser}
            personnelList={personnelList}
            setPersonnelList={setPersonnelList}
            projectsList={projectsList}
            attendanceRecords={attendanceRecords}
            setAttendanceRecords={setAttendanceRecords}
            dailyTodos={dailyTodos}
            setDailyTodos={setDailyTodos}
            personalCalendarEvents={personalCalendarEvents}
            setPersonalCalendarEvents={setPersonalCalendarEvents}
            leaveMissionRequests={leaveMissionRequests}
            setLeaveMissionRequests={setLeaveMissionRequests}
            payrollRecords={payrollRecords}
            setPayrollRecords={setPayrollRecords}
            trainingMatrix={trainingMatrix}
            setTrainingMatrix={setTrainingMatrix}
            todayStr={todayStr}
            setToastMessage={showToast}
            onInspectLocation={(addr) => {
              setMapsInitialQuery(`موقعیت مکانی محل سکونت پرسنل: ${addr}`);
              setIsMapsModalOpen(true);
            }}
          />
        )}

        {currentView === 'hr-payroll' && (
          <HrView
            currentSubView="payroll"
            currentUser={currentUser}
            personnelList={personnelList}
            setPersonnelList={setPersonnelList}
            projectsList={projectsList}
            attendanceRecords={attendanceRecords}
            setAttendanceRecords={setAttendanceRecords}
            dailyTodos={dailyTodos}
            setDailyTodos={setDailyTodos}
            personalCalendarEvents={personalCalendarEvents}
            setPersonalCalendarEvents={setPersonalCalendarEvents}
            leaveMissionRequests={leaveMissionRequests}
            setLeaveMissionRequests={setLeaveMissionRequests}
            payrollRecords={payrollRecords}
            setPayrollRecords={setPayrollRecords}
            trainingMatrix={trainingMatrix}
            setTrainingMatrix={setTrainingMatrix}
            todayStr={todayStr}
            setToastMessage={showToast}
          />
        )}

        {currentView === 'hr-kpi' && (
          <HrView
            currentSubView="kpi"
            currentUser={currentUser}
            personnelList={personnelList}
            setPersonnelList={setPersonnelList}
            projectsList={projectsList}
            attendanceRecords={attendanceRecords}
            setAttendanceRecords={setAttendanceRecords}
            dailyTodos={dailyTodos}
            setDailyTodos={setDailyTodos}
            personalCalendarEvents={personalCalendarEvents}
            setPersonalCalendarEvents={setPersonalCalendarEvents}
            leaveMissionRequests={leaveMissionRequests}
            setLeaveMissionRequests={setLeaveMissionRequests}
            payrollRecords={payrollRecords}
            setPayrollRecords={setPayrollRecords}
            trainingMatrix={trainingMatrix}
            setTrainingMatrix={setTrainingMatrix}
            kpiIndicators={kpiIndicators}
            setKpiIndicators={setKpiIndicators}
            kpiEvaluations={kpiEvaluations}
            setKpiEvaluations={setKpiEvaluations}
            todayStr={todayStr}
            setToastMessage={showToast}
          />
        )}

        {currentView === 'hr-training' && (
          <HrView
            currentSubView="training"
            currentUser={currentUser}
            personnelList={personnelList}
            setPersonnelList={setPersonnelList}
            projectsList={projectsList}
            attendanceRecords={attendanceRecords}
            setAttendanceRecords={setAttendanceRecords}
            dailyTodos={dailyTodos}
            setDailyTodos={setDailyTodos}
            personalCalendarEvents={personalCalendarEvents}
            setPersonalCalendarEvents={setPersonalCalendarEvents}
            leaveMissionRequests={leaveMissionRequests}
            setLeaveMissionRequests={setLeaveMissionRequests}
            payrollRecords={payrollRecords}
            setPayrollRecords={setPayrollRecords}
            trainingMatrix={trainingMatrix}
            setTrainingMatrix={setTrainingMatrix}
            todayStr={todayStr}
            setToastMessage={showToast}
          />
        )}
      </>
    )}

        {/* Google Maps Grounding Modal */}
        <MapsGroundingModal
          isOpen={isMapsModalOpen}
          onClose={() => setIsMapsModalOpen(false)}
          initialQuery={mapsInitialQuery}
        />

        {/* Gemini 3.8 Live API Voice Assistant */}
        <LiveVoiceAssistant
          isOpen={isLiveAssistantOpen}
          onClose={() => setIsLiveAssistantOpen(false)}
        />

        {/* Notification Center Modal */}
        <NotificationCenterModal
          isOpen={isNotificationCenterOpen}
          onClose={() => setIsNotificationCenterOpen(false)}
          onNavigate={setCurrentView}
        />

        {/* User-Specific Dynamic Notifications Toast */}
        <InAppNotificationToast 
          currentUser={currentUser} 
          onNavigate={setCurrentView} 
        />
      </main>
    </div>
  );
}
