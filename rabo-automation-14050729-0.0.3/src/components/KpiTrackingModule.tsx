import React, { useState, useMemo } from 'react';
import { Employee, KpiIndicator, KpiMonthlyEvaluation } from '../types';
import { toFa, padFa, getExactShamsiTimestamp } from '../utils/jalali';
import { 
  Award, 
  TrendingUp, 
  Plus, 
  CheckCircle2, 
  BarChart3, 
  FileText, 
  Sliders, 
  Sparkles, 
  Target, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  User, 
  Check, 
  Trash2, 
  AlertCircle,
  HelpCircle,
  Percent,
  Printer,
  Filter
} from 'lucide-react';
import { VoiceInputButton } from './VoiceInputButton';

interface KpiTrackingModuleProps {
  currentUser: Employee;
  personnelList: Employee[];
  kpiIndicators: KpiIndicator[];
  setKpiIndicators: React.Dispatch<React.SetStateAction<KpiIndicator[]>>;
  kpiEvaluations: KpiMonthlyEvaluation[];
  setKpiEvaluations: React.Dispatch<React.SetStateAction<KpiMonthlyEvaluation[]>>;
  setToastMessage: (msg: string) => void;
}

export const KpiTrackingModule: React.FC<KpiTrackingModuleProps> = ({
  currentUser,
  personnelList,
  kpiIndicators,
  setKpiIndicators,
  kpiEvaluations,
  setKpiEvaluations,
  setToastMessage
}) => {
  // Sub-tabs: 'cumulative' | 'evaluations' | 'indicators'
  const [activeTab, setActiveTab] = useState<'cumulative' | 'evaluations' | 'indicators'>('cumulative');

  // Senior Manager Filter Module: Time Period & Team/Department
  const [timeRangeFilter, setTimeRangeFilter] = useState<'all' | 'monthly' | 'quarterly' | 'yearly'>('all');
  const [selectedQuarter, setSelectedQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q2');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<number>(7);
  const [unitFilter, setUnitFilter] = useState<string>('all');

  // Selected employee filter for cumulative view
  const [selectedEmpId, setSelectedEmpId] = useState<string>('EMP-01');

  // New Indicator Form State based on Modern 3-Pillar Framework
  const [newIndicatorForm, setNewIndicatorForm] = useState({
    employeeId: 'EMP-01',
    title: '',
    category: 'اهداف کمی و پروژه‌ای (OKRs)' as KpiIndicator['category'],
    target: '',
    weight: 30,
    unit: 'درصد'
  });

  // Monthly Evaluation Form State
  const [evalEmployeeId, setEvalEmployeeId] = useState<string>('EMP-01');
  const [evalYear, setEvalYear] = useState<number>(1405);
  const [evalMonth, setEvalMonth] = useState<number>(7);
  const [evalFeedback, setEvalFeedback] = useState<string>('');
  const [evalKeyStrengths, setEvalKeyStrengths] = useState<string>('');
  const [evalImprovementAreas, setEvalImprovementAreas] = useState<string>('');

  // Current indicators of the employee selected for evaluation
  const activeIndicatorsForEval = useMemo(() => {
    return kpiIndicators.filter(ind => ind.employeeId === evalEmployeeId);
  }, [kpiIndicators, evalEmployeeId]);

  // Scores map for the evaluation form: indicatorId -> { actual: string, score: number }
  const [evalScores, setEvalScores] = useState<Record<string, { actual: string; score: number }>>({});

  // Preset Modern KPI Templates (OKRs + Technical Quality + Behavioral Discipline)
  const kpiTemplates = [
    // ۱. اهداف کمی و پروژه‌ای (OKRs)
    { title: 'طراحی نقشه‌های اطفای حریق اسپرینکلر تاییدیه سازمان', category: 'اهداف کمی و پروژه‌ای (OKRs)', target: 'حداقل ۴ پروژه کامل در ماه', weight: 35, unit: 'پروژه' },
    { title: 'تبدیل پرونده‌های شهرسازی به جلسه حضوری و قرارداد', category: 'اهداف کمی و پروژه‌ای (OKRs)', target: 'تحقق حداقل ۶۰٪ تارگت ماهانه', weight: 35, unit: 'درصد' },
    { title: 'انجام گزارش‌های ممیزی تفصیلی انرژی ساختمان‌ها', category: 'اهداف کمی و پروژه‌ای (OKRs)', target: 'تحویل ۲ گزارش کامل ممیزی', weight: 30, unit: 'گزارش' },

    // ۲. کیفیت فنی و مهندسی (Technical Quality)
    { title: 'انطباق محاسبات هیدرولیک با ضوابط NFPA و مقررات ملی', category: 'کیفیت فنی و مهندسی', target: 'عدم بازگشت یا نقص نقشه در کمیته', weight: 35, unit: 'پروژه' },
    { title: 'سرعت رفع ایرادات فنی کمیته آتش‌نشانی و شهرداری', category: 'کیفیت فنی و مهندسی', target: 'رفع کامل ایرادات ظرف ۴۸ ساعت', weight: 25, unit: 'ساعت' },
    { title: 'انطباق کامل مستندات با استانداردهای ISO 9001 و IMS', category: 'کیفیت فنی و مهندسی', target: 'صفر عدم‌انطباق عمده در ممیزی', weight: 25, unit: 'ممیزی' },

    // ۳. نظم سازمانی و تعامل تیمی (Behavioral & Discipline)
    { title: 'پیگیری بدون تأخیر در کارتابل CRM و مکاتبات موعد روز', category: 'نظم سازمانی و تعامل تیمی', target: 'پاسخگویی ۹۸٪ وظایف در موعد', weight: 20, unit: 'درصد' },
    { title: 'مشارکت فعال در جلسات هماهنگی هفتگی و مدیریت دانش', category: 'نظم سازمانی و تعامل تیمی', target: 'حضور ۱۰۰٪ و ثبت حداقل ۲ بهبود', weight: 15, unit: 'جلسه' }
  ];

  // Printable A4 Performance Appraisal Card (کارنامه رسمی ارزیابی عملکرد رابو)
  const printAppraisalCard = (log: KpiMonthlyEvaluation, emp?: Employee) => {
    const targetEmp = emp || personnelList.find(p => p.id === log.employeeId) || {
      name: log.employeeName,
      id: log.employeeId,
      unit: 'مهندسی رابو',
      role: 'کارشناس',
      nationalId: '',
      positionLevel: 'کارشناس'
    };

    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) return;

    // Group categories
    const categories: Record<string, { totalWeight: number; totalWeightedScore: number; count: number }> = {};
    log.items.forEach(it => {
      const cat = it.category || 'اهداف کمی و پروژه‌ای (OKRs)';
      if (!categories[cat]) categories[cat] = { totalWeight: 0, totalWeightedScore: 0, count: 0 };
      categories[cat].totalWeight += it.weight;
      categories[cat].totalWeightedScore += it.weightedScore;
      categories[cat].count += 1;
    });

    w.document.write(`
      <!doctype html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="utf-8">
        <title>کارنامه ارزیابی عملکرد پرسنل - ${targetEmp.name} - ${log.periodStr}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'IRANSans', Tahoma, Arial, sans-serif; margin: 0; color: #13213c; direction: rtl; font-size: 10.5pt; line-height: 1.5; background: #fff; }
          .sheet { border: 2px solid #13213c; padding: 10mm; border-radius: 6px; box-sizing: border-box; min-height: 265mm; position: relative; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #13213c; padding-bottom: 4mm; margin-bottom: 5mm; }
          .logo-area { display: flex; align-items: center; gap: 4mm; }
          .logo-box { width: 14mm; height: 14mm; background: #13213c; color: #e4b427; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 15pt; border-radius: 4px; }
          .title { font-size: 14pt; font-weight: 900; color: #13213c; }
          .subtitle { font-size: 8.5pt; color: #64748b; font-weight: bold; }
          .meta { font-size: 8.5pt; text-align: left; }
          .emp-card { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2.5mm; background: #f8fafc; border: 1px solid #e2e8f0; padding: 3.5mm; border-radius: 5px; margin-bottom: 4mm; font-size: 9pt; }
          .emp-card div span { display: block; font-size: 7.5pt; color: #64748b; margin-bottom: 0.5mm; }
          .emp-card div strong { color: #0f172a; }
          .score-banner { display: flex; justify-content: space-between; align-items: center; background: #13213c; color: #fff; padding: 3.5mm 5mm; border-radius: 5px; margin-bottom: 4mm; }
          .score-banner .grade-box { font-size: 14pt; font-weight: 900; color: #e4b427; border: 1.5px solid #e4b427; padding: 1mm 4mm; border-radius: 4px; }
          .score-banner .score-num { font-size: 18pt; font-weight: 900; }
          .cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-bottom: 4mm; }
          .cat-box { border: 1px solid #cbd5e1; padding: 2.5mm; border-radius: 4px; background: #fdfdfd; }
          .cat-box .cat-title { font-size: 8pt; font-weight: bold; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 1mm; margin-bottom: 1.5mm; }
          .cat-box .cat-score { font-size: 11pt; font-weight: bold; color: #0f172a; text-align: center; }
          table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 4mm; }
          th { background: #f1f5f9; color: #1e293b; padding: 2mm; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; }
          td { padding: 2mm; border: 1px solid #cbd5e1; text-align: right; }
          .notes-box { border: 1px solid #cbd5e1; background: #fafafa; padding: 3mm; border-radius: 4px; margin-bottom: 5mm; font-size: 8.5pt; }
          .notes-box h6 { margin: 0 0 1.5mm 0; font-size: 8.5pt; font-weight: bold; color: #13213c; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; text-align: center; font-size: 8pt; margin-top: 6mm; padding-top: 3mm; border-top: 1px dashed #cbd5e1; }
          .signatures .sig-box { min-height: 16mm; border: 1px dashed #cbd5e1; border-radius: 4px; padding: 2mm; display: flex; flex-direction: column; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <div class="logo-area">
              <div class="logo-box">R</div>
              <div>
                <div class="title">شرکت مهندسی رهنمون کیفیت رابو</div>
                <div class="subtitle">کارنامه رسمی ارزیابی عملکرد و پایش شاخص‌های کلیدی (OKRs + Balanced Scorecard)</div>
              </div>
            </div>
            <div class="meta">
              <div><strong>دوره ارزیابی:</strong> ${log.periodStr}</div>
              <div><strong>تاریخ صدور:</strong> ${log.evaluatedAt}</div>
              <div><strong>شماره پرونده:</strong> RABO-KPI-${log.year}-${log.month}-${targetEmp.id}</div>
            </div>
          </div>

          <div class="emp-card">
            <div><span>نام و نام خانوادگی:</span><strong>${targetEmp.name}</strong></div>
            <div><span>کد پرسنلی:</span><strong>${targetEmp.id}</strong></div>
            <div><span>دپارتمان / واحد:</span><strong>${targetEmp.unit}</strong></div>
            <div><span>سمت سازمانی:</span><strong>${targetEmp.role}</strong></div>
            <div><span>کد ملی:</span><strong>${targetEmp.nationalId || '-'}</strong></div>
            <div><span>سطح جایگاه:</span><strong>${targetEmp.positionLevel || 'کارشناس'}</strong></div>
            <div><span>مدیر ارزیاب:</span><strong>${log.evaluatedBy}</strong></div>
            <div><span>تاریخ ثبت:</span><strong>${log.evaluatedAt}</strong></div>
          </div>

          <div class="score-banner">
            <div>
              <div style="font-size: 8.5pt; color: #94a3b8;">نتیجه ارزیابی عملکرد سازمانی دوره</div>
              <div style="font-size: 12pt; font-weight: bold;">سطح عملکرد و شایستگی فردی</div>
            </div>
            <div style="display: flex; align-items: center; gap: 4mm;">
              <div class="grade-box">رتبه ${log.grade}</div>
              <div class="score-num">${toFa(log.totalScore)} / ۱۰۰</div>
            </div>
          </div>

          <div class="cat-grid">
            ${Object.entries(categories).map(([catName, data]) => `
              <div class="cat-box">
                <div class="cat-title">${catName} (وزن: ${toFa(data.totalWeight)}٪)</div>
                <div class="cat-score">${toFa(Math.round(data.totalWeightedScore * 10) / 10)} نمره کسب‌شده</div>
              </div>
            `).join('')}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 4%;">ردیف</th>
                <th style="width: 34%;">عنوان شاخص عملکردی</th>
                <th style="width: 22%;">ستون چارچوب سازمانی</th>
                <th style="width: 8%;">وزن</th>
                <th style="width: 14%;">هدف مصوب</th>
                <th style="width: 14%;">عملکرد واقعی</th>
                <th style="width: 8%;">امتیاز</th>
                <th style="width: 8%;">نمره موزون</th>
              </tr>
            </thead>
            <tbody>
              ${log.items.map((it, idx) => `
                <tr>
                  <td style="text-align: center;">${toFa(idx + 1)}</td>
                  <td><strong>${it.indicatorTitle}</strong></td>
                  <td>${it.category}</td>
                  <td style="text-align: center;">${toFa(it.weight)}٪</td>
                  <td>${it.target}</td>
                  <td>${it.actual}</td>
                  <td style="text-align: center;">${toFa(it.score)}</td>
                  <td style="text-align: center; font-weight: bold; color: #047857;">${toFa(it.weightedScore)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="notes-box">
            <h6>بازخورد کیفی و تحلیل مدیریتی عملکرد پرسنل:</h6>
            <p style="margin: 0; color: #334155;">${log.managerFeedback || 'عملکرد این دوره پرسنل بر اساس اهداف و شاخص‌ها مورد تأیید است.'}</p>
            ${log.keyStrengths ? `<p style="margin: 1.5mm 0 0 0; font-size: 8pt;"><strong>نقاط قوت کلیدی:</strong> ${log.keyStrengths}</p>` : ''}
            ${log.improvementAreas ? `<p style="margin: 1mm 0 0 0; font-size: 8pt;"><strong>فرصت‌های رشد و آموزش مهارتی (IDP):</strong> ${log.improvementAreas}</p>` : ''}
          </div>

          <div class="signatures">
            <div class="sig-box">
              <span>امضای کارمند ارزیابی‌شده</span>
              <span style="color: #94a3b8; font-size: 7.5pt;">رویت و پذیرش نتایج</span>
            </div>
            <div class="sig-box">
              <span>تأیید مدیر ارزیاب</span>
              <span style="color: #94a3b8; font-size: 7.5pt;">${log.evaluatedBy}</span>
            </div>
            <div class="sig-box">
              <span>مهر و امضای مدیریت ارشد رابو</span>
              <span style="color: #94a3b8; font-size: 7.5pt;">تأیید نهایی منابع انسانی</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
    w.document.close();
  };

  // Helper to calculate total evaluation score
  const liveEvaluationTotal = useMemo(() => {
    if (activeIndicatorsForEval.length === 0) return 0;
    let total = 0;
    activeIndicatorsForEval.forEach(ind => {
      const score = evalScores[ind.id]?.score ?? 80;
      total += (score * ind.weight) / 100;
    });
    return Math.round(total * 100) / 100;
  }, [activeIndicatorsForEval, evalScores]);

  // Cumulative Ratings Computation across all employees (filtered by time period and work team)
  const cumulativeStats = useMemo(() => {
    const filteredEmployees = personnelList.filter(emp => {
      if (unitFilter === 'all') return true;
      return (emp.unit || '').includes(unitFilter);
    });

    return filteredEmployees.map(emp => {
      const logs = kpiEvaluations
        .filter(ev => {
          if (ev.employeeId !== emp.id) return false;
          if (timeRangeFilter === 'monthly') {
            return ev.month === selectedMonthFilter;
          }
          if (timeRangeFilter === 'quarterly') {
            if (selectedQuarter === 'Q1') return ev.month >= 1 && ev.month <= 3;
            if (selectedQuarter === 'Q2') return ev.month >= 4 && ev.month <= 6;
            if (selectedQuarter === 'Q3') return ev.month >= 7 && ev.month <= 9;
            if (selectedQuarter === 'Q4') return ev.month >= 10 && ev.month <= 12;
          }
          if (timeRangeFilter === 'yearly') {
            return ev.year === 1405;
          }
          return true;
        })
        .sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month));

      const count = logs.length;
      if (count === 0) {
        return {
          employee: emp,
          logs: [],
          count: 0,
          averageScore: 0,
          lastMonthScore: 0,
          trend: 0,
          grade: 'ارزیابی نشده',
          bestMonth: null as null | { period: string; score: number }
        };
      }

      const totalSum = logs.reduce((acc, l) => acc + l.totalScore, 0);
      const averageScore = Math.round((totalSum / count) * 100) / 100;

      const lastMonthScore = logs[count - 1].totalScore;
      const prevMonthScore = count > 1 ? logs[count - 2].totalScore : lastMonthScore;
      const trend = Math.round((lastMonthScore - prevMonthScore) * 100) / 100;

      // Best month
      const best = [...logs].sort((a, b) => b.totalScore - a.totalScore)[0];

      // Grade classification
      let grade = 'نیازمند بهبود (D)';
      if (averageScore >= 92) grade = 'عالی (A+)';
      else if (averageScore >= 85) grade = 'بسیار خوب (A)';
      else if (averageScore >= 75) grade = 'خوب (B)';
      else if (averageScore >= 65) grade = 'متوسط (C)';

      return {
        employee: emp,
        logs,
        count,
        averageScore,
        lastMonthScore,
        trend,
        grade,
        bestMonth: { period: best.periodStr, score: best.totalScore }
      };
    });
  }, [personnelList, kpiEvaluations, unitFilter, timeRangeFilter, selectedMonthFilter, selectedQuarter]);

  // Stats for the currently selected employee in the drilldown
  const selectedEmpStats = useMemo(() => {
    return cumulativeStats.find(s => s.employee.id === selectedEmpId) || cumulativeStats[0];
  }, [cumulativeStats, selectedEmpId]);

  // Handle saving new indicator definition
  const handleSaveIndicator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIndicatorForm.title.trim()) {
      setToastMessage('لطفاً عنوان شاخص را وارد فرمایید.');
      return;
    }

    const newInd: KpiIndicator = {
      id: `KPI-IND-${Date.now()}`,
      employeeId: newIndicatorForm.employeeId,
      title: newIndicatorForm.title.trim(),
      category: newIndicatorForm.category,
      target: newIndicatorForm.target.trim() || '۱۰۰٪ تحقق هدف',
      weight: Number(newIndicatorForm.weight),
      unit: newIndicatorForm.unit,
      createdAt: getExactShamsiTimestamp()
    };

    setKpiIndicators([...kpiIndicators, newInd]);
    setNewIndicatorForm(prev => ({
      ...prev,
      title: '',
      target: ''
    }));
    setToastMessage('شاخص عملکردی جدید با موفقیت ثبت شد.');
  };

  // Handle saving monthly evaluation log
  const handleSaveMonthlyEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndicatorsForEval.length === 0) {
      alert('برای این کارمند شاخص فعالی تعریف نشده است. ابتدا از زبانه «تعریف شاخص‌ها» اقدام نمایید.');
      return;
    }

    const targetEmp = personnelList.find(p => p.id === evalEmployeeId);
    const monthNames = ['', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    const periodStr = `${toFa(evalYear)}/${padFa(evalMonth)} - ${monthNames[evalMonth]}`;

    const items = activeIndicatorsForEval.map(ind => {
      const actualVal = evalScores[ind.id]?.actual || ind.target;
      const scoreVal = evalScores[ind.id]?.score ?? 90;
      const weighted = Math.round(((scoreVal * ind.weight) / 100) * 100) / 100;
      return {
        indicatorId: ind.id,
        indicatorTitle: ind.title,
        category: ind.category,
        weight: ind.weight,
        target: ind.target,
        actual: actualVal,
        score: scoreVal,
        weightedScore: weighted
      };
    });

    const total = items.reduce((acc, it) => acc + it.weightedScore, 0);
    const finalScore = Math.round(total * 100) / 100;

    let grade: KpiMonthlyEvaluation['grade'] = 'D (نیازمند بهبود)';
    if (finalScore >= 90) grade = 'A+ (سرآمد)';
    else if (finalScore >= 80) grade = 'A (عالی)';
    else if (finalScore >= 70) grade = 'B (بسیار خوب)';
    else if (finalScore >= 60) grade = 'C (متوسط)';

    const newEval: KpiMonthlyEvaluation = {
      id: `EVAL-${evalEmployeeId}-${evalYear}${padFa(evalMonth)}`,
      employeeId: evalEmployeeId,
      employeeName: targetEmp ? targetEmp.name : 'کارمند رابو',
      year: evalYear,
      month: evalMonth,
      periodStr,
      evaluatedBy: currentUser.name,
      evaluatedAt: getExactShamsiTimestamp(),
      items,
      totalScore: finalScore,
      grade,
      managerFeedback: evalFeedback.trim() || 'ارزیابی ماهانه عملکرد ثبت شد و مورد تأیید است.',
      keyStrengths: evalKeyStrengths.trim(),
      improvementAreas: evalImprovementAreas.trim()
    };

    // Remove existing if evaluating same month to update it
    const filtered = kpiEvaluations.filter(
      ev => !(ev.employeeId === evalEmployeeId && ev.year === evalYear && ev.month === evalMonth)
    );

    setKpiEvaluations([newEval, ...filtered]);
    setEvalFeedback('');
    setEvalKeyStrengths('');
    setEvalImprovementAreas('');
    setToastMessage(`ارزیابی عملکرد دوره ${periodStr} با رتبه ${grade} و نمره ${toFa(finalScore)} ثبت و در دیتابیس پایدار گردید.`);
    setActiveTab('cumulative');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
                <Award className="w-4 h-4" />
              </span>
              <h3 className="text-base font-extrabold text-[#13213c]">
                سامانه پایش عملکرد و شاخص‌های کلیدی پرسنل (KPI Tracking)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              تعریف شاخص‌های ماهانه اختصاصی هر شغل، ثبت امتیازات وزنی و محاسبه نمرات عملکردی تجمعی در طول زمان
            </p>
          </div>

          {/* Module Sub-tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('cumulative')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'cumulative'
                  ? 'bg-white text-[#13213c] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
              <span>رتبه‌بندی و نمرات تجمعی</span>
            </button>

            {currentUser.isManager && (
              <button
                onClick={() => setActiveTab('evaluations')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'evaluations'
                    ? 'bg-white text-[#13213c] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>ثبت ارزیابی ماهانه جدید</span>
              </button>
            )}

            {currentUser.isManager && (
              <button
                onClick={() => setActiveTab('indicators')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'indicators'
                    ? 'bg-white text-[#13213c] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                <span>تعریف و مدیریت شاخص‌ها</span>
              </button>
            )}
          </div>
        </div>

        {/* Highlight KPI Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium">پرسنل ارزیابی شده</span>
            <div className="text-lg font-black text-slate-900 mt-1">
              {toFa(cumulativeStats.filter(s => s.count > 0).length)} نفر
            </div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium">شاخص‌های عملکردی تعریف‌شده</span>
            <div className="text-lg font-black text-amber-700 mt-1">
              {toFa(kpiIndicators.length)} شاخص
            </div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium">کل دوره‌های ارزیابی ماهانه</span>
            <div className="text-lg font-black text-blue-800 mt-1">
              {toFa(kpiEvaluations.length)} دوره
            </div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium">میانگین عملکرد سازمانی رابو</span>
            <div className="text-lg font-black text-emerald-700 mt-1">
              {toFa(
                Math.round(
                  (cumulativeStats
                    .filter(s => s.count > 0)
                    .reduce((a, b) => a + b.averageScore, 0) /
                    Math.max(1, cumulativeStats.filter(s => s.count > 0).length)) *
                    10
                ) / 10
              )} از ۱۰۰
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. CUMULATIVE VIEW (رتبه‌بندی، روندهای زمانی و نمرات تجمعی) */}
      {/* ============================================================== */}
      {activeTab === 'cumulative' && (
        <div className="space-y-6">
          {/* Senior Manager Filter Bar: Time Range (Monthly / Quarterly / Yearly) & Work Team */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-black text-[#13213c]">فیلتر تحلیلی مدیران ارشد (بازه زمانی و تیم کاری):</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={unitFilter}
                onChange={e => setUnitFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 font-bold text-slate-800 outline-none"
              >
                <option value="all">همه تیم‌ها و دپارتمان‌ها</option>
                <option value="مهندسی حریق">تیم مهندسی حریق و آتش‌نشانی</option>
                <option value="انرژی">تیم ممیزی انرژی و سولار</option>
                <option value="سیستم مدیریت">تیم سیستم مدیریت و ایزو</option>
                <option value="مدیریت">تیم مدیریت و ستاد مرکزی</option>
              </select>

              <select
                value={timeRangeFilter}
                onChange={e => setTimeRangeFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 font-bold text-slate-800 outline-none"
              >
                <option value="all">کل دوره‌ها (تجمعی)</option>
                <option value="monthly">بازه ماهانه</option>
                <option value="quarterly">بازه فصلی (سه ماهه)</option>
                <option value="yearly">بازه سالانه (۱۴۰۵)</option>
              </select>

              {timeRangeFilter === 'monthly' && (
                <select
                  value={selectedMonthFilter}
                  onChange={e => setSelectedMonthFilter(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 font-bold text-amber-900 outline-none"
                >
                  {['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'].map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m} ۱۴۰۵</option>
                  ))}
                </select>
              )}

              {timeRangeFilter === 'quarterly' && (
                <select
                  value={selectedQuarter}
                  onChange={e => setSelectedQuarter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-lg border border-indigo-300 bg-indigo-50 font-bold text-indigo-900 outline-none"
                >
                  <option value="Q1">فصل بهار (سه ماهه اول)</option>
                  <option value="Q2">فصل تابستان (سه ماهه دوم)</option>
                  <option value="Q3">فصل پاییز (سه ماهه سوم)</option>
                  <option value="Q4">فصل زمستان (سه ماهه چهارم)</option>
                </select>
              )}
            </div>
          </div>

          {/* Ranking Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-[#13213c] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>جدول رتبه‌بندی و امتیاز تجمعی عملکرد پرسنل (Cumulative Ranking)</span>
              </h4>
              <span className="text-xs text-slate-500">
                محاسبه بر اساس میانگین وزنی کلیه ارزیابی‌های ثبت‌شده در بازه انتخابی
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="p-3">رتبه</th>
                    <th className="p-3">نام و مشخصات پرسنل</th>
                    <th className="p-3">دپارتمان</th>
                    <th className="p-3">دوره‌های ارزیابی</th>
                    <th className="p-3">روند ماه اخیر</th>
                    <th className="p-3">نمره تجمعی کل (Cumulative)</th>
                    <th className="p-3">رده شایستگی</th>
                    <th className="p-3 text-center">مشاهده تحلیل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...cumulativeStats]
                    .sort((a, b) => b.averageScore - a.averageScore)
                    .map((stat, idx) => (
                      <tr
                        key={stat.employee.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          selectedEmpId === stat.employee.id ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        <td className="p-3 font-mono font-bold text-slate-500">
                          {stat.count > 0 ? `#${idx + 1}` : '-'}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={stat.employee.avatar}
                              alt={stat.employee.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            />
                            <div>
                              <div className="font-bold text-slate-900">{stat.employee.name}</div>
                              <div className="text-[10px] text-slate-500">{stat.employee.role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-slate-600">{stat.employee.unit}</td>
                        <td className="p-3 text-slate-700 font-medium">
                          {stat.count > 0 ? `${toFa(stat.count)} ماه ارزیابی` : 'بدون ارزیابی'}
                        </td>
                        <td className="p-3">
                          {stat.count > 1 ? (
                            <div
                              className={`flex items-center gap-1 text-[11px] font-bold ${
                                stat.trend >= 0 ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {stat.trend >= 0 ? (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowDownRight className="w-3.5 h-3.5" />
                              )}
                              <span>{toFa(Math.abs(stat.trend))} نمره</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">بدون تغییر</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden max-w-[90px]">
                              <div
                                className={`h-full rounded-full ${
                                  stat.averageScore >= 90
                                    ? 'bg-emerald-500'
                                    : stat.averageScore >= 80
                                    ? 'bg-blue-500'
                                    : stat.averageScore >= 70
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, stat.averageScore)}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-900 font-mono">
                              {stat.count > 0 ? toFa(stat.averageScore) : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              stat.averageScore >= 90
                                ? 'bg-emerald-100 text-emerald-800'
                                : stat.averageScore >= 80
                                ? 'bg-blue-100 text-blue-800'
                                : stat.averageScore >= 70
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {stat.grade}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setSelectedEmpId(stat.employee.id)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            نمودار و سوابق
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drill-Down Section for Selected Employee */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <img
                  src={selectedEmpStats.employee.avatar}
                  alt={selectedEmpStats.employee.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-amber-400"
                />
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    پرونده تحلیلی عملکرد: {selectedEmpStats.employee.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {selectedEmpStats.employee.role} | دپارتمان {selectedEmpStats.employee.unit}
                  </p>
                </div>
              </div>

              {/* Performance Indicator Badges */}
              <div className="flex items-center gap-3">
                <div className="text-left bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-semibold">امتیاز تجمعی کل</span>
                  <span className="text-lg font-black text-emerald-700 font-mono">
                    {selectedEmpStats.count > 0 ? toFa(selectedEmpStats.averageScore) : 'بدون ثبت'}
                  </span>
                </div>
                {selectedEmpStats.bestMonth && (
                  <div className="text-left bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">بهترین دوره</span>
                    <span className="text-xs font-bold text-amber-700">
                      {selectedEmpStats.bestMonth.period} ({toFa(selectedEmpStats.bestMonth.score)})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Trend Visualizer (Bar Chart representation) */}
            <div>
              <h5 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>روند پیشرفت ماهانه عملکرد در طول زمان</span>
              </h5>

              {selectedEmpStats.logs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  هنوز ارزیابی ماهانه‌ای برای این پرسنل ثبت نشده است. مدیران می‌توانند از زبانه «ثبت ارزیابی ماهانه جدید» امتیازدهی را آغاز نمایند.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Timeline Horizontal Bars */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {selectedEmpStats.logs.map(log => (
                      <div
                        key={log.id}
                        className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-xs text-slate-800">{log.periodStr}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.totalScore >= 90
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            نمره: {toFa(log.totalScore)}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full ${
                              log.totalScore >= 90 ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(100, log.totalScore)}%` }}
                          />
                        </div>

                        <div className="text-[11px] text-slate-500 italic mt-1 line-clamp-2">
                          "{log.managerFeedback}"
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2">
                          ارزیاب: {log.evaluatedBy}
                        </div>
                        <button
                          type="button"
                          onClick={() => printAppraisalCard(log, selectedEmpStats.employee)}
                          className="mt-2.5 w-full flex items-center justify-center gap-1.5 bg-[#13213c] hover:bg-[#1d325a] text-white text-[10px] font-bold py-1.5 px-2 rounded-lg cursor-pointer transition-all shadow-2xs"
                          title="چاپ رسمی کارنامه عملکرد A4"
                        >
                          <Printer className="w-3 h-3 text-amber-400" />
                          <span>چاپ کارنامه ارزیابی A4</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Detailed Indicator Breakdown of Last Log */}
                  {selectedEmpStats.logs.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <h5 className="text-xs font-bold text-slate-800">
                          تفکیک ریزنمرات آخرین ارزیابی ({selectedEmpStats.logs[selectedEmpStats.logs.length - 1].periodStr})
                        </h5>
                        <button
                          type="button"
                          onClick={() => printAppraisalCard(selectedEmpStats.logs[selectedEmpStats.logs.length - 1], selectedEmpStats.employee)}
                          className="flex items-center gap-1 bg-[#13213c] hover:bg-[#1d325a] text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all shadow-2xs shrink-0 self-start sm:self-auto"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-400" />
                          <span>چاپ کارنامه رسمی A4</span>
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100/70 text-slate-600">
                              <th className="p-2.5">عنوان شاخص</th>
                              <th className="p-2.5">دسته‌بندی</th>
                              <th className="p-2.5">وزن</th>
                              <th className="p-2.5">هدف مصوب</th>
                              <th className="p-2.5">تحقق یافته (Actual)</th>
                              <th className="p-2.5">امتیاز خام</th>
                              <th className="p-2.5">نمره موزون</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedEmpStats.logs[selectedEmpStats.logs.length - 1].items.map(item => (
                              <tr key={item.indicatorId}>
                                <td className="p-2.5 font-semibold text-slate-800">{item.indicatorTitle}</td>
                                <td className="p-2.5 text-slate-600">{item.category}</td>
                                <td className="p-2.5 text-slate-600 font-mono">{toFa(item.weight)}٪</td>
                                <td className="p-2.5 text-slate-600">{item.target}</td>
                                <td className="p-2.5 text-slate-800 font-medium">{item.actual}</td>
                                <td className="p-2.5 font-mono text-slate-700">{toFa(item.score)}</td>
                                <td className="p-2.5 font-mono font-bold text-emerald-700">
                                  {toFa(item.weightedScore)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. MONTHLY EVALUATION LOGGER (فرم ثبت ارزیابی ماهانه توسط مدیر) */}
      {/* ============================================================== */}
      {activeTab === 'evaluations' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-200">
            <h4 className="text-sm font-bold text-[#13213c] flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>فرم رسمی ثبت ارزیابی عملکرد ماهانه پرسنل</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              امتیازدهی به شاخص‌های فعال شغل بر اساس نتایج واقعی به‌دست‌آمده در طول ماه
            </p>
          </div>

          <form onSubmit={handleSaveMonthlyEvaluation} className="space-y-5">
            {/* Header Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">پرسنل مورد ارزیابی *</label>
                <select
                  value={evalEmployeeId}
                  onChange={e => {
                    setEvalEmployeeId(e.target.value);
                    setEvalScores({});
                  }}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none bg-white font-medium"
                >
                  {personnelList.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role} - {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">سال ارزیابی *</label>
                <select
                  value={evalYear}
                  onChange={e => setEvalYear(Number(e.target.value))}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none bg-white font-medium"
                >
                  {[1405, 1406, 1407].map(y => (
                    <option key={y} value={y}>{toFa(y)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ماه دوره *</label>
                <select
                  value={evalMonth}
                  onChange={e => setEvalMonth(Number(e.target.value))}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none bg-white font-medium"
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

            {/* Indicators Evaluation Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  شاخص‌های عملکردی مصوب پرسنل ({toFa(activeIndicatorsForEval.length)} شاخص فعال)
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                  نمره کل محاسبه‌شده: {toFa(liveEvaluationTotal)} از ۱۰۰
                </span>
              </div>

              {activeIndicatorsForEval.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-amber-50/50 rounded-xl border border-amber-200 text-xs">
                  هیچ شاخصی برای این پرسنل تعریف نشده است. ابتدا به زبانه «تعریف و مدیریت شاخص‌ها» بروید و اهداف شغلی را ثبت فرمایید.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeIndicatorsForEval.map((ind, idx) => {
                    const currentScore = evalScores[ind.id]?.score ?? 90;
                    const currentActual = evalScores[ind.id]?.actual ?? '';
                    const weighted = Math.round(((currentScore * ind.weight) / 100) * 100) / 100;

                    return (
                      <div
                        key={ind.id}
                        className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-3 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold flex items-center justify-center">
                              {toFa(idx + 1)}
                            </span>
                            <span className="font-bold text-xs text-slate-800">{ind.title}</span>
                            <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-medium">
                              {ind.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500">وزن شاخص: <strong className="text-slate-800 font-mono">{toFa(ind.weight)}٪</strong></span>
                            <span className="text-slate-400">|</span>
                            <span className="text-slate-500">هدف مصوب: <strong className="text-amber-800">{ind.target}</strong></span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              نتیجه محقق‌شده کارمند در این ماه (Actual)
                            </label>
                            <input
                              type="text"
                              value={currentActual}
                              onChange={e => {
                                setEvalScores({
                                  ...evalScores,
                                  [ind.id]: {
                                    actual: e.target.value,
                                    score: evalScores[ind.id]?.score ?? 90
                                  }
                                });
                              }}
                              placeholder={`مثال: تحقق کامل هدف (${ind.target})`}
                              className="w-full text-xs p-2 border border-slate-300 rounded-lg outline-none"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-bold text-slate-600">
                                امتیاز ارزیاب (۰ تا ۱۰۰)
                              </label>
                              <span className="text-[10px] font-bold text-emerald-700">
                                نمره موزون: {toFa(weighted)}
                              </span>
                            </div>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={currentScore}
                              onChange={e => {
                                setEvalScores({
                                  ...evalScores,
                                  [ind.id]: {
                                    actual: evalScores[ind.id]?.actual ?? '',
                                    score: Number(e.target.value)
                                  }
                                });
                              }}
                              className="w-full text-xs p-2 border border-slate-300 rounded-lg outline-none font-mono font-bold text-center"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Qualitative Feedback */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    بازخورد کیفی، نقاط قوت و توصیه‌های مدیریتی برای دوره بعدی
                  </label>
                  <VoiceInputButton onTranscript={(t) => setEvalFeedback(prev => prev ? `${prev} ${t}` : t)} />
                </div>
                <textarea
                  rows={3}
                  value={evalFeedback}
                  onChange={e => setEvalFeedback(e.target.value)}
                  placeholder="توضیحات عملکرد کارمند، تقدیر از اقدامات ویژه یا لزوم شرکت در دوره‌های تکمیلی..."
                  className="w-full text-xs p-3 border border-slate-300 rounded-lg outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">نقاط قوت کلیدی در این دوره</label>
                    <VoiceInputButton onTranscript={(t) => setEvalKeyStrengths(prev => prev ? `${prev} ${t}` : t)} />
                  </div>
                  <input
                    type="text"
                    value={evalKeyStrengths}
                    onChange={e => setEvalKeyStrengths(e.target.value)}
                    placeholder="مثال: دقت فنی بالا در طراحی هیدرولیک..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">فرصت‌های رشد و برنامه توسعه فردی (IDP)</label>
                    <VoiceInputButton onTranscript={(t) => setEvalImprovementAreas(prev => prev ? `${prev} ${t}` : t)} />
                  </div>
                  <input
                    type="text"
                    value={evalImprovementAreas}
                    onChange={e => setEvalImprovementAreas(e.target.value)}
                    placeholder="مثال: آشنایی بیشتر با ضوابط جدید ممیزی انرژی..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-500">
                ارزیاب رسمی: <strong className="text-slate-800">{currentUser.name}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('cumulative')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={activeIndicatorsForEval.length === 0}
                  className="bg-[#800000] hover:bg-[#9a0000] disabled:bg-slate-300 text-white px-5 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ثبت قطعی ارزیابی و به‌روزرسانی نمره تجمعی</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. DEFINE & MANAGE INDICATORS (تعریف شاخص‌ها توسط مدیر) */}
      {/* ============================================================== */}
      {activeTab === 'indicators' && (
        <div className="space-y-6">
          {/* Create New Indicator Form */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-sm font-bold text-[#13213c] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span>تعریف شاخص کلیدی جدید برای پرسنل (KPI Definition)</span>
              </h4>
            </div>

            {/* Fast Templates Toolbar */}
            <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 space-y-2">
              <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>الگوهای آماده شاخص‌های مهندسی رابو (کلیک برای درج سریع):</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {kpiTemplates.map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setNewIndicatorForm(prev => ({
                        ...prev,
                        title: t.title,
                        category: t.category as any,
                        target: t.target,
                        weight: t.weight,
                        unit: t.unit
                      }));
                    }}
                    className="bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveIndicator} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">پرسنل مورد نظر *</label>
                  <select
                    value={newIndicatorForm.employeeId}
                    onChange={e => setNewIndicatorForm({ ...newIndicatorForm, employeeId: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none bg-white font-medium"
                  >
                    {personnelList.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان شاخص عملکردی *</label>
                  <input
                    type="text"
                    required
                    value={newIndicatorForm.title}
                    onChange={e => setNewIndicatorForm({ ...newIndicatorForm, title: e.target.value })}
                    placeholder="مثال: طراحی نقشه‌های اطفای حریق تایید سازمان"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">دسته‌بندی شاخص</label>
                  <select
                    value={newIndicatorForm.category}
                    onChange={e => setNewIndicatorForm({ ...newIndicatorForm, category: e.target.value as any })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none bg-white font-medium"
                  >
                    <option value="فنی و تخصصی">فنی و تخصصی</option>
                    <option value="فروش و بازاریابی">فروش و بازاریابی</option>
                    <option value="انضباط و کار تیمی">انضباط و کار تیمی</option>
                    <option value="سرعت و دقت">سرعت و دقت</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">هدف کمی یا کیفی مصوب *</label>
                  <input
                    type="text"
                    required
                    value={newIndicatorForm.target}
                    onChange={e => setNewIndicatorForm({ ...newIndicatorForm, target: e.target.value })}
                    placeholder="مثال: حداقل ۴ نقشه در ماه"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وزن شاخص در ارزیابی (٪)</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    step="5"
                    value={newIndicatorForm.weight}
                    onChange={e => setNewIndicatorForm({ ...newIndicatorForm, weight: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">واحد اندازه‌گیری</label>
                  <input
                    type="text"
                    value={newIndicatorForm.unit}
                    onChange={e => setNewIndicatorForm({ ...newIndicatorForm, unit: e.target.value })}
                    placeholder="درصد، ساعت، پروژه..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-[#13213c] hover:bg-[#1d325a] text-white px-5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>ثبت شاخص در شناسنامه شغلی</span>
                </button>
              </div>
            </form>
          </div>

          {/* List of Defined Indicators */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-[#13213c]">شاخص‌های تعریف‌شده در شرکت</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="p-3">پرسنل</th>
                    <th className="p-3">عنوان شاخص</th>
                    <th className="p-3">دسته‌بندی</th>
                    <th className="p-3">هدف مصوب</th>
                    <th className="p-3">وزن درصدی</th>
                    <th className="p-3">تاریخ تعریف</th>
                    <th className="p-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kpiIndicators.map(ind => (
                    <tr key={ind.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800">
                        {personnelList.find(p => p.id === ind.employeeId)?.name || 'پرسنل'}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{ind.title}</td>
                      <td className="p-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                          {ind.category}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 font-medium">{ind.target}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">{toFa(ind.weight)}٪</td>
                      <td className="p-3 text-slate-500">{ind.createdAt}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setKpiIndicators(kpiIndicators.filter(x => x.id !== ind.id));
                            setToastMessage('شاخص مورد نظر حذف گردید.');
                          }}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="حذف شاخص"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
