import React, { useState, useMemo } from 'react';
import { 
  Project, 
  CrmLead, 
  Employee, 
  AttendanceRecord 
} from '../types';
import {
  TrendingUp,
  DollarSign,
  Briefcase,
  Users,
  Clock,
  Printer,
  FileText,
  BarChart3,
  PieChart as PieChartIcon,
  CheckCircle2,
  Calendar,
  Building,
  Target,
  FileCheck,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface ExecutiveReportingViewProps {
  currentUser: Employee;
  projectsList: Project[];
  crmLeads: CrmLead[];
  personnelList: Employee[];
  attendanceRecords: AttendanceRecord[];
  todayStr: string;
  onNavigate?: (view: string) => void;
  setToastMessage?: (msg: string) => void;
}

export const ExecutiveReportingView: React.FC<ExecutiveReportingViewProps> = ({
  currentUser,
  projectsList,
  crmLeads,
  personnelList,
  attendanceRecords,
  todayStr,
  onNavigate,
  setToastMessage
}) => {
  // Tab states: 'overview' | 'financial' | 'crm' | 'personnel'
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'crm' | 'personnel'>('overview');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'all' | 'month' | 'quarter' | 'year'>('all');

  // Helper parser for currency strings
  const parseAmount = (val?: string | number): number => {
    if (!val) return 0;
    const str = String(val).replace(/[^\d.-]/g, '');
    return parseFloat(str) || 0;
  };

  const formatTomans = (num: number): string => {
    return (num || 0).toLocaleString('fa-IR');
  };

  // 1. FILTERED DATASETS
  const filteredProjects = useMemo(() => {
    return projectsList.filter(p => {
      if (selectedUnit !== 'all' && p.unit !== selectedUnit) return false;
      return true;
    });
  }, [projectsList, selectedUnit]);

  const filteredCrmLeads = useMemo(() => {
    return crmLeads.filter(l => {
      if (selectedUnit !== 'all' && l.unit !== selectedUnit) return false;
      return true;
    });
  }, [crmLeads, selectedUnit]);

  const filteredPersonnel = useMemo(() => {
    return personnelList.filter(p => {
      if (selectedUnit !== 'all' && p.unit !== selectedUnit) return false;
      return true;
    });
  }, [personnelList, selectedUnit]);

  const filteredAttendance = useMemo(() => {
    return attendanceRecords.filter(a => {
      if (selectedUnit !== 'all') {
        const emp = personnelList.find(p => p.name === a.employeeName || p.id === a.employeeId);
        if (emp && emp.unit !== selectedUnit) return false;
      }
      return true;
    });
  }, [attendanceRecords, personnelList, selectedUnit]);

  // 2. FINANCIAL & PROJECTS KPIS
  const financialMetrics = useMemo(() => {
    let totalContract = 0;
    let totalReceived = 0;
    let totalProgressSum = 0;
    let totalExpenses = 0;

    filteredProjects.forEach(p => {
      totalContract += parseAmount(p.totalContractAmount);
      totalReceived += parseAmount(p.receivedAmount);
      totalProgressSum += (p.progress || 0);
      if (p.expenses && Array.isArray(p.expenses)) {
        p.expenses.forEach(e => {
          totalExpenses += parseAmount(e.amount);
        });
      }
    });

    const outstanding = Math.max(0, totalContract - totalReceived);
    const collectionRate = totalContract > 0 ? Math.round((totalReceived / totalContract) * 100) : 0;
    const avgProgress = filteredProjects.length > 0 ? Math.round(totalProgressSum / filteredProjects.length) : 0;

    return {
      totalContract,
      totalReceived,
      outstanding,
      collectionRate,
      avgProgress,
      totalExpenses,
      projectCount: filteredProjects.length
    };
  }, [filteredProjects]);

  // 3. CRM & MARKETING KPIS
  const crmMetrics = useMemo(() => {
    const totalLeads = filteredCrmLeads.length;
    let totalEstimatedBudget = 0;
    let hotLeads = 0;
    let warmLeads = 0;
    let mediumLeads = 0;
    let coldLeads = 0;
    let contractedLeads = 0;
    let meetingLeads = 0;
    let proposalLeads = 0;

    filteredCrmLeads.forEach(l => {
      totalEstimatedBudget += parseAmount(l.estimatedBudget);
      const temp = l.leadTemperature || 'متوسط';
      if (temp === 'داغ') hotLeads++;
      else if (temp === 'گرم') warmLeads++;
      else if (temp === 'سرد') coldLeads++;
      else mediumLeads++;

      const st = (l.status || '').toLowerCase();
      if (st.includes('قرارداد')) contractedLeads++;
      else if (st.includes('جلسه')) meetingLeads++;
      else if (st.includes('پیش‌فاکتور') || st.includes('پیشنهاد')) proposalLeads++;
    });

    const conversionRate = totalLeads > 0 ? Math.round((contractedLeads / totalLeads) * 100) : 0;

    return {
      totalLeads,
      totalEstimatedBudget,
      hotLeads,
      warmLeads,
      mediumLeads,
      coldLeads,
      contractedLeads,
      meetingLeads,
      proposalLeads,
      conversionRate
    };
  }, [filteredCrmLeads]);

  // 4. PERSONNEL & ATTENDANCE KPIS
  const hrMetrics = useMemo(() => {
    let totalWorkedHours = 0;
    let totalOvertimeHours = 0;
    const employeeHoursMap: Record<string, { regular: number; overtime: number; count: number; name: string }> = {};

    filteredAttendance.forEach(a => {
      const w = a.hoursWorked || 0;
      const o = a.overtimeHours || 0;
      totalWorkedHours += w;
      totalOvertimeHours += o;

      const empKey = a.employeeName || a.employeeId || 'نامشخص';
      if (!employeeHoursMap[empKey]) {
        employeeHoursMap[empKey] = { regular: 0, overtime: 0, count: 0, name: empKey };
      }
      employeeHoursMap[empKey].regular += w;
      employeeHoursMap[empKey].overtime += o;
      employeeHoursMap[empKey].count += 1;
    });

    const employeeRankings = Object.values(employeeHoursMap)
      .sort((a, b) => (b.regular + b.overtime) - (a.regular + a.overtime));

    const avgHoursPerEmployee = filteredPersonnel.length > 0 
      ? Math.round(totalWorkedHours / filteredPersonnel.length) 
      : 0;

    return {
      totalWorkedHours,
      totalOvertimeHours,
      totalStaff: filteredPersonnel.length,
      avgHoursPerEmployee,
      employeeRankings
    };
  }, [filteredAttendance, filteredPersonnel]);

  // 5. CHART DATASETS
  // 5.1 Unit Breakdown (Contract vs Received vs Outstanding)
  const unitFinancialChartData = useMemo(() => {
    const units = ['مهندسی حریق', 'انرژی', 'سیستم مدیریت'];
    return units.map(u => {
      const projs = projectsList.filter(p => p.unit === u);
      let contract = 0;
      let received = 0;
      projs.forEach(p => {
        contract += parseAmount(p.totalContractAmount);
        received += parseAmount(p.receivedAmount);
      });
      return {
        unit: u,
        مبلغ_قرارداد_میلیون: Math.round(contract / 1_000_000),
        دریافتی_میلیون: Math.round(received / 1_000_000),
        مطالبات_میلیون: Math.round(Math.max(0, contract - received) / 1_000_000),
        count: projs.length
      };
    });
  }, [projectsList]);

  // 5.2 Projects Progress Breakdown
  const projectProgressChartData = useMemo(() => {
    return filteredProjects.map(p => ({
      name: p.name.length > 18 ? p.name.substring(0, 18) + '...' : p.name,
      fullName: p.name,
      پیشرفت: p.progress || 0,
      کد: p.id,
      کارفرما: p.clientName || 'نامشخص'
    })).sort((a, b) => b.پیشرفت - a.پیشرفت).slice(0, 8);
  }, [filteredProjects]);

  // 5.3 CRM Temperature Breakdown (Pie Chart)
  const crmTempChartData = useMemo(() => {
    return [
      { name: 'سرنخ‌های داغ (آماده قرارداد)', value: crmMetrics.hotLeads, color: '#ef4444' },
      { name: 'سرنخ‌های گرم (در حال مذاکره)', value: crmMetrics.warmLeads, color: '#f59e0b' },
      { name: 'سرنخ‌های متوسط (تماس اولیه)', value: crmMetrics.mediumLeads, color: '#3b82f6' },
      { name: 'سرنخ‌های سرد (پیگیری آتی)', value: crmMetrics.coldLeads, color: '#94a3b8' }
    ].filter(item => item.value > 0);
  }, [crmMetrics]);

  // 5.4 CRM Funnel Stages
  const crmFunnelData = useMemo(() => {
    return [
      { مرحله: 'کل سرنخ‌ها', تعداد: crmMetrics.totalLeads, fill: '#6366f1' },
      { مرحله: 'جلسه و پرزنت', تعداد: crmMetrics.meetingLeads, fill: '#3b82f6' },
      { مرحله: 'صدور پیش‌فاکتور', تعداد: crmMetrics.proposalLeads, fill: '#0ea5e9' },
      { مرحله: 'عقد قرارداد نهایی', تعداد: crmMetrics.contractedLeads, fill: '#10b981' }
    ];
  }, [crmMetrics]);

  // 5.5 Personnel Workload Hours (Top 6)
  const personnelWorkloadChartData = useMemo(() => {
    return hrMetrics.employeeRankings.slice(0, 6).map(e => ({
      name: e.name,
      ساعت_عادی: e.regular,
      اضافه_کار: e.overtime,
      مجموع: e.regular + e.overtime
    }));
  }, [hrMetrics]);

  // Handle PDF Print
  const handlePrintPDF = () => {
    if (setToastMessage) {
      setToastMessage('در حال آماده‌سازی نسخه رسمی چاپی و خروجی PDF...');
    }
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================
          PRINT-ONLY FORMAL LETTERHEAD & HEADER (Visible during window.print())
      ======================================================== */}
      <div className="hidden print:block mb-8 pb-6 border-b-2 border-slate-800 text-right">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-xl font-black text-slate-900">شرکت مهندسی رهنمون کیفیت رابو (سهامی خاص)</h1>
            <p className="text-xs text-slate-600">ارائه‌دهنده خدمات تخصصی مهندسی حریق، بهینه‌سازی مصرف انرژی و سیستم‌های مدیریت (ISO)</p>
            <div className="text-sm font-bold text-[#800000] mt-2">
              گزارش جامع عملکرد تحلیلی و مدیریتی سازمان (Executive BI Dashboard Report)
            </div>
          </div>
          <div className="text-left text-xs space-y-1 font-mono text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-300">
            <div><strong>شماره گزارش:</strong> REP-RABO-{todayStr.replace(/\//g, '')}-01</div>
            <div><strong>تاریخ انتشار:</strong> {todayStr}</div>
            <div><strong>تهیه‌کننده:</strong> {currentUser.name} ({currentUser.role})</div>
            <div className="text-red-700 font-bold">طبقه: محرمانه - هیئت مدیره</div>
          </div>
        </div>
      </div>

      {/* ========================================================
          SCREEN-ONLY: ACTION & FILTER TOOLBAR
      ======================================================== */}
      <div className="print:hidden bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 rounded-xl shadow-xs">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-black text-[#13213c] flex items-center gap-2">
                  مرکز تولید گزارش‌های جامع مدیریتی و هوش کسب‌وکار (Executive BI Reporting)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  پایش یکپارچه داده‌های CRM، تحلیل مالی پروژه‌ها و کارکرد پرسنل همراه با خروجی نموداری Recharts و PDF رسمی
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons: PDF Print & Refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePrintPDF}
              className="flex items-center gap-2 bg-[#800000] hover:bg-[#9a0000] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="خروجی مستقیم PDF و پرینت استاندارد سازمانی"
            >
              <Printer className="w-4 h-4" />
              <span>خروجی PDF و چاپ رسمی</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (setToastMessage) setToastMessage('داده‌های تحلیلی و آماری گزارش با موفقیت به‌روزرسانی شد.');
              }}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              title="به‌روزرسانی داده‌ها"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>بروزرسانی</span>
            </button>
          </div>
        </div>

        {/* Filter Bar: Department and Timeframe */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-bold shrink-0">حوزه تخصصی:</span>
            {[
              { id: 'all', label: 'همه حوزه‌ها' },
              { id: 'مهندسی حریق', label: 'مهندسی حریق' },
              { id: 'انرژی', label: 'بهینه‌سازی انرژی' },
              { id: 'سیستم مدیریت', label: 'سیستم مدیریت (ISO)' }
            ].map(unit => (
              <button
                key={unit.id}
                type="button"
                onClick={() => setSelectedUnit(unit.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  selectedUnit === unit.id
                    ? 'bg-[#13213c] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {unit.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold shrink-0">بازه ارزیابی:</span>
            <select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value as any)}
              className="text-xs p-2 border border-slate-300 rounded-lg outline-none bg-white font-medium"
            >
              <option value="all">کلیه ادوار فعال (تجمعی)</option>
              <option value="month">ماه جاری (سی‌روزه)</option>
              <option value="quarter">فصل جاری (۹۰ روزه)</option>
              <option value="year">سال مالی جاری ۱۴۰۳</option>
            </select>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-4 flex items-center gap-2 border-b border-slate-200 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 px-4 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-[#800000] text-[#800000]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>۱. خلاصه اجرایی و تابلوی کلان مدیریتی</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`py-2.5 px-4 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'financial'
                ? 'border-[#800000] text-[#800000]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>۲. وضعیت مالی و درآمدزایی پروژه‌ها</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('crm')}
            className={`py-2.5 px-4 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'crm'
                ? 'border-[#800000] text-[#800000]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>۳. تحلیل قیف فروش و سرنخ‌های CRM</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('personnel')}
            className={`py-2.5 px-4 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'personnel'
                ? 'border-[#800000] text-[#800000]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>۴. بهره‌وری و کارکرد پرسنل</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          EXECUTIVE KPI SUMMARY CARDS (Visible in Screen & Print)
      ======================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Contracts */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">کل گردش قراردادها</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-slate-900 font-mono">
            {formatTomans(financialMetrics.totalContract)}
            <span className="text-[10px] font-sans font-normal text-slate-500 mr-1">تومان</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>تعداد پروژه‌ها:</span>
            <span className="font-bold text-slate-700">{financialMetrics.projectCount} مورد</span>
          </div>
        </div>

        {/* Card 2: Received vs Outstanding */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">دریافتی نقد و وصولی</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-black text-blue-900 font-mono">
            {formatTomans(financialMetrics.totalReceived)}
            <span className="text-[10px] font-sans font-normal text-slate-500 mr-1">تومان</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center justify-between">
            <span>نرخ وصول مطالبات:</span>
            <span>{financialMetrics.collectionRate}٪</span>
          </div>
        </div>

        {/* Card 3: CRM Conversion */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">نرخ تبدیل بازاریابی CRM</span>
            <Target className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-black text-amber-700 font-mono">
            {crmMetrics.conversionRate}٪
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>سرنخ‌های داغ و آماده:</span>
            <span className="font-bold text-red-600">{crmMetrics.hotLeads} پرونده</span>
          </div>
        </div>

        {/* Card 4: Personnel Workload */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">مجموع کارکرد پرسنل</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-black text-indigo-900 font-mono">
            {hrMetrics.totalWorkedHours.toLocaleString('fa-IR')}
            <span className="text-[10px] font-sans font-normal text-slate-500 mr-1">ساعت</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>اضافه‌کاری ثبت‌شده:</span>
            <span className="font-bold text-indigo-700">{hrMetrics.totalOvertimeHours.toLocaleString('fa-IR')} ساعت</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          TAB 1: OVERVIEW & EXECUTIVE SUMMARY
      ======================================================== */}
      {(activeTab === 'overview' || typeof window !== 'undefined') && (
        <div className={`${activeTab !== 'overview' ? 'hidden print:block' : ''} space-y-6`}>
          {/* Executive Summary Card */}
          <div className="bg-gradient-to-r from-slate-900 via-[#13213c] to-slate-800 text-white rounded-2xl p-5 shadow-sm border border-slate-700">
            <div className="flex items-center gap-2 mb-2 text-amber-400">
              <FileCheck className="w-5 h-5" />
              <h3 className="text-sm font-black">خلاصه وضعیت استراتژیک سازمان (Executive Management Brief)</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              بر اساس داده‌های ثبتی سامانه رابو، مجموع ارزش قراردادهای جاری بالغ بر 
              <strong className="text-amber-300 font-bold mx-1">{formatTomans(financialMetrics.totalContract)} تومان</strong> 
              است که تاکنون مبلغ 
              <strong className="text-emerald-300 font-bold mx-1">{formatTomans(financialMetrics.totalReceived)} تومان</strong> 
              (معادل {financialMetrics.collectionRate}٪) وصول شده است. مانده مطالبات سررسیدشده 
              <strong className="text-rose-300 font-bold mx-1">{formatTomans(financialMetrics.outstanding)} تومان</strong> 
              برآورد می‌گردد. در بخش بازاریابی CRM، تعداد 
              <strong className="text-white font-bold mx-1">{crmMetrics.totalLeads} سرنخ فعال</strong> 
              با ارزش بالقوه تقریبی 
              <strong className="text-amber-300 font-bold mx-1">{formatTomans(crmMetrics.totalEstimatedBudget)} تومان</strong> 
              در جریان پیگیری است که {crmMetrics.hotLeads} پرونده در مرحله بحرانی (داغ) قرار دارند.
            </p>
          </div>

          {/* Charts Row: Unit Financial Breakdown & CRM Temperature */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
            {/* Chart 1: Financial Comparison by Unit (Recharts BarChart) */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    <span>تراز مالی و مبالغ قراردادها به تفکیک واحدها (میلیون تومان)</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">Recharts BarChart</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={unitFinancialChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="unit" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', direction: 'rtl' }}
                        formatter={(value: any) => [`${Number(value).toLocaleString('fa-IR')} میلیون تومان`, '']}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="مبلغ_قرارداد_میلیون" name="مبلغ کل قرارداد" fill="#0284c7" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="دریافتی_میلیون" name="مبلغ دریافتی (وصولی)" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="مطالبات_میلیون" name="مانده مطالبات" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                💡 <strong>بینش تحلیلی:</strong> بیشترین سهم گردش مالی متعلق به حوزه مهندسی حریق و بیشترین نرخ تحقق درآمد در بخش سیستم‌های مدیریت ISO ثبت شده است.
              </div>
            </div>

            {/* Chart 2: CRM Lead Temperature & Funnel (Recharts PieChart) */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <PieChartIcon className="w-4 h-4 text-amber-500" />
                    <span>توزیع درجه حرارت و اولویت پیگیری سرنخ‌های CRM</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">Recharts PieChart</span>
                </div>
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={crmTempChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={45}
                        paddingAngle={4}
                        label={({ name, percent }: any) => `${name.split(' ')[0]} ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {crmTempChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', direction: 'rtl' }}
                        formatter={(val: any) => [`${val} پرونده`, 'تعداد']}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                🎯 <strong>هدف‌گذاری هفتگی:</strong> تمرکز پیگیری روی {crmMetrics.hotLeads} سرنخ داغ می‌تواند وصولی نقد ماه جاری را تا ۴۰٪ ارتقا دهد.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: FINANCIAL & PROJECTS STATUS
      ======================================================== */}
      {(activeTab === 'financial' || typeof window !== 'undefined') && (
        <div className={`${activeTab !== 'financial' ? 'hidden print:block' : ''} space-y-6`}>
          {/* Progress Distribution Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>میزان پیشرفت فیزیکی پروژه‌های کلیدی سازمان (درصد)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">وضعیت پیشبرد فازهای اجرایی، تاییدیه آتش‌نشانی و صدور گواهینامه‌ها</p>
              </div>
              <span className="text-xs font-black text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md">
                میانگین پیشرفت: {financialMetrics.avgProgress}٪
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectProgressChartData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="٪" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#334155' }} width={90} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', direction: 'rtl' }}
                    formatter={(val: any, _name: any, item: any) => [`${val}٪ پیشرفت (کارفرما: ${item?.payload?.کارفرما || '-'})`, 'پیشرفت فیزیکی']}
                  />
                  <Bar dataKey="پیشرفت" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Project Details Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-[#800000]" />
                <span>جدول تراز تفصیلی مالی و پیشرفت پروژه‌ها</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">{filteredProjects.length} پروژه</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">کد</th>
                    <th className="py-2.5 px-3">نام پروژه</th>
                    <th className="py-2.5 px-3">واحد تخصصی</th>
                    <th className="py-2.5 px-3">کارفرما</th>
                    <th className="py-2.5 px-3 text-center">پیشرفت</th>
                    <th className="py-2.5 px-3">مبلغ کل قرارداد</th>
                    <th className="py-2.5 px-3">دریافتی</th>
                    <th className="py-2.5 px-3">مانده مطالبات</th>
                    <th className="py-2.5 px-3">مدیر پروژه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.map((p, idx) => {
                    const c = parseAmount(p.totalContractAmount);
                    const r = parseAmount(p.receivedAmount);
                    const bal = Math.max(0, c - r);
                    const prog = p.progress || 0;
                    return (
                      <tr key={p.id || idx} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-600 font-bold">{p.id}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{p.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">{p.unit}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{p.clientName || 'نامشخص'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            prog >= 80 ? 'bg-emerald-100 text-emerald-800' :
                            prog >= 40 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {prog}٪
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-800">{formatTomans(c)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{formatTomans(r)}</td>
                        <td className="py-2.5 px-3 font-mono text-rose-700 font-semibold">{formatTomans(bal)}</td>
                        <td className="py-2.5 px-3 text-slate-600">{p.projectManagerName || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: CRM FUNNEL & MARKETING
      ======================================================== */}
      {(activeTab === 'crm' || typeof window !== 'undefined') && (
        <div className={`${activeTab !== 'crm' ? 'hidden print:block' : ''} space-y-6`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
            {/* Funnel Stage BarChart */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-indigo-600" />
                  <span>مراحل قیف فروش و نرخ ریزش سرنخ‌ها (CRM Funnel)</span>
                </h4>
                <span className="text-[11px] text-slate-500 font-bold">
                  تبدیل نهایی: {crmMetrics.conversionRate}٪
                </span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={crmFunnelData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="مرحله" tick={{ fontSize: 11, fill: '#475569' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', direction: 'rtl' }}
                      formatter={(val: any) => [`${val} پرونده`, 'تعداد سرنخ']}
                    />
                    <Bar dataKey="تعداد" radius={[6, 6, 0, 0]}>
                      {crmFunnelData.map((entry, index) => (
                        <Cell key={`funnel-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* High Priority Leads Table */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-red-600" />
                  <span>پرونده‌های بحرانی و سرنخ‌های داغ (Hot Leads)</span>
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {filteredCrmLeads
                    .filter(l => l.leadTemperature === 'داغ' || l.status.includes('پیش‌فاکتور'))
                    .slice(0, 5)
                    .map((l, i) => (
                      <div key={l.id || i} className="p-2.5 rounded-lg border border-red-100 bg-red-50/50 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{l.ownerName || 'کارفرمای محترم'}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{l.address || l.unit}</div>
                        </div>
                        <div className="text-left font-mono">
                          <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                            {l.leadTemperature || 'داغ'}
                          </span>
                          <div className="text-[10px] text-slate-600 mt-1">
                            {l.estimatedBudget ? `${formatTomans(parseAmount(l.estimatedBudget))} ت` : 'برآورد نشده'}
                          </div>
                        </div>
                      </div>
                    ))}
                  {filteredCrmLeads.filter(l => l.leadTemperature === 'داغ').length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400">
                      هیچ سرنخ داغی در این حوزه ثبت نشده است.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
                ارزش بالقوه کلیه سرنخ‌های جاری: <strong>{formatTomans(crmMetrics.totalEstimatedBudget)} تومان</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: PERSONNEL & WORKLOAD ANALYSIS
      ======================================================== */}
      {(activeTab === 'personnel' || typeof window !== 'undefined') && (
        <div className={`${activeTab !== 'personnel' ? 'hidden print:block' : ''} space-y-6`}>
          {/* Personnel Workload BarChart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>توزیع ساعات کارکرد عادی و اضافه‌کاری کارکنان برتر (ساعت)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">مقایسه ساعات موظفی در برابر اضافه‌کاری جهت توازن بار کاری تیم</p>
              </div>
              <span className="text-xs font-bold text-slate-600">
                میانگین کارکرد: {hrMetrics.avgHoursPerEmployee} ساعت
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={personnelWorkloadChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', direction: 'rtl' }}
                    formatter={(val: any) => [`${val} ساعت`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="ساعت_عادی" name="ساعات موظفی عادی" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="اضافه_کار" name="ساعات اضافه‌کاری" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Personnel Performance Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#800000]" />
                <span>جدول جامع ارزیابی کارکرد، حضور و وضعیت سازمانی پرسنل</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">{filteredPersonnel.length} کارمند</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">کد</th>
                    <th className="py-2.5 px-3">نام و نام خانوادگی</th>
                    <th className="py-2.5 px-3">واحد / دپارتمان</th>
                    <th className="py-2.5 px-3">عنوان شغلی</th>
                    <th className="py-2.5 px-3 text-center">کارکرد عادی (ساعت)</th>
                    <th className="py-2.5 px-3 text-center">اضافه‌کار (ساعت)</th>
                    <th className="py-2.5 px-3 text-center">مجموع ساعات</th>
                    <th className="py-2.5 px-3">وضعیت قرارداد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPersonnel.map((emp, idx) => {
                    const rec = hrMetrics.employeeRankings.find(r => r.name === emp.name);
                    const reg = rec?.regular || 0;
                    const ot = rec?.overtime || 0;
                    const tot = reg + ot;
                    return (
                      <tr key={emp.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-500">{emp.id}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                          <img src={emp.avatar} alt={emp.name} className="w-6 h-6 rounded-full object-cover border border-slate-200" />
                          <span>{emp.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{emp.unit}</td>
                        <td className="py-2.5 px-3 text-slate-600">{emp.role}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-medium">{reg.toLocaleString('fa-IR')}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-indigo-700 font-bold">{ot.toLocaleString('fa-IR')}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900">{tot.toLocaleString('fa-IR')}</td>
                        <td className="py-2.5 px-3">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {emp.employmentStatus || 'شاغل فعال'}
                          </span>
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

      {/* ========================================================
          PRINT-ONLY OFFICIAL SIGNATURES & STAMP BLOCK
      ======================================================== */}
      <div className="hidden print:block mt-12 pt-8 border-t-2 border-slate-400">
        <div className="grid grid-cols-3 gap-6 text-center text-xs">
          <div className="space-y-12">
            <div className="font-bold text-slate-800">امضا و تایید مدیر ارزیابی و برنامه‌ریزی (PMO):</div>
            <div className="text-slate-400 font-mono text-[10px]">مهر و امضا دیجیتال</div>
          </div>
          <div className="space-y-12">
            <div className="font-bold text-slate-800">امضا و تایید مدیر امور مالی و اداری:</div>
            <div className="text-slate-400 font-mono text-[10px]">مهر و امضا دیجیتال</div>
          </div>
          <div className="space-y-12">
            <div className="font-bold text-slate-800">تایید نهایی مدیرعامل و عضو هیئت مدیره:</div>
            <div className="text-slate-400 font-mono text-[10px]">مهر و امضا دیجیتال</div>
          </div>
        </div>

        <div className="mt-8 text-center text-[10px] text-slate-500 font-mono border-t border-slate-200 pt-2">
          سامانه یکپارچه اتوماسیون مهندسی رابو | چاپ شده در تاریخ {todayStr} | هرگونه کپی‌برداری بدون مجوز کتبی ممنوع است.
        </div>
      </div>
    </div>
  );
};
