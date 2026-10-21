import React, { useState, useMemo } from 'react';
import { AttendanceRecord, Project, Employee, LeaveMissionRequest } from '../types';
import {
  Activity,
  Filter,
  ArrowUpRight,
  UserCheck,
  Clock,
  Briefcase,
  PieChart as PieChartIcon,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { toEn, toFa, getTodayShamsi } from '../utils/jalali';

export interface DashboardAnalyticsChartProps {
  currentUser?: Employee;
  attendanceRecords: AttendanceRecord[];
  leaveMissionRequests?: LeaveMissionRequest[];
  personnelList?: Employee[];
  projectsList?: Project[];
  todayStr?: string;
  onNavigate: (view: string) => void;
}

// Custom RTL Persian Tooltip for Recharts
const AnalyticsCustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const title = label || payload[0]?.name || 'جزئیات آماری';
    return (
      <div
        dir="rtl"
        className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700/80 text-xs backdrop-blur-md min-w-44 z-50 pointer-events-none"
      >
        <div className="font-black text-slate-200 border-b border-slate-700/80 pb-1.5 mb-2 flex items-center justify-between gap-3">
          <span>{title}</span>
          <span className="text-[10px] text-emerald-400 font-mono">زنده</span>
        </div>
        <div className="space-y-1.5">
          {payload.map((item: any, idx: number) => {
            const unit = item.payload?.unit || item.unit || '';
            return (
              <div key={idx} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{
                      backgroundColor:
                        item.color || item.payload?.color || item.fill || '#10b981'
                    }}
                  />
                  <span>{item.name}:</span>
                </span>
                <span className="font-mono font-black text-white tabular-nums">
                  {typeof item.value === 'number'
                    ? item.value.toLocaleString('fa-IR')
                    : toFa(String(item.value))}
                  {unit ? ` ${unit}` : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export const DashboardAnalyticsChart: React.FC<DashboardAnalyticsChartProps> = ({
  currentUser,
  attendanceRecords = [],
  leaveMissionRequests = [],
  personnelList = [],
  projectsList = [],
  todayStr,
  onNavigate
}) => {
  const isManager = currentUser?.isManager ?? true;

  // Interactive Controls State
  const [attendanceScope, setAttendanceScope] = useState<'today' | 'month'>('today');
  const [attendanceChartType, setAttendanceChartType] = useState<'pie' | 'bar'>('pie');
  const [leaveChartType, setLeaveChartType] = useState<'bar' | 'pie'>('bar');
  const [projectChartType, setProjectChartType] = useState<'bar' | 'pie'>('bar');
  const [projectScopeFilter, setProjectScopeFilter] = useState<'active' | 'all'>('active');
  const [unitFilter, setUnitFilter] = useState<string>('all');

  const currentShamsi = getTodayShamsi();
  const currentY = parseInt(toEn(currentShamsi.year), 10) || 1404;
  const currentM = parseInt(toEn(currentShamsi.month), 10) || 7;

  const todayShamsiDateStr = useMemo(() => {
    if (todayStr) return todayStr;
    return `${currentShamsi.year}/${currentShamsi.month}/${currentShamsi.day}`;
  }, [todayStr, currentShamsi]);

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

  // RBAC Filtered Datasets
  const effectiveAttendanceRecords = useMemo(() => {
    if (isManager || !currentUser) return attendanceRecords;
    return attendanceRecords.filter(
      r =>
        r.employeeId === currentUser.id ||
        r.employeeName === currentUser.name ||
        r.managerId === currentUser.id
    );
  }, [attendanceRecords, isManager, currentUser]);

  const effectiveLeaveMissionRequests = useMemo(() => {
    if (isManager || !currentUser) return leaveMissionRequests;
    return leaveMissionRequests.filter(
      r =>
        r.employeeId === currentUser.id ||
        r.employeeName === currentUser.name ||
        r.managerId === currentUser.id ||
        r.substituteEmployeeId === currentUser.id
    );
  }, [leaveMissionRequests, isManager, currentUser]);

  const effectiveProjects = useMemo(() => {
    if (isManager || !currentUser) return projectsList;
    return projectsList.filter(
      p =>
        (p.teamMembers && p.teamMembers.includes(currentUser.name)) ||
        p.projectManagerId === currentUser.id ||
        p.projectManagerName === currentUser.name
    );
  }, [projectsList, isManager, currentUser]);

  // ---------------------------------------------------------------------------
  // 1. DAILY ATTENDANCE ANALYTICS (Pie & Bar Data)
  // ---------------------------------------------------------------------------
  const attendanceStatusPieData = useMemo(() => {
    const normalizedToday = toEn(todayShamsiDateStr).trim();
    const targetRecords =
      attendanceScope === 'today'
        ? effectiveAttendanceRecords.filter(r => toEn(r.date).trim() === normalizedToday)
        : effectiveAttendanceRecords.filter(r => {
            const ym = parseJalaliYearMonth(r.date);
            return ym && ym.year === currentY && ym.month === currentM;
          });

    const activeRecords =
      attendanceScope === 'today' && targetRecords.length === 0
        ? effectiveAttendanceRecords.slice(0, Math.max(personnelList.length, 5))
        : targetRecords;

    let presentCount = 0;
    let missionCount = 0;
    let leaveCount = 0;
    let overtimeRecordsCount = 0;

    activeRecords.forEach(rec => {
      const t = rec.type || '';
      if (t.includes('مرخصی')) {
        leaveCount += 1;
      } else if (t.includes('مأموریت') || t.includes('ماموریت') || t.includes('جلسه')) {
        missionCount += 1;
      } else {
        presentCount += 1;
      }
      if ((rec.overtimeHours || 0) > 0) {
        overtimeRecordsCount += 1;
      }
    });

    if (attendanceScope === 'today') {
      effectiveLeaveMissionRequests.forEach(req => {
        const startEn = toEn(req.startDate || '').trim();
        const endEn = toEn(req.endDate || req.startDate || '').trim();
        if (normalizedToday >= startEn && normalizedToday <= endEn) {
          if (req.category === 'leave' || req.type.includes('مرخصی')) {
            leaveCount += 1;
          } else {
            missionCount += 1;
          }
        }
      });
    }

    const totalStaff = isManager
      ? Math.max(personnelList.length, presentCount + missionCount + leaveCount, 1)
      : 1;
    const unrecordedCount =
      attendanceScope === 'today'
        ? Math.max(0, totalStaff - (presentCount + missionCount + leaveCount))
        : overtimeRecordsCount;

    return [
      { name: 'حاضر در شرکت', value: presentCount, color: '#059669', unit: 'نفر/روز' },
      { name: 'مأموریت و جلسات', value: missionCount, color: '#0284c7', unit: 'مورد' },
      { name: 'مرخصی (روزانه/ساعتی)', value: leaveCount, color: '#d97706', unit: 'مورد' },
      {
        name: attendanceScope === 'today' ? 'ثبت‌نشده / دورکاری' : 'دارای اضافه‌کاری',
        value: unrecordedCount,
        color: attendanceScope === 'today' ? '#94a3b8' : '#7c3aed',
        unit: 'مورد'
      }
    ].filter(item => item.value > 0 || item.name === 'حاضر در شرکت');
  }, [
    effectiveAttendanceRecords,
    effectiveLeaveMissionRequests,
    attendanceScope,
    todayShamsiDateStr,
    currentY,
    currentM,
    personnelList.length,
    isManager
  ]);

  const attendanceEmployeeBarData = useMemo(() => {
    const map = new Map<string, { name: string; hours: number; overtime: number }>();
    const recent = effectiveAttendanceRecords.slice(0, 14);
    recent.forEach(r => {
      const shortName = r.employeeName ? r.employeeName.split(' ').slice(-1)[0] : 'پرسنل';
      const existing = map.get(r.employeeName) || { name: shortName, hours: 0, overtime: 0 };
      existing.hours += Number(r.hoursWorked || 0);
      existing.overtime += Number(r.overtimeHours || 0);
      map.set(r.employeeName, existing);
    });
    return Array.from(map.values())
      .slice(0, 6)
      .map(item => ({
        name: item.name,
        'ساعت کارکرد': Math.round(item.hours * 10) / 10,
        'اضافه‌کاری': Math.round(item.overtime * 10) / 10,
        unit: 'ساعت'
      }));
  }, [effectiveAttendanceRecords]);

  // ---------------------------------------------------------------------------
  // 2. PENDING LEAVE & MISSION REQUESTS ANALYTICS (Bar & Pie Data)
  // ---------------------------------------------------------------------------
  const combinedLeaveAndMissionItems = useMemo(() => {
    const seenIds = new Set<string>();
    const unified: {
      id: string;
      employeeName: string;
      type: string;
      category: 'leave' | 'mission';
      dateLabel: string;
      approvalStatus: 'pending' | 'approved' | 'rejected';
    }[] = [];

    effectiveLeaveMissionRequests.forEach(req => {
      seenIds.add(req.id);
      unified.push({
        id: req.id,
        employeeName: req.employeeName,
        type: req.type,
        category: req.category,
        dateLabel:
          req.startDate === req.endDate ? req.startDate : `${req.startDate} تا ${req.endDate}`,
        approvalStatus: req.approvalStatus
      });
    });

    effectiveAttendanceRecords.forEach(rec => {
      if (seenIds.has(rec.id)) return;
      const isLeave = rec.type?.includes('مرخصی');
      const isMission =
        rec.type?.includes('مأموریت') ||
        rec.type?.includes('ماموریت') ||
        rec.type?.includes('جلسه');
      if (isLeave || isMission || rec.approvalStatus === 'pending') {
        unified.push({
          id: rec.id,
          employeeName: rec.employeeName,
          type: rec.type || 'تردد/مرخصی',
          category: isLeave ? 'leave' : 'mission',
          dateLabel: rec.date,
          approvalStatus: rec.approvalStatus || 'approved'
        });
      }
    });

    return unified;
  }, [effectiveLeaveMissionRequests, effectiveAttendanceRecords]);

  const pendingLeaveCount = useMemo(() => {
    return combinedLeaveAndMissionItems.filter(i => i.approvalStatus === 'pending').length;
  }, [combinedLeaveAndMissionItems]);

  const leaveRequestsBarData = useMemo(() => {
    const categories = [
      { key: 'مرخصی استحقاقی', label: 'استحقاقی' },
      { key: 'مرخصی ساعتی', label: 'ساعتی' },
      { key: 'مرخصی استعلاجی', label: 'استعلاجی' },
      { key: 'مأموریت', label: 'مأموریت' }
    ];
    return categories.map(cat => {
      const matching = combinedLeaveAndMissionItems.filter(i =>
        cat.key === 'مأموریت'
          ? i.category === 'mission' ||
            i.type.includes('مأموریت') ||
            i.type.includes('ماموریت')
          : i.type.includes(cat.label)
      );
      return {
        name: cat.label,
        'در انتظار تایید': matching.filter(m => m.approvalStatus === 'pending').length,
        'تایید شده': matching.filter(m => m.approvalStatus === 'approved').length,
        unit: 'درخواست'
      };
    });
  }, [combinedLeaveAndMissionItems]);

  const leaveRequestsPieData = useMemo(() => {
    const pendingCount = combinedLeaveAndMissionItems.filter(
      i => i.approvalStatus === 'pending'
    ).length;
    const approvedCount = combinedLeaveAndMissionItems.filter(
      i => i.approvalStatus === 'approved'
    ).length;
    const rejectedCount = combinedLeaveAndMissionItems.filter(
      i => i.approvalStatus === 'rejected'
    ).length;

    const list = [
      { name: 'در انتظار تایید', value: pendingCount, color: '#e11d48', unit: 'درخواست' },
      { name: 'تایید شده', value: approvedCount, color: '#059669', unit: 'درخواست' },
      { name: 'رد شده', value: rejectedCount, color: '#64748b', unit: 'درخواست' }
    ].filter(item => item.value > 0);

    return list.length > 0
      ? list
      : [{ name: 'بدون درخواست باز', value: 1, color: '#cbd5e1', unit: 'مورد' }];
  }, [combinedLeaveAndMissionItems]);

  // ---------------------------------------------------------------------------
  // 3. ACTIVE PROJECTS PROGRESS ANALYTICS (Bar & Pie Data)
  // ---------------------------------------------------------------------------
  const unitFilteredProjects = useMemo(() => {
    return effectiveProjects.filter(p => {
      if (unitFilter === 'all') return true;
      return p.unit === unitFilter;
    });
  }, [effectiveProjects, unitFilter]);

  const projectsProgressBarData = useMemo(() => {
    const scoped =
      projectScopeFilter === 'active'
        ? unitFilteredProjects.filter(p => !p.isCompleted && (p.progress || 0) < 100)
        : unitFilteredProjects;

    const sourceList = scoped.length > 0 ? scoped : unitFilteredProjects;

    return [...sourceList]
      .sort((a, b) => (b.progress || 0) - (a.progress || 0))
      .slice(0, 7)
      .map(p => {
        const prog = Math.min(100, Math.max(0, Number(p.progress || 0)));
        const shortTitle = p.name.length > 22 ? `${p.name.slice(0, 22)}…` : p.name;
        return {
          id: p.id,
          name: shortTitle,
          fullName: p.name,
          unitName: p.unit,
          'درصد پیشرفت': prog,
          unit: '٪',
          color: prog >= 75 ? '#059669' : prog >= 45 ? '#0284c7' : '#d97706'
        };
      });
  }, [unitFilteredProjects, projectScopeFilter]);

  const projectsProgressPieData = useMemo(() => {
    const high = unitFilteredProjects.filter(p => (p.progress || 0) >= 75).length;
    const mid = unitFilteredProjects.filter(
      p => (p.progress || 0) >= 40 && (p.progress || 0) < 75
    ).length;
    const low = unitFilteredProjects.filter(p => (p.progress || 0) < 40).length;

    const list = [
      { name: 'پیشرفت بالا (۷۵٪ تا ۱۰۰٪)', value: high, color: '#059669', unit: 'پروژه' },
      { name: 'در میانه اجرا (۴۰٪ تا ۷۴٪)', value: mid, color: '#0284c7', unit: 'پروژه' },
      { name: 'مراحل آغازین (زیر ۴۰٪)', value: low, color: '#d97706', unit: 'پروژه' }
    ].filter(item => item.value > 0);

    return list.length > 0
      ? list
      : [{ name: 'بدون پروژه ثبت‌شده', value: 1, color: '#cbd5e1', unit: 'پروژه' }];
  }, [unitFilteredProjects]);

  const activeOngoingProjectsCount = useMemo(() => {
    return unitFilteredProjects.filter(p => !p.isCompleted && (p.progress || 0) < 100).length;
  }, [unitFilteredProjects]);

  const overallAvgProgress = useMemo(() => {
    if (unitFilteredProjects.length === 0) return 0;
    const sum = unitFilteredProjects.reduce((acc, p) => acc + (p.progress || 0), 0);
    return Math.round(sum / unitFilteredProjects.length);
  }, [unitFilteredProjects]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-xs space-y-5">
      {/* Header & Global Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#13213c] to-[#1e3a6a] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-black text-[#13213c]">
                نبض لحظه‌ای منابع انسانی و پیشرفت پروژه‌های جاری (Live Operations Analytics)
              </h3>
              <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>بروزرسانی زنده · {toFa(todayShamsiDateStr)}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              نمودارهای میله‌ای و دایره‌ای تعاملی وضعیت حضور و غیاب روزانه، کارتابل مرخصی‌های در انتظار تایید و درصد پیشرفت پروژه‌های جاری
            </p>
          </div>
        </div>

        {/* Interactive Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
            <select
              value={unitFilter}
              onChange={e => setUnitFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">همه واحدهای مهندسی</option>
              <option value="مهندسی حریق">مهندسی حریق</option>
              <option value="انرژی">بهینه‌سازی انرژی</option>
              <option value="سیستم مدیریت">سیستم‌های مدیریت</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setAttendanceScope('today')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                attendanceScope === 'today'
                  ? 'bg-[#13213c] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              وضعیت امروز
            </button>
            <button
              type="button"
              onClick={() => setAttendanceScope('month')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                attendanceScope === 'month'
                  ? 'bg-[#13213c] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              تجمیعی ماه جاری
            </button>
          </div>
        </div>
      </div>

      {/* Live Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div
          onClick={() => onNavigate('hr-attendance')}
          className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/80 flex items-center justify-between cursor-pointer hover:bg-emerald-50 transition-colors"
        >
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-slate-600">حاضرین و مأموریت‌های ثبت‌شده</span>
            <div className="text-lg font-black text-emerald-800 tabular-nums">
              {toFa(
                attendanceStatusPieData
                  .filter(d => d.name === 'حاضر در شرکت' || d.name === 'مأموریت و جلسات')
                  .reduce((acc, c) => acc + c.value, 0)
              )}{' '}
              <span className="text-xs font-normal text-slate-500">
                از {toFa(personnelList.length || 4)} پرسنل فعال
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('hr-attendance')}
          className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80 flex items-center justify-between cursor-pointer hover:bg-amber-50 transition-colors"
        >
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-slate-600">
              درخواست‌های مرخصی و مأموریت در انتظار تایید
            </span>
            <div className="text-lg font-black text-amber-800 tabular-nums flex items-center gap-2">
              <span>{toFa(pendingLeaveCount)} درخواست</span>
              {pendingLeaveCount > 0 && (
                <span className="text-[10px] font-bold text-rose-700">· نیازمند بررسی مدیر</span>
              )}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('projects')}
          className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/80 flex items-center justify-between cursor-pointer hover:bg-blue-50 transition-colors"
        >
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-slate-600">پروژه‌های جاری در حال اجرا</span>
            <div className="text-lg font-black text-[#13213c] tabular-nums">
              {toFa(activeOngoingProjectsCount)} پروژه{' '}
              <span className="text-xs font-normal text-slate-500">
                · میانگین پیشرفت {toFa(overallAvgProgress)}٪
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#13213c] flex items-center justify-center">
            <Briefcase className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3-Column Interactive Recharts Grid (Pie + Bar Support on Every Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column 1: Daily Attendance Status (Pie / Bar) */}
        <div className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <h4 className="text-xs font-black text-slate-800">وضعیت حضور و غیاب روزانه</h4>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => setAttendanceChartType('pie')}
                  className={`px-2 py-1 rounded-md font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                    attendanceChartType === 'pie'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <PieChartIcon className="w-3 h-3" />
                  <span>دایره‌ای</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceChartType('bar')}
                  className={`px-2 py-1 rounded-md font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                    attendanceChartType === 'bar'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>میله‌ای</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              {attendanceChartType === 'pie'
                ? 'نمودار دایره‌ای توزیع حضور، مأموریت و مرخصی پرسنل شرکت'
                : 'نمودار میله‌ای ساعات کارکرد عادی و اضافه‌کاری ثبت‌شده پرسنل'}
            </p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {attendanceChartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={attendanceStatusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                    >
                      {attendanceStatusPieData.map((entry, index) => (
                        <Cell key={`att-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<AnalyticsCustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '8px' }}
                    />
                  </PieChart>
                ) : (
                  <BarChart
                    data={attendanceEmployeeBarData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<AnalyticsCustomTooltip />} />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '6px' }}
                    />
                    <Bar
                      dataKey="ساعت کارکرد"
                      fill="#059669"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={22}
                    />
                    <Bar
                      dataKey="اضافه‌کاری"
                      fill="#0284c7"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={22}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>کل رکوردهای تردد: {toFa(effectiveAttendanceRecords.length)}</span>
            <button
              type="button"
              onClick={() => onNavigate('hr-attendance')}
              className="font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
            >
              <span>تقویم حضور و غیاب</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Column 2: Pending Leave & Mission Requests (Bar / Pie) */}
        <div className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h4 className="text-xs font-black text-slate-800">
                  آمار درخواست‌های مرخصی در انتظار تایید
                </h4>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => setLeaveChartType('bar')}
                  className={`px-2 py-1 rounded-md font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                    leaveChartType === 'bar'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>میله‌ای</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveChartType('pie')}
                  className={`px-2 py-1 rounded-md font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                    leaveChartType === 'pie'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <PieChartIcon className="w-3 h-3" />
                  <span>دایره‌ای</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              {toFa(pendingLeaveCount)} درخواست در انتظار بررسی مدیریت · تفکیک لحظه‌ای کارتابل مرخصی‌ها
            </p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {leaveChartType === 'bar' ? (
                  <BarChart
                    data={leaveRequestsBarData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<AnalyticsCustomTooltip />} />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '6px' }}
                    />
                    <Bar
                      dataKey="در انتظار تایید"
                      fill="#e11d48"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                    />
                    <Bar
                      dataKey="تایید شده"
                      fill="#059669"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                    />
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={leaveRequestsPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                    >
                      {leaveRequestsPieData.map((entry, idx) => (
                        <Cell key={`leave-pie-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<AnalyticsCustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '8px' }}
                    />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              در انتظار تایید:{' '}
              <strong className="text-rose-600">{toFa(pendingLeaveCount)} مورد</strong>
            </span>
            <button
              type="button"
              onClick={() => onNavigate('hr-attendance')}
              className="font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
            >
              <span>بررسی و تایید مرخصی‌ها</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Column 3: Active Projects Progress % (Bar / Pie) */}
        <div className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#13213c]" />
                <h4 className="text-xs font-black text-slate-800">درصد پیشرفت پروژه‌های جاری</h4>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg text-[10px]">
                  <button
                    type="button"
                    onClick={() => setProjectScopeFilter('active')}
                    className={`px-1.5 py-1 rounded-md font-bold cursor-pointer transition-colors ${
                      projectScopeFilter === 'active'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    جاری
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectScopeFilter('all')}
                    className={`px-1.5 py-1 rounded-md font-bold cursor-pointer transition-colors ${
                      projectScopeFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    همه
                  </button>
                </div>

                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg text-[10px]">
                  <button
                    type="button"
                    onClick={() => setProjectChartType('bar')}
                    className={`px-1.5 py-1 rounded-md font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                      projectChartType === 'bar'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="نمودار میله‌ای پیشرفت پروژه‌ها"
                  >
                    <BarChart3 className="w-3 h-3" />
                    <span>میله‌ای</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectChartType('pie')}
                    className={`px-1.5 py-1 rounded-md font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                      projectChartType === 'pie'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="نمودار دایره‌ای دسته‌بندی پیشرفت"
                  >
                    <PieChartIcon className="w-3 h-3" />
                    <span>دایره‌ای</span>
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              {projectChartType === 'bar'
                ? 'نمودار میله‌ای درصد پیشرفت فیزیکی هر پروژه به صورت لحظه‌ای'
                : 'نمودار دایره‌ای تفکیک پروژه‌ها بر اساس بازه درصد پیشرفت'}
            </p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {projectChartType === 'bar' ? (
                  <BarChart
                    data={projectsProgressBarData}
                    layout="vertical"
                    margin={{ top: 5, right: 15, left: 5, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                      unit="٪"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={95}
                      tick={{ fontSize: 10, fill: '#334155', fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<AnalyticsCustomTooltip />} />
                    <Bar dataKey="درصد پیشرفت" radius={[0, 4, 4, 0]} maxBarSize={18}>
                      {projectsProgressBarData.map((entry, idx) => (
                        <Cell key={`proj-cell-${idx}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={projectsProgressPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                    >
                      {projectsProgressPieData.map((entry, idx) => (
                        <Cell key={`proj-pie-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<AnalyticsCustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '8px' }}
                    />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              میانگین پیشرفت کل:{' '}
              <strong className="text-emerald-700">{toFa(overallAvgProgress)}٪</strong>
            </span>
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="font-bold text-[#13213c] hover:text-blue-900 flex items-center gap-1 cursor-pointer"
            >
              <span>کارتابل پروژه‌ها</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DashboardAnalyticsChart;
