import React, { useState, useEffect, useMemo } from 'react';
import { CrmLead, ReceivedLetter, SentLetter, AttendanceRecord, Project, Employee, LeaveMissionRequest } from '../types';
import { 
  Building2, 
  CalendarClock, 
  MailCheck, 
  Send, 
  CheckCircle2, 
  Bell, 
  CheckSquare, 
  Mail, 
  ExternalLink, 
  Clock, 
  CheckCheck, 
  Trash2, 
  PhoneCall, 
  DollarSign,
  Sparkles,
  BarChart3,
  TrendingUp,
  FolderKanban,
  Activity,
  Layers,
  Filter,
  ArrowUpRight,
  Info,
  Users,
  UserCheck,
  Briefcase
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  NotificationHistoryItem,
  getStoredNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotificationFromHistory,
  subscribeToNotifications
} from '../utils/notificationStore';
import { toEn, toFa, getTodayShamsi } from '../utils/jalali';
import { DashboardAnalyticsChart } from './DashboardAnalyticsChart';

interface DashboardViewProps {
  currentUser?: Employee;
  crmLeads: CrmLead[];
  todayDueLeads: CrmLead[];
  receivedLetters: ReceivedLetter[];
  sentLetters: SentLetter[];
  attendanceRecords: AttendanceRecord[];
  leaveMissionRequests?: LeaveMissionRequest[];
  personnelList?: Employee[];
  todayStr?: string;
  projectsList?: Project[];
  onNavigate: (view: string) => void;
  onOpenNotificationCenter?: () => void;
}

