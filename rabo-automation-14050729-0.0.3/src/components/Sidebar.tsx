import React from 'react';
import { Employee, EmployeePermissions } from '../types';
import { 
  LayoutDashboard, 
  Mail, 
  Users, 
  Coins, 
  UserCheck, 
  TrendingUp, 
  FolderKanban, 
  CheckSquare, 
  LogOut,
  ChevronDown,
  ChevronUp,
  X,
  MessageSquare,
  BarChart3
} from 'lucide-react';

interface SidebarProps {
  currentUser: Employee;
  currentView: string;
  setCurrentView: (view: string) => void;
  openMenus: Record<string, boolean>;
  toggleMenu: (key: string) => void;
  openSentLetters: boolean;
  setOpenSentLetters: (open: boolean) => void;
  todayDueCount: number;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  currentView,
  setCurrentView,
  openMenus,
  toggleMenu,
  openSentLetters,
  setOpenSentLetters,
  todayDueCount,
  onLogout,
  isOpen = false,
  onClose
}) => {
  const [openLeadsSubmenu, setOpenLeadsSubmenu] = React.useState(false);

  const hasAccess = (subKey: keyof EmployeePermissions): boolean => {
    if (!currentUser) return false;
    if (currentUser.isManager) return true;
    const perms = currentUser.permissions;
    if (!perms) return false;

    // Direct strict sub-key check
    if (perms[subKey] !== undefined) {
      return Boolean(perms[subKey]);
    }

    return false;
  };

  const handleNavClick = (viewName: string) => {
    setCurrentView(viewName);
    if (onClose) {
      onClose();
    }
  };

  const canSeeDashboard = hasAccess('dashboard_personal') || hasAccess('dashboard_executive');
  const canSeeLetters = hasAccess('letters_inbox') || hasAccess('letters_outbox_create') || hasAccess('letters_archive');
  const canSeeCrm = hasAccess('crm_fire') || hasAccess('crm_energy') || hasAccess('crm_management') || hasAccess('crm_customers') || hasAccess('crm_followups');
  const canSeeProjects = hasAccess('projects_view') || hasAccess('projects_manage');
  const canSeeTasks = hasAccess('tasks_board') || hasAccess('tasks_chat');
  const canSeeHr = hasAccess('hr_employees') || hasAccess('hr_attendance') || hasAccess('hr_payroll') || hasAccess('hr_kpi') || hasAccess('hr_training');
  const canSeeFinance = hasAccess('finance_petty_cash') || hasAccess('finance_audit');

  return (
    <>
      {/* Backdrop when sidebar is open */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar drawer: stretches full screen height to bottom */}
      <aside 
        className={`fixed inset-y-0 right-0 h-screen w-80 max-w-[85vw] bg-[#13213c] text-white flex flex-col p-5 overflow-y-auto select-none shadow-2xl z-50 transition-transform duration-300 ease-in-out border-l border-slate-700/50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* هدر سایدبار - دارای دکمه بستن و عنوان سازمانی */}
        <div className="mb-4 pb-3 border-b border-white/10 flex items-center justify-between">
          <div 
            onClick={() => {
              if (canSeeDashboard) handleNavClick('dashboard');
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
            <span className="font-black text-sm text-white tracking-wide">اتوماسیون مهندسی رابو</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-400 font-semibold bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
              نسخه سازمانی
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="بستن منو"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* منوهای ناوبری */}
        <nav className="flex flex-col gap-1.5 flex-1 text-xs">
          {/* ۱. داشبورد مدیریتی */}
          {canSeeDashboard && (
            <div className="rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => { 
                  if (hasAccess('dashboard_personal')) {
                    setCurrentView('dashboard');
                  } else if (hasAccess('dashboard_executive')) {
                    setCurrentView('dashboard-reporting');
                  }
                  toggleMenu('dashboard'); 
                  onClose(); 
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all font-medium ${
                  currentView === 'dashboard' || currentView === 'dashboard-reporting'
                    ? 'bg-amber-400/15 text-amber-400 font-bold' 
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4 text-amber-400" />
                  <span>داشبورد و گزارش‌ها</span>
                </div>
                {openMenus.dashboard ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {openMenus.dashboard && (
                <div className="pr-7 pl-2 py-1 flex flex-col gap-1 text-[11.5px] border-r-2 border-amber-400/30 mr-3 my-1">
                  {hasAccess('dashboard_personal') && (
                    <button
                      type="button"
                      onClick={() => handleNavClick('dashboard')}
                      className={`text-right py-1 px-2 rounded hover:text-white transition-colors ${
                        currentView === 'dashboard' ? 'text-amber-300 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      گزارش وضعیت کلان سازمان
                    </button>
                  )}
                  {hasAccess('dashboard_executive') && (
                    <button
                      type="button"
                      onClick={() => handleNavClick('dashboard-reporting')}
                      className={`text-right py-1 px-2 rounded transition-colors flex items-center justify-between ${
                        currentView === 'dashboard-reporting' ? 'bg-white/10 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>گزارش‌های مدیریتی (BI & PDF)</span>
                      <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1 py-0.5 rounded font-bold">جدید</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ۲. کارتابل نامه‌ها و مکاتبات اداری */}
          {canSeeLetters && (
            <div className="rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMenu('letters')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all font-medium ${
                  currentView.startsWith('letters') 
                    ? 'bg-amber-400/15 text-amber-400 font-bold' 
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-amber-400" />
                  <span>کارتابل نامه‌ها و هامش</span>
                </div>
                {openMenus.letters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {openMenus.letters && (
                <div className="pr-6 pl-2 py-1 flex flex-col gap-1 text-[11.5px] border-r-2 border-amber-400/30 mr-3 my-1">
                  {hasAccess('letters_inbox') && (
                    <button
                      type="button"
                      onClick={() => handleNavClick('letters-inbox')}
                      className={`text-right py-1.5 px-2 rounded transition-colors ${
                        currentView === 'letters-inbox' ? 'bg-white/10 text-amber-300 font-semibold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      نامه‌های دریافتی (وارده)
                    </button>
                  )}
                  {(hasAccess('letters_outbox_create') || hasAccess('letters_archive')) && (
                    <div className="pt-1 border-t border-white/5">
                      <div
                        onClick={() => setOpenSentLetters(!openSentLetters)}
                        className="flex items-center justify-between py-1.5 px-2 text-slate-300 hover:text-white cursor-pointer rounded"
                      >
                        <span>نامه‌های ارسالی (صادره)</span>
                        {openSentLetters ? <ChevronUp className="w-3 h-3 text-amber-400" /> : <ChevronDown className="w-3 h-3" />}
                      </div>
                      {openSentLetters && (
                        <div className="pr-3 py-1 flex flex-col gap-1 border-r border-dashed border-amber-400/30 mr-2 my-0.5 text-[11px]">
                          {hasAccess('letters_outbox_create') && (
                            <button
                              type="button"
                              onClick={() => handleNavClick('letters-outbox-create')}
                              className={`text-right py-1 px-2 rounded transition-colors ${
                                currentView === 'letters-outbox-create' ? 'bg-white/10 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              ایجاد و صدور نامه جدید
                            </button>
                          )}
                          {hasAccess('letters_archive') && (
                            <button
                              type="button"
                              onClick={() => handleNavClick('letters-outbox-archive')}
                              className={`text-right py-1 px-2 rounded transition-colors ${
                                currentView === 'letters-outbox-archive' ? 'bg-white/10 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              بایگانی و پیگیری ارسال
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ۳. سرنخ‌های بازاریابی و CRM */}
          {canSeeCrm && (
            <div className="rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMenu('crm')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all font-medium ${
                  currentView.startsWith('crm') 
                    ? 'bg-amber-400/15 text-amber-400 font-bold' 
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>سرنخ‌های بازاریابی و CRM</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {todayDueCount > 0 && hasAccess('crm_followups') && (
                    <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {todayDueCount}
                    </span>
                  )}
                  {openMenus.crm ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>
              {openMenus.crm && (
                <div className="pr-5 pl-2 py-1 flex flex-col gap-1 text-[11.5px] border-r-2 border-amber-400/30 mr-3 my-1">
                  {(hasAccess('crm_fire') || hasAccess('crm_energy') || hasAccess('crm_management')) && (
                    <div>
                      <div
                        onClick={() => setOpenLeadsSubmenu(!openLeadsSubmenu)}
                        className={`flex items-center justify-between py-1.5 px-2 rounded cursor-pointer transition-colors ${
                          currentView === 'crm-leads' || currentView === 'crm-leads-energy' || currentView === 'crm-leads-management'
                            ? 'text-amber-300 font-bold bg-white/5'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        <span>سرنخ‌های تخصصی</span>
                        {openLeadsSubmenu ? <ChevronUp className="w-3 h-3 text-amber-400" /> : <ChevronDown className="w-3 h-3" />}
                      </div>
                      {openLeadsSubmenu && (
                        <div className="pr-3 py-1 flex flex-col gap-1 border-r border-dashed border-amber-400/30 mr-2 my-0.5 text-[11px]">
                          {hasAccess('crm_fire') && (
                            <button
                              type="button"
                              onClick={() => handleNavClick('crm-leads')}
                              className={`text-right py-1 px-2 rounded transition-colors ${
                                currentView === 'crm-leads' ? 'bg-white/10 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              بانک اطلاعات حریق
                            </button>
                          )}
                          {hasAccess('crm_energy') && (
                            <button
                              type="button"
                              onClick={() => handleNavClick('crm-leads-energy')}
                              className={`text-right py-1 px-2 rounded transition-colors ${
                                currentView === 'crm-leads-energy' ? 'bg-white/10 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              بانک اطلاعات انرژی
                            </button>
                          )}
                          {hasAccess('crm_management') && (
                            <button
                              type="button"
                              onClick={() => handleNavClick('crm-leads-management')}
                              className={`text-right py-1 px-2 rounded transition-colors ${
                                currentView === 'crm-leads-management' ? 'bg-white/10 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              بانک اطلاعات سیستم مدیریت
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {hasAccess('crm_customers') && (
                    <button
                      type="button"
                      onClick={() => handleNavClick('crm-customers')}
                      className={`text-right py-1.5 px-2 rounded transition-colors font-medium ${
                        currentView === 'crm-customers' ? 'bg-white/10 text-amber-300 font-bold' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      دفتر مخاطبان و مشتریان
                    </button>
                  )}

                  {hasAccess('crm_followups') && (
                    <button
                      type="button"
                      onClick={() => handleNavClick('crm-due-today')}
                      className={`text-right py-1.5 px-2 rounded flex justify-between items-center transition-colors font-medium ${
                        currentView === 'crm-due-today' ? 'bg-white/10 text-amber-300 font-bold' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <span>کارتابل پیگیری‌ها</span>
                      {todayDueCount > 0 && (
                        <span className="bg-rose-500/20 text-rose-300 text-[10px] px-1.5 py-0.5 rounded-full border border-rose-500/40 font-bold">
                          {todayDueCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ۴. مدیریت جامع پروژه‌ها */}
          {canSeeProjects && (
            <div className="rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => handleNavClick('projects')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all font-medium ${
                  currentView === 'projects' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FolderKanban className="w-4 h-4 text-amber-400" />
                  <span>مدیریت جامع پروژه‌ها</span>
                </div>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                  مهندسی
                </span>
              </button>
            </div>
          )}

          {/* ۵. وظایف، تسک‌ها و گفتگوی تیمی */}
          {canSeeTasks && (
            <div className="rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  if (hasAccess('tasks_board')) {
                    handleNavClick('tasks');
                  } else if (hasAccess('tasks_chat')) {
                    handleNavClick('tasks-chat');
                  }
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all font-medium ${
                  currentView === 'tasks' || currentView === 'tasks-chat'
                    ? 'bg-amber-400/15 text-amber-400 font-bold' 
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                  <span>وظایف و گفتگوی تیمی</span>
                </div>
                {hasAccess('tasks_chat') && <MessageSquare className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            </div>
          )}

          {/* ۶. سرمایه انسانی HR */}
          {canSeeHr && (
            <div className="rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMenu('hr')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all font-medium ${
                  currentView.startsWith('hr') 
                    ? 'bg-amber-400/15 text-amber-400 font-bold' 
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <span>سرمایه انسانی (HR)</span>
                </div>
                {openMenus.hr ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {openMenus.hr && (
                <div className="pr-6 pl-2 py-1 flex flex-col gap-1 text-[11.5px] border-r-2 border-amber-400/30 mr-3 my-1">
                  {hasAccess('hr_employees') && (
                    <button
                      type="button"
                      onClick={() => handleNavClick('hr-employees')}
                      className={`text-right py-1.5 px-2 rounded transition-colors ${
                        currentView === 'hr-employees' ? 'bg-white/10 text-amber-300 font-semibold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      پرونده پرسنلی (نمای ردیفی)
                    </button>
                  )}
                  {hasAccess('hr_attendance') && (
                    <button
                      type="button"
                      onClick={() => handleNavClick('hr-attendance')}
                      className={`text-right py-1.5 px-2 rounded transition-colors ${
                        currentView === 'hr-attendance' ? 'bg-white/10 text-amber-300 font-semibold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      تقویم تردد، مأموریت و مرخصی
                    </button>
                  )}
                  {hasAccess('hr_payroll') && (
                    <button
                      type="button"
                      onClick={() => handleNavClick('hr-payroll')}
                      className={`text-right py-1.5 px-2 rounded transition-colors ${
                        currentView === 'hr-payroll' ? 'bg-white/10 text-amber-300 font-semibold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      حقوق، دستمزد و پورسانت
                    </button>
                  )}
                  {hasAccess('hr_kpi') && (
                    <button
                      type="button"
                      onClick={() => handleNavClick('hr-kpi')}
                      className={`text-right py-1.5 px-2 rounded transition-colors ${
                        currentView === 'hr-kpi' ? 'bg-white/10 text-amber-300 font-semibold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      پایش عملکرد و KPI
                    </button>
                  )}
                  {hasAccess('hr_training') && (
                    <button
                      type="button"
                      onClick={() => handleNavClick('hr-training')}
                      className={`text-right py-1.5 px-2 rounded transition-colors ${
                        currentView === 'hr-training' ? 'bg-white/10 text-amber-300 font-semibold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      آموزش و ماتریس شایستگی
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ۷. مالی و تنخواه */}
          {canSeeFinance && (
            <div className="rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMenu('finance')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg transition-all font-medium text-slate-300 hover:bg-white/5 hover:text-white"
              >
                <div className="flex items-center gap-2.5">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>امور مالی و تنخواه</span>
                </div>
                {openMenus.finance ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {openMenus.finance && (
                <div className="pr-6 pl-2 py-1 flex flex-col gap-1 text-[11.5px] border-r-2 border-amber-400/30 mr-3 my-1">
                  {hasAccess('finance_petty_cash') && (
                    <button
                      type="button"
                      onClick={() => handleNavClick('petty-cash')}
                      className={`text-right py-1.5 px-2 rounded transition-colors ${
                        currentView === 'petty-cash' ? 'bg-white/10 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      سامانه تنخواه و رسیدها
                    </button>
                  )}
                  {hasAccess('hr_payroll') && (
                    <button
                      type="button"
                      onClick={() => handleNavClick('hr-payroll')}
                      className={`text-right py-1.5 px-2 rounded transition-colors ${
                        currentView === 'hr-payroll' ? 'bg-white/10 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      فیش‌های حقوقی رسمی
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ۸. فرصت‌های توسعه */}
          {hasAccess('devOpportunities') && (
            <div className="rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMenu('devOpportunities')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg transition-all font-medium text-slate-300 hover:bg-white/5 hover:text-white"
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <span>فرصت‌های توسعه</span>
                </div>
              </button>
            </div>
          )}
        </nav>

        {/* User profile footer - همیشه تا انتهای پایین صفحه امتداد دارد */}
        <div className="mt-auto pt-4 border-t border-white/10 shrink-0">
          <div className="p-2.5 bg-white/5 rounded-lg border border-white/10 flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                    if (e.currentTarget.nextElementSibling) {
                      (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                    }
                  }}
                  className="w-9 h-9 rounded-full object-cover border border-amber-400/40 shrink-0"
                />
              ) : null}
              <div
                style={{ display: currentUser.avatar ? 'none' : 'flex' }}
                className="w-9 h-9 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold items-center justify-center text-xs shrink-0"
              >
                {currentUser.name ? currentUser.name.slice(0, 1) : 'ر'}
              </div>
              <div className="overflow-hidden min-w-0">
                <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
                <div className="text-[10px] text-amber-400 truncate">
                  {currentUser.positionLevel} | {currentUser.unit}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-1.5 bg-[#800000] hover:bg-[#660000] text-white py-1.5 px-2 rounded-md text-[11px] font-semibold transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج از حساب</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