// Custom RTL Persian Tooltip for Recharts
const CustomChartTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div dir="rtl" className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700/80 text-xs backdrop-blur-md min-w-44 z-50 pointer-events-none">
        <div className="font-black text-slate-200 border-b border-slate-700/80 pb-1.5 mb-2 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-amber-400 font-mono">ماهانه</span>
        </div>
        <div className="space-y-2">
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span 
                  className="w-2.5 h-2.5 rounded-xs shrink-0" 
                  style={{ backgroundColor: item.color || item.fill || item.stroke }} 
                />
                <span>{item.name}:</span>
              </span>
              <span className="font-mono font-black text-white tabular-nums">
                {typeof item.value === 'number' ? item.value.toLocaleString('fa-IR') : item.value}
                {item.unit ? ` ${item.unit}` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  crmLeads,
  todayDueLeads,
  receivedLetters,
  sentLetters,
  attendanceRecords = [],
  leaveMissionRequests = [],
  personnelList = [],
  todayStr,
  projectsList = [],
  onNavigate,
  onOpenNotificationCenter
}) => {
  // Data Isolation: non-managers only see records associated with them
  const isManager = currentUser?.isManager ?? true;

  const effectiveReceivedLetters = useMemo(() => {
    if (isManager || !currentUser) return receivedLetters;
    return receivedLetters.filter(l => 
      l.expertId === currentUser.id ||
      l.expertName === currentUser.name ||
      l.managerId === currentUser.id ||
      l.timeline?.some(t => t.user?.includes(currentUser.name))
    );
  }, [receivedLetters, isManager, currentUser]);

  const effectiveSentLetters = useMemo(() => {
    if (isManager || !currentUser) return sentLetters;
    return sentLetters.filter(l => 
      l.creatorId === currentUser.id ||
      l.creatorName === currentUser.name ||
      l.signerName === currentUser.name
    );
  }, [sentLetters, isManager, currentUser]);

  const effectiveProjects = useMemo(() => {
    if (isManager || !currentUser) return projectsList;
    return projectsList.filter(p => 
      (p.teamMembers && p.teamMembers.includes(currentUser.name)) ||
      p.projectManagerId === currentUser.id ||
      p.projectManagerName === currentUser.name
    );
  }, [projectsList, isManager, currentUser]);

  const effectiveCrmLeads = useMemo(() => {
    if (isManager || !currentUser) return crmLeads;
    return crmLeads.filter(l => 
      l.assignedExpertId === currentUser.id ||
      l.assignedExpertName === currentUser.name ||
      l.assignedMarketerName === currentUser.name ||
      l.assignedTo === currentUser.name ||
      l.managerId === currentUser.id ||
      l.followUps?.some(f => f.user === currentUser.name)
    );
  }, [crmLeads, isManager, currentUser]);

  const effectiveTodayDueLeads = useMemo(() => {
    if (isManager || !currentUser) return todayDueLeads;
    return todayDueLeads.filter(l => 
      l.assignedExpertId === currentUser.id ||
      l.assignedExpertName === currentUser.name ||
      l.assignedMarketerName === currentUser.name ||
      l.assignedTo === currentUser.name ||
      l.followUps?.some(f => f.user === currentUser.name)
    );
  }, [todayDueLeads, isManager, currentUser]);

  const meetingCount = effectiveCrmLeads.filter(l => l.meetingInfo).length;
  const pendingLettersCount = effectiveSentLetters.filter(l => l.status !== 'ارسال و تحویل شده').length;

  // Chart configuration state
  const [chartTimeRange, setChartTimeRange] = useState<'6m' | '12m'>('6m');
  const [chartUnitFilter, setChartUnitFilter] = useState<string>('all');

  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>(getStoredNotifications);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'letter' | 'task' | 'crm'>('all');

  useEffect(() => {
    setNotifications(getStoredNotifications());
    const unsub = subscribeToNotifications(items => {
      setNotifications(items);
    });
    return unsub;
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = notifications.filter(n => {
    if (notifFilter === 'unread') return !n.isRead;
    if (notifFilter === 'letter') return n.type === 'letter';
    if (notifFilter === 'task') return n.type === 'task';
    if (notifFilter === 'crm') return n.type === 'crm';
    return true;
  });

  const handleNotificationClick = (item: NotificationHistoryItem) => {
    markNotificationAsRead(item.id);
    if (item.actionView) {
      onNavigate(item.actionView);
    }
  };

  const handleDeleteNotif = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotificationFromHistory(id);
  };

  // ----------------------------------------------------
  // RECHARTS MONTHLY ANALYTICS ENGINE
  // ----------------------------------------------------
  const PERSIAN_MONTH_NAMES = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];

  // Helper to extract Jalali year and month from string
  const parseJalaliYearMonth = (dateStr?: string): { year: number; month: number } | null => {
    if (!dateStr) return null;
    const clean = toEn(String(dateStr)).trim();
    const parts = clean.split(/[/.-]/);
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
        return { year: y, month: m };
      }
    }
    return null;
  };

  const currentShamsi = getTodayShamsi();
  const currentY = parseInt(toEn(currentShamsi.year), 10) || 1404;
  const currentM = parseInt(toEn(currentShamsi.month), 10) || 7;

  // Generate sequence of months
  const monthsList = useMemo(() => {
    const count = chartTimeRange === '6m' ? 6 : 12;
    const list: { key: string; name: string; shortName: string; year: number; month: number }[] = [];
    
    for (let i = count - 1; i >= 0; i--) {
      let m = currentM - i;
      let y = currentY;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }
      const key = `${y}/${String(m).padStart(2, '0')}`;
      const monthName = PERSIAN_MONTH_NAMES[m - 1] || `ماه ${m}`;
      list.push({
        key,
        name: `${monthName} ${toFa(y)}`,
        shortName: monthName,
        year: y,
        month: m
      });
    }
    return list;
  }, [chartTimeRange, currentY, currentM]);

  // Unit filtered datasets with user isolation
  const filteredReceived = useMemo(() => {
    return effectiveReceivedLetters.filter(l => {
      if (chartUnitFilter === 'all') return true;
      return l.unit === chartUnitFilter;
    });
  }, [effectiveReceivedLetters, chartUnitFilter]);

  const filteredSent = useMemo(() => {
    return effectiveSentLetters.filter(l => {
      if (chartUnitFilter === 'all') return true;
      return l.unit === chartUnitFilter;
    });
  }, [effectiveSentLetters, chartUnitFilter]);

  const filteredProjects = useMemo(() => {
    return effectiveProjects.filter(p => {
      if (chartUnitFilter === 'all') return true;
      return p.unit === chartUnitFilter;
    });
  }, [effectiveProjects, chartUnitFilter]);

  // Aggregation for Letters chart
  const monthlyLettersChartData = useMemo(() => {
    return monthsList.map(monthItem => {
      const rec = filteredReceived.filter(l => {
        const ym = parseJalaliYearMonth(l.issueDate || l.registeredAt);
        return ym && ym.year === monthItem.year && ym.month === monthItem.month;
      });

      const sent = filteredSent.filter(l => {
        const ym = parseJalaliYearMonth(l.date || l.createdAt);
        return ym && ym.year === monthItem.year && ym.month === monthItem.month;
      });

      const handled = rec.filter(l => (l.timeline && l.timeline.length > 0)).length +
        sent.filter(l => l.status === 'ارسال و تحویل شده').length;

      return {
        monthKey: monthItem.key,
        name: monthItem.name,
        shortName: monthItem.shortName,
        'نامه‌های وارده': rec.length,
        'نامه‌های صادره': sent.length,
        'کل مکاتبات': rec.length + sent.length,
        'اقدام شده': handled,
      };
    });
  }, [monthsList, filteredReceived, filteredSent]);

  // Aggregation for Projects chart
  const monthlyProjectsChartData = useMemo(() => {
    const list = filteredProjects;

    return monthsList.map(monthItem => {
      // Active projects active in or prior to this month
      const activeInMonth = list.filter(p => {
        const ym = parseJalaliYearMonth(p.contractDate);
        if (!ym) return true;
        if (ym.year < monthItem.year) return true;
        if (ym.year === monthItem.year && ym.month <= monthItem.month) return true;
        return false;
      });

      const completedInMonth = activeInMonth.filter(p => (p.progress || 0) >= 100);
      const inProgressInMonth = activeInMonth.filter(p => (p.progress || 0) < 100);

      const avgProgress = activeInMonth.length > 0
        ? Math.round(activeInMonth.reduce((sum, p) => sum + (p.progress || 0), 0) / activeInMonth.length)
        : 0;

      const newInMonth = list.filter(p => {
        const ym = parseJalaliYearMonth(p.contractDate);
        return ym && ym.year === monthItem.year && ym.month === monthItem.month;
      }).length;

      return {
        monthKey: monthItem.key,
        name: monthItem.name,
        shortName: monthItem.shortName,
        'پروژه‌های در حال اجرا': inProgressInMonth.length,
        'پروژه‌های تکمیل‌شده': completedInMonth.length,
        'کل پروژه‌ها': activeInMonth.length,
        'پروژه جدید': newInMonth,
        'میانگین درصد پیشرفت': avgProgress,
      };
    });
  }, [monthsList, filteredProjects]);

  // Fast Summary Metrics
  const totalLettersInPeriod = useMemo(() => {
    return monthlyLettersChartData.reduce((acc, curr) => acc + curr['کل مکاتبات'], 0);
  }, [monthlyLettersChartData]);

  const peakLetterMonth = useMemo(() => {
    if (monthlyLettersChartData.length === 0) return null;
    let maxItem = monthlyLettersChartData[0];
    for (const item of monthlyLettersChartData) {
      if (item['کل مکاتبات'] > maxItem['کل مکاتبات']) {
        maxItem = item;
      }
    }
    return maxItem['کل مکاتبات'] > 0 ? maxItem : null;
  }, [monthlyLettersChartData]);

  const overallAvgProgress = useMemo(() => {
    if (filteredProjects.length === 0) return 0;
    const sum = filteredProjects.reduce((acc, p) => acc + (p.progress || 0), 0);
    return Math.round(sum / filteredProjects.length);
  }, [filteredProjects]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => onNavigate('crm-leads')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer border-t-4 border-t-[#13213c] group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">کل پرونده‌های شهرسازی</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 tabular-nums">{effectiveCrmLeads.length.toLocaleString('fa-IR')}</div>
          <div className="text-[11px] text-slate-400 mt-1">پروژه‌های در حال پیگیری کارفرمایان</div>
        </div>

        <div 
          onClick={() => onNavigate('crm-due-today')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer border-t-4 border-t-rose-600 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">پیگیری‌های موعد امروز</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 mt-2 tabular-nums">{effectiveTodayDueLeads.length.toLocaleString('fa-IR')}</div>
          <div className="text-[11px] text-slate-400 mt-1">پرونده‌های نیازمند تماس فوری</div>
        </div>

        <div 
          onClick={() => onNavigate('crm-meetings')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer border-t-4 border-t-emerald-600 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">جلسات حضوری هماهنگ‌شده</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2 tabular-nums">{meetingCount.toLocaleString('fa-IR')}</div>
          <div className="text-[11px] text-slate-400 mt-1">جلسات تنظیم‌شده با کارفرمایان</div>
        </div>

        <div 
          onClick={() => onNavigate('letters-inbox')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer border-t-4 border-t-[#800000] group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">نامه‌های دریافتی کارتابل</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#800000] flex items-center justify-center group-hover:scale-110 transition-transform">
              <MailCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#800000] mt-2 tabular-nums">{effectiveReceivedLetters.length.toLocaleString('fa-IR')}</div>
          <div className="text-[11px] text-slate-400 mt-1">{pendingLettersCount.toLocaleString('fa-IR')} نامه ارسالی در انتظار تحویل</div>
        </div>
      </div>

      {/* کامپوننت اختصاصی نمودارهای میله‌ای و دایره‌ای حضور و غیاب، مرخصی و پیشرفت پروژه‌ها */}
      <DashboardAnalyticsChart
        currentUser={currentUser}
        attendanceRecords={attendanceRecords}
        leaveMissionRequests={leaveMissionRequests}
        personnelList={personnelList}
        projectsList={projectsList}
        todayStr={todayStr}
        onNavigate={onNavigate}
      />


      {/* ======================================================== */}
      {/* بخش نمودارهای تحلیلی ماهانه با Recharts                  */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-xs space-y-5">
        {/* هدر کنترل و فیلترهای تحلیلی */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#13213c] text-white flex items-center justify-center shrink-0 shadow-sm">
              <BarChart3 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-[#13213c]">
                  داشبورد تحلیلی روندهای ماهانه (Monthly Analytics Hub)
                </h3>
                <span className="text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80 px-2.5 py-0.5 rounded-lg">
                  مبتنی بر Recharts
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                پایش تحلیلی شتاب ثبت نامه‌های اداری (وارده و صادره) و عملکرد پیشرفت پروژه‌های مهندسی به صورت ماهانه
              </p>
            </div>
          </div>

          {/* فیلترهای تعاملی: بازه زمانی + دپارتمان سازمانی */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* فیلتر واحد مهندسی */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
              <select
                value={chartUnitFilter}
                onChange={(e) => setChartUnitFilter(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="all">همه دپارتمان‌ها</option>
                <option value="مهندسی حریق">مهندسی حریق</option>
                <option value="انرژی">بهینه‌سازی انرژی</option>
                <option value="سیستم مدیریت">سیستم‌های مدیریت</option>
              </select>
            </div>

            {/* سوییچ بازه زمانی ۶ ماه / ۱۲ ماه */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setChartTimeRange('6m')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  chartTimeRange === '6m'
                    ? 'bg-[#13213c] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ۶ ماه اخیر
              </button>
              <button
                type="button"
                onClick={() => setChartTimeRange('12m')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  chartTimeRange === '12m'
                    ? 'bg-[#13213c] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ۱۲ ماه گذشته
              </button>
            </div>
          </div>
        </div>

        {/* کارت‌های خلاصه آماری سریع (KPI Strips) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/90 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-500">کل گردش مکاتبات در بازه</span>
              <div className="text-lg font-black text-[#13213c] tabular-nums">
                {totalLettersInPeriod.toLocaleString('fa-IR')} <span className="text-xs font-normal text-slate-500">نامه</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-100/80 text-blue-900 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/90 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-500">ماه اوج ترافیک مکاتبات</span>
              <div className="text-sm font-black text-[#800000]">
                {peakLetterMonth ? `${peakLetterMonth.shortName} (${peakLetterMonth['کل مکاتبات'].toLocaleString('fa-IR')} نامه)` : 'در انتظار ثبت داده'}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-red-100/80 text-[#800000] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/90 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-500">میانگین پیشرفت فیزیکی پروژه‌ها</span>
              <div className="text-lg font-black text-emerald-700 tabular-nums">
                {overallAvgProgress.toLocaleString('fa-IR')}٪ <span className="text-xs font-normal text-slate-500">({filteredProjects.length.toLocaleString('fa-IR')} پروژه)</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-800 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* گرید دو ستونه نمودارها */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* نمودار ۱: روند ماهانه ثبت و گردش نامه‌ها (وارده vs صادره) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#13213c]" />
                  <h4 className="text-xs font-black text-slate-800">
                    روند ماهانه ثبت نامه‌ها (وارده و صادره)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('letters-inbox')}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                >
                  <span>کارتابل نامه‌ها</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mb-4">
                توزیع حجم نامه‌های ورودی به شرکت و نامه‌های رسمی ارسال‌شده در ماه‌های اخیر
              </p>

              {/* کانتینر Recharts AreaChart */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthlyLettersChartData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#13213c" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#13213c" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#800000" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#800000" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="shortName" 
                      tick={{ fontSize: 11, fill: '#64748b' }} 
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: '#64748b' }} 
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend 
                      verticalAlign="top" 
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="نامه‌های وارده"
                      stroke="#13213c"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorReceived)"
                    />
                    <Area
                      type="monotone"
                      dataKey="نامه‌های صادره"
                      stroke="#800000"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorSent)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* پاورقی تکمیلی نمودار نامه‌ها */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>وارده: {filteredReceived.length.toLocaleString('fa-IR')} | صادره: {filteredSent.length.toLocaleString('fa-IR')}</span>
              </span>
              <span className="font-mono text-slate-400">
                بازه: {chartTimeRange === '6m' ? '۶ ماهه' : '۱۲ ماهه'}
              </span>
            </div>
          </div>

          {/* نمودار ۲: روند عملکرد و پیشرفت فیزیکی پروژه‌ها (ComposedChart: Bar + Line) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <h4 className="text-xs font-black text-slate-800">
                    عملکرد و پیشرفت فیزیکی پروژه‌ها
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('projects')}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                >
                  <span>مدیریت پروژه‌ها</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mb-4">
                تعداد پروژه‌های فعال/تکمیل‌شده (ستونی) به همراه میانگین درصد پیشرفت ماهانه (خطی)
              </p>

              {/* کانتینر Recharts ComposedChart */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={monthlyProjectsChartData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="shortName" 
                      tick={{ fontSize: 11, fill: '#64748b' }} 
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    {/* محور عمودی چپ: تعداد پروژه‌ها */}
                    <YAxis 
                      yAxisId="countAxis"
                      tick={{ fontSize: 11, fill: '#64748b' }} 
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    {/* محور عمودی راست: درصد پیشرفت */}
                    <YAxis 
                      yAxisId="percentAxis"
                      orientation="right"
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: '#d97706' }} 
                      axisLine={false}
                      tickLine={false}
                      unit="٪"
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend 
                      verticalAlign="top" 
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Bar
                      yAxisId="countAxis"
                      dataKey="پروژه‌های در حال اجرا"
                      fill="#0284c7"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      yAxisId="countAxis"
                      dataKey="پروژه‌های تکمیل‌شده"
                      fill="#059669"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                    <Line
                      yAxisId="percentAxis"
                      type="monotone"
                      dataKey="میانگین درصد پیشرفت"
                      stroke="#d97706"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#d97706' }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* پاورقی تکمیلی نمودار پروژه‌ها */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
                <span>پروژه‌های ثبت‌شده: {filteredProjects.length.toLocaleString('fa-IR')} مورد</span>
              </span>
              <span className="font-mono text-emerald-700 font-bold">
                تکمیل کلی: {filteredProjects.filter(p => (p.progress || 0) >= 100).length.toLocaleString('fa-IR')} مورد
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* بخش اختصاصی مرکز تاریخچه اعلان‌ها (Notification Center) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${unreadCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-[#13213c]/10 text-[#13213c]'}`}>
              <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-bounce' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-[#13213c]">
                  مرکز تاریخچه اعلان‌های دریافتی (Notification Center)
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                    {unreadCount} جدید
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                مرور کلیه اعلان‌هایی که ممکن است از دست داده باشید؛ شامل سررسید نامه‌ها، انتصاب وظایف و یادآوری‌ها
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsAsRead}
                className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>خواندن همه اعلان‌ها</span>
              </button>
            )}

            {onOpenNotificationCenter && (
              <button
                type="button"
                onClick={onOpenNotificationCenter}
                className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>مشاهده در نمای اختصاصی</span>
              </button>
            )}
          </div>
        </div>

        {/* فیلترهای دسته‌بندی اعلان‌ها */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 text-xs scrollbar-none">
          <button
            type="button"
            onClick={() => setNotifFilter('all')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
              notifFilter === 'all'
                ? 'bg-[#13213c] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            همه اعلان‌ها ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setNotifFilter('unread')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
              notifFilter === 'unread'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            خوانده‌نشده ({unreadCount})
          </button>
          <button
            type="button"
            onClick={() => setNotifFilter('letter')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
              notifFilter === 'letter'
                ? 'bg-[#800000] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            نامه‌ها و سررسیدها
          </button>
          <button
            type="button"
            onClick={() => setNotifFilter('task')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
              notifFilter === 'task'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            وظایف و تسک‌ها
          </button>
          <button
            type="button"
            onClick={() => setNotifFilter('crm')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
              notifFilter === 'crm'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            پیگیری‌های CRM
          </button>
        </div>

        {/* لیست تاریخچه اعلان‌ها */}
        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
          {filteredNotifications.length === 0 ? (
            <div className="py-10 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <div className="text-xs font-bold text-slate-600">اعلانی در این دسته‌بندی یافت نشد.</div>
              <p className="text-[11px] text-slate-400 mt-1">
                کلیه اعلان‌های صادره سیستم به‌صورت خودکار در این پنل ذخیره می‌شوند تا بتوانید آنها را مرور فرمایید.
              </p>
            </div>
          ) : (
            filteredNotifications.slice(0, 10).map(item => {
              const isTask = item.type === 'task';
              const isLetter = item.type === 'letter';
              const isCrm = item.type === 'crm';
              const isFinance = item.type === 'finance';

              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    item.isRead
                      ? 'bg-white hover:bg-slate-50 border-slate-200/90'
                      : 'bg-amber-50/40 hover:bg-amber-50/70 border-amber-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isTask
                          ? 'bg-indigo-100 text-indigo-700'
                          : isLetter
                          ? 'bg-rose-100 text-[#800000]'
                          : isCrm
                          ? 'bg-amber-100 text-amber-800'
                          : isFinance
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isTask ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : isLetter ? (
                        <Mail className="w-4 h-4" />
                      ) : isCrm ? (
                        <PhoneCall className="w-4 h-4" />
                      ) : isFinance ? (
                        <DollarSign className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className={`text-xs ${item.isRead ? 'text-slate-800' : 'text-slate-900 font-black'}`}>
                          {item.title}
                        </strong>
                        {item.priority === 'urgent' && (
                          <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded">
                            اقدام فوری
                          </span>
                        )}
                        {!item.isRead && (
                          <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" title="خوانده نشده" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                        {item.body}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{item.timestamp}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {item.actionView && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationClick(item);
                          }}
                          className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          <span>{item.actionTitle || 'اقدام'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleDeleteNotif(e, item.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                        title="حذف از تاریخچه"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Content Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Received Letters */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-[#13213c] flex items-center gap-2">
              <MailCheck className="w-4 h-4 text-amber-600" />
              <span>آخرین مکاتبات دریافتی و ابلاغیه‌ها</span>
            </h3>
            <button
              onClick={() => onNavigate('letters-inbox')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              مشاهده کارتابل کامل
            </button>
          </div>

          <div className="space-y-3">
            {effectiveReceivedLetters.slice(0, 4).map(letter => (
              <div
                key={letter.id}
                onClick={() => onNavigate('letters-inbox')}
                className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{letter.senderOrg}</span>
                  <span className="text-[10px] text-slate-400">{letter.issueDate}</span>
                </div>
                <div className="text-xs text-slate-600 mt-1 font-medium truncate">{letter.subject}</div>
                <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">{letter.unit}</span>
                  <span>کارشناس: {letter.expertName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Due Today Leads */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-[#13213c] flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-rose-600" />
              <span>پیگیری‌های موعد امروز (CRM)</span>
            </h3>
            <button
              onClick={() => onNavigate('crm-due-today')}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
            >
              مشاهده همه ({effectiveTodayDueLeads.length})
            </button>
          </div>

          {effectiveTodayDueLeads.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              هیچ پیگیری معوقه‌ای برای امروز ثبت نشده است. تمام موارد به‌روز هستند.
            </div>
          ) : (
            <div className="space-y-3">
              {effectiveTodayDueLeads.slice(0, 4).map(lead => (
                <div
                  key={lead.id}
                  onClick={() => onNavigate('crm-due-today')}
                  className="p-3 rounded-lg border border-rose-100 bg-rose-50/30 hover:bg-rose-50/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">پرونده {lead.urbanCode} - {lead.ownerName}</span>
                    <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">
                      ساعت {lead.nextFollowUpTime || '۱۱:۰۰'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 truncate">{lead.address}</div>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                    <span>نماینده: {lead.lawyerName} ({lead.lawyerPhone})</span>
                    <span className="font-semibold text-rose-600">اقدام فوری</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick shortcuts banner */}
      <div className="bg-gradient-to-r from-[#13213c] to-[#1e3a6a] p-6 rounded-xl text-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-extrabold text-white">دسترسی‌های سریع روزانه</h4>
          <p className="text-xs text-slate-300 mt-1">
            صدور نامه رسمی بر اساس سربرگ رابو، ثبت پرونده شهرسازی جدید، یا ثبت تردد پرسنل
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('dashboard-reporting')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black px-4 py-2 rounded-lg text-xs transition-all shadow-md cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>گزارش‌های مدیریتی (BI & PDF)</span>
          </button>
          <button
            onClick={() => onNavigate('letters-outbox-create')}
            className="flex items-center gap-1.5 bg-[#800000] hover:bg-[#9a0000] text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>ایجاد نامه ارسالی جدید</span>
          </button>
          <button
            onClick={() => onNavigate('hr-attendance')}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>تقویم تردد و مأموریت</span>
          </button>
        </div>
      </div>
    </div>
  );
};
