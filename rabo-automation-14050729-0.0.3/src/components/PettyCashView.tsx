import React, { useState, useMemo } from 'react';
import { Employee, Project } from '../types';
import { 
  Coins, 
  Plus, 
  Upload, 
  FileText, 
  Search, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Building, 
  User, 
  Tag, 
  Eye, 
  Trash2, 
  Download,
  Receipt,
  CreditCard,
  Layers,
  Clock,
  Printer,
  Lock,
  Unlock,
  Edit2,
  Check,
  X,
  FileCheck,
  ShieldCheck,
  Scale
} from 'lucide-react';
import { formatPriceFa, handleMoneyInputChange, parseRawNumber } from '../utils/numberFormat';
import { ShamsiDatePicker } from './ShamsiDatePicker';
import { getTodayShamsi, getExactShamsiTimestamp } from '../utils/jalali';

export interface PettyCashInflow {
  id: string;
  date: string;
  amount: number;
  referenceNo: string;
  custodianName: string;
  dueDateNextRefill: string;
  receiptFileName?: string;
  status: 'تایید شده' | 'در انتظار تایید حسابداری';
  notes?: string;
}

export interface PettyCashExpense {
  id: string;
  date: string;
  title: string;
  amount: number;
  category: 'اسنپ و ایاب‌ذهاب' | 'پذیرایی و جلسات' | 'خرید قطعات و ملزومات' | 'کارشناسی و مأموریت کارگاهی' | 'ملزومات اداری و چاپ' | 'سایر';
  projectId: string; // کد پروژه یا 'OTHER' برای امور عمومی
  projectName: string;
  employeeName: string;
  invoiceFileName?: string;
  paymentReceiptFileName?: string;
  description?: string;
  registeredAt: string;
  isLocked?: boolean;
  auditDate?: string;
  auditedBy?: string;
}

interface PettyCashViewProps {
  currentUser: Employee;
  projectsList: Project[];
  personnelList: Employee[];
  todayStr: string;
  setToastMessage: (msg: string) => void;
  inflows?: PettyCashInflow[];
  setInflows?: React.Dispatch<React.SetStateAction<PettyCashInflow[]>>;
  expenses?: PettyCashExpense[];
  setExpenses?: React.Dispatch<React.SetStateAction<PettyCashExpense[]>>;
}

export const PettyCashView: React.FC<PettyCashViewProps> = ({
  currentUser,
  projectsList,
  personnelList,
  todayStr,
  setToastMessage,
  inflows: propInflows,
  setInflows: propSetInflows,
  expenses: propExpenses,
  setExpenses: propSetExpenses
}) => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'inflows'>('expenses');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  // Inflows (شارژهای تنخواه)
  const [internalInflows, setInternalInflows] = useState<PettyCashInflow[]>([]);
  const inflows = propInflows ?? internalInflows;
  const setInflows = propSetInflows ?? setInternalInflows;

  // Expenses (هزینه‌کردهای تنخواه با فاکتور و رسید)
  const [internalExpenses, setInternalExpenses] = useState<PettyCashExpense[]>([]);
  const expenses = propExpenses ?? internalExpenses;
  const setExpenses = propSetExpenses ?? setInternalExpenses;

  // Custodian state (امین / تنخواه‌گردان فعال)
  const [custodianName, setCustodianName] = useState<string>(() => {
    return personnelList.find(p => p.role?.includes('مالی') || p.role?.includes('اداری'))?.name || 
           personnelList[0]?.name || 
           'مهندس رضا محمدی';
  });
  const [showCustodianModal, setShowCustodianModal] = useState(false);
  const [tempCustodianName, setTempCustodianName] = useState(custodianName);
  const [custodianCeiling, setCustodianCeiling] = useState('۵۰,۰۰۰,۰۰۰');

  // Modals state
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddInflowModal, setShowAddInflowModal] = useState(false);
  const [viewDocumentModal, setViewDocumentModal] = useState<{ title: string; invoice?: string; receipt?: string } | null>(null);
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);

  // Edit Expense State
  const [editingExpense, setEditingExpense] = useState<PettyCashExpense | null>(null);
  const [editExpenseForm, setEditExpenseForm] = useState({
    title: '',
    amountRaw: '',
    category: 'اسنپ و ایاب‌ذهاب' as PettyCashExpense['category'],
    projectId: 'OTHER',
    employeeName: '',
    date: todayStr,
    description: ''
  });

  // Edit Inflow State
  const [editingInflow, setEditingInflow] = useState<PettyCashInflow | null>(null);
  const [editInflowForm, setEditInflowForm] = useState({
    amountRaw: '',
    date: todayStr,
    referenceNo: '',
    custodianName: '',
    dueDateNextRefill: todayStr,
    notes: ''
  });

  // New Expense Form
  const [newExpenseForm, setNewExpenseForm] = useState({
    title: '',
    amountRaw: '',
    category: 'اسنپ و ایاب‌ذهاب' as PettyCashExpense['category'],
    projectId: projectsList[0]?.id || 'OTHER',
    employeeName: currentUser.name,
    date: todayStr,
    description: ''
  });
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // New Inflow Form
  const [newInflowForm, setNewInflowForm] = useState({
    amountRaw: '',
    date: todayStr,
    referenceNo: '',
    custodianName: custodianName,
    dueDateNextRefill: todayStr,
    notes: ''
  });
  const [inflowReceiptFile, setInflowReceiptFile] = useState<File | null>(null);

  // Financial Calculations
  const metrics = useMemo(() => {
    const totalInflow = inflows.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalOutflow = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const remainingBalance = totalInflow - totalOutflow;
    const latestInflow = inflows[0];
    const isLowBalance = remainingBalance < (latestInflow?.amount || 10000000) * 0.2;
    const lockedExpensesCount = expenses.filter(e => e.isLocked).length;
    const pendingExpensesCount = expenses.length - lockedExpensesCount;
    const lockedTotalAmount = expenses.filter(e => e.isLocked).reduce((acc, curr) => acc + curr.amount, 0);

    return {
      totalInflow,
      totalOutflow,
      remainingBalance,
      isLowBalance,
      nextDueDate: latestInflow?.dueDateNextRefill || '۱۴۰۵/۰۷/۲۰',
      totalExpensesCount: expenses.length,
      totalInflowsCount: inflows.length,
      lockedExpensesCount,
      pendingExpensesCount,
      lockedTotalAmount
    };
  }, [inflows, expenses]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchCat = categoryFilter === 'all' || e.category === categoryFilter;
      const matchProj = projectFilter === 'all' || e.projectId === projectFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchQ = !q || 
        e.title.toLowerCase().includes(q) || 
        e.employeeName.toLowerCase().includes(q) || 
        e.projectName.toLowerCase().includes(q) ||
        e.projectId.toLowerCase().includes(q);
      return matchCat && matchProj && matchQ;
    });
  }, [expenses, categoryFilter, projectFilter, searchQuery]);

  // Submit Expense
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseRawNumber(newExpenseForm.amountRaw);
    if (amount <= 0) {
      setToastMessage('خطا: لطفاً مبلغ معتبر هزینه را وارد فرمایید.');
      return;
    }
    if (!newExpenseForm.title.trim()) {
      setToastMessage('خطا: لطفاً علت خرید و شرح هزینه را وارد نمایید.');
      return;
    }

    const proj = projectsList.find(p => p.id === newExpenseForm.projectId);
    const projectName = newExpenseForm.projectId === 'OTHER' 
      ? 'امور جاری و عمومی شرکت (سایر)' 
      : (proj?.name || 'پروژه مرتبط');

    const newExp: PettyCashExpense = {
      id: `EXP-${Date.now().toString().slice(-4)}`,
      title: newExpenseForm.title.trim(),
      amount,
      category: newExpenseForm.category,
      projectId: newExpenseForm.projectId,
      projectName,
      employeeName: newExpenseForm.employeeName,
      date: newExpenseForm.date,
      description: newExpenseForm.description.trim(),
      invoiceFileName: invoiceFile ? invoiceFile.name : `Faktor_${Date.now().toString().slice(-4)}.pdf`,
      paymentReceiptFileName: receiptFile ? receiptFile.name : `Resid_${Date.now().toString().slice(-4)}.jpg`,
      registeredAt: getExactShamsiTimestamp()
    };

    setExpenses([newExp, ...expenses]);
    setShowAddExpenseModal(false);
    setNewExpenseForm({
      title: '',
      amountRaw: '',
      category: 'اسنپ و ایاب‌ذهاب',
      projectId: projectsList[0]?.id || 'OTHER',
      employeeName: currentUser.name,
      date: todayStr,
      description: ''
    });
    setInvoiceFile(null);
    setReceiptFile(null);
    setToastMessage(`سند هزینه تنخواه به مبلغ ${formatPriceFa(amount)} تومان با موفقیت ثبت شد.`);
  };

  // Submit Edit Expense
  const handleUpdateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    if (editingExpense.isLocked) {
      setToastMessage('این سند مختومه و قفل شده است و امکان ویرایش آن وجود ندارد.');
      return;
    }

    const amount = parseRawNumber(editExpenseForm.amountRaw);
    if (amount <= 0) {
      setToastMessage('خطا: لطفاً مبلغ معتبر را وارد فرمایید.');
      return;
    }

    const proj = projectsList.find(p => p.id === editExpenseForm.projectId);
    const projectName = editExpenseForm.projectId === 'OTHER' 
      ? 'امور جاری و عمومی شرکت (سایر)' 
      : (proj?.name || 'پروژه مرتبط');

    setExpenses(prev => prev.map(exp => {
      if (exp.id === editingExpense.id) {
        return {
          ...exp,
          title: editExpenseForm.title.trim(),
          amount,
          category: editExpenseForm.category,
          projectId: editExpenseForm.projectId,
          projectName,
          employeeName: editExpenseForm.employeeName,
          date: editExpenseForm.date,
          description: editExpenseForm.description.trim()
        };
      }
      return exp;
    }));

    setEditingExpense(null);
    setToastMessage(`سند ${editingExpense.id} با موفقیت ویرایش شد.`);
  };

  // Delete Expense
  const handleDeleteExpense = (id: string, isLocked?: boolean) => {
    if (isLocked) {
      setToastMessage('این سند رسیدگی و مختومه شده و قابل حذف نمی‌باشد.');
      return;
    }
    setExpenses(prev => prev.filter(e => e.id !== id));
    setToastMessage(`سند هزینه ${id} با موفقیت حذف گردید.`);
  };

  // Lock / Audit Expense (مدیریت مالی)
  const handleLockExpense = (id: string) => {
    if (!currentUser.isManager) {
      setToastMessage('فقط مدیران ارشد مجاز به رسیدگی مالی و بستن سند هستند.');
      return;
    }

    setExpenses(prev => prev.map(exp => {
      if (exp.id === id) {
        return {
          ...exp,
          isLocked: true,
          auditDate: todayStr,
          auditedBy: currentUser.name
        };
      }
      return exp;
    }));

    setToastMessage(`سند ${id} توسط ${currentUser.name} رسیدگی مالی شد و با موفقیت قفل و مختومه گردید.`);
  };

  // Submit Inflow
  const handleSaveInflow = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseRawNumber(newInflowForm.amountRaw);
    if (amount <= 0) {
      setToastMessage('خطا: لطفاً مبلغ معتبر شارژ تنخواه را وارد فرمایید.');
      return;
    }

    const newInf: PettyCashInflow = {
      id: `INF-${Date.now().toString().slice(-4)}`,
      amount,
      date: newInflowForm.date,
      referenceNo: newInflowForm.referenceNo || `TR-${Math.floor(10000000 + Math.random() * 90000000)}`,
      custodianName: newInflowForm.custodianName || custodianName,
      dueDateNextRefill: newInflowForm.dueDateNextRefill,
      receiptFileName: inflowReceiptFile ? inflowReceiptFile.name : `Fish_Varizi_${Date.now().toString().slice(-4)}.pdf`,
      status: 'تایید شده',
      notes: newInflowForm.notes
    };

    setInflows([newInf, ...inflows]);
    setShowAddInflowModal(false);
    setNewInflowForm({
      amountRaw: '',
      date: todayStr,
      referenceNo: '',
      custodianName: custodianName,
      dueDateNextRefill: todayStr,
      notes: ''
    });
    setInflowReceiptFile(null);
    setToastMessage(`فیش واریزی شارژ تنخواه به مبلغ ${formatPriceFa(amount)} تومان با موفقیت ثبت گردید.`);
  };

  // Delete Inflow
  const handleDeleteInflow = (id: string) => {
    if (!currentUser.isManager) {
      setToastMessage('تنها مدیران ارشد مجاز به حذف اسناد واریزی تنخواه هستند.');
      return;
    }
    setInflows(prev => prev.filter(i => i.id !== id));
    setToastMessage(`سند شارژ تنخواه ${id} حذف شد.`);
  };

  // Print Reconciliation Report (A4)
  const handlePrintReconciliation = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      setToastMessage('لطفاً پنجره‌های بازشو (Popups) را در مرورگر فعال فرمایید.');
      return;
    }

    const categoryBreakdown = expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>گزارش تراز مالی و صورت مغایرت تنخواه - شرکت مهندسی رابو</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body {
            font-family: 'IRANSansWeb', 'IRANSans', Tahoma, sans-serif;
            margin: 0;
            padding: 10px;
            color: #1e293b;
            font-size: 11pt;
            direction: rtl;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #13213c;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .company-title { font-size: 16pt; font-weight: bold; color: #13213c; }
          .report-title { font-size: 13pt; font-weight: bold; color: #800000; margin-top: 4px; }
          .meta-box { font-size: 9.5pt; text-align: left; }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 20px;
          }
          .card {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 10px;
            background: #f8fafc;
            text-align: center;
          }
          .card-title { font-size: 9pt; color: #64748b; margin-bottom: 4px; }
          .card-value { font-size: 13pt; font-weight: bold; color: #0f172a; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 9.5pt;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            text-align: right;
          }
          th { background: #13213c; color: white; }
          .text-left { text-align: left; }
          .signature-area {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            page-break-inside: avoid;
          }
          .sig-box {
            text-align: center;
            width: 28%;
            border-top: 1px dashed #94a3b8;
            padding-top: 8px;
            font-size: 10pt;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-title">شرکت مهندسی ایمنی و حریق رابو</div>
            <div class="report-title">صورت تراز جامع و مغایرت‌گیری صندوق تنخواه‌گردان</div>
          </div>
          <div class="meta-box">
            <div>تاریخ استخراج: ${todayStr}</div>
            <div>تنخواه‌گردان مسئول: ${custodianName}</div>
            <div>ثبت‌کننده گزارش: ${currentUser.name} (${currentUser.role})</div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="card">
            <div class="card-title">کل شارژ و واریزی‌های صندوق</div>
            <div class="card-value" style="color: #059669;">${formatPriceFa(metrics.totalInflow)} تومان</div>
          </div>
          <div class="card">
            <div class="card-title">کل هزینه‌کرد و فاکتورها</div>
            <div class="card-value" style="color: #e11d48;">${formatPriceFa(metrics.totalOutflow)} تومان</div>
          </div>
          <div class="card">
            <div class="card-title">مانده ریالی نقدی نزد تنخواه‌دار</div>
            <div class="card-value" style="color: #13213c;">${formatPriceFa(metrics.remainingBalance)} تومان</div>
          </div>
        </div>

        <h4 style="margin-bottom: 8px; font-size: 11pt; color: #13213c;">جدول تفکیک مصارف تنخواه بر حسب سرفصل هزینه:</h4>
        <table>
          <thead>
            <tr>
              <th>سرفصل هزینه</th>
              <th class="text-left">مجموع مبلغ (تومان)</th>
              <th class="text-left">سهم از کل مصارف</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(categoryBreakdown).map(([cat, amt]) => `
              <tr>
                <td>${cat}</td>
                <td class="text-left">${formatPriceFa(amt)}</td>
                <td class="text-left">${metrics.totalOutflow > 0 ? ((amt / metrics.totalOutflow) * 100).toFixed(1) : 0}٪</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h4 style="margin-bottom: 8px; font-size: 11pt; color: #13213c;">وضعیت اسناد و رسیدگی مالی:</h4>
        <div style="background: #f1f5f9; padding: 10px; border-radius: 8px; margin-bottom: 20px; font-size: 10pt;">
          <div>• تعداد کل اسناد هزینه: <strong>${metrics.totalExpensesCount} سند</strong></div>
          <div>• اسناد بررسی و مختومه‌شده مالی (قفل): <strong>${metrics.lockedExpensesCount} سند (${formatPriceFa(metrics.lockedTotalAmount)} تومان)</strong></div>
          <div>• اسناد در جریان بررسی: <strong>${metrics.pendingExpensesCount} سند</strong></div>
          <div>• وضعیت تطابق نهایی: <strong style="color: #059669;">تراز ریالی بدون مغایرت مورد تأیید حسابداری</strong></div>
        </div>

        <div class="signature-area">
          <div class="sig-box">
            <strong>امین تنخواه‌گردان</strong><br/>
            ${custodianName}<br/>
            (امضاء و تاریخ)
          </div>
          <div class="sig-box">
            <strong>مدیر امور مالی و حسابداری</strong><br/>
            واحد مالی شرکت رابو<br/>
            (امضاء و مهر)
          </div>
          <div class="sig-box">
            <strong>مدیرعامل / ریاست هیئت‌مدیره</strong><br/>
            تأیید نهایی اسناد<br/>
            (امضاء و تاریخ)
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // Download Simulated Attachment File
  const handleDownloadAttachment = (filename?: string, title?: string) => {
    if (!filename) return;
    const blob = new Blob([`سند مالی و مدرک پیوست مربوط به: ${title || 'تنخواه'} - شرکت مهندسی رابو`], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setToastMessage(`فایل «${filename}» با موفقیت دانلود شد.`);
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-xs">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#13213c] flex items-center gap-2">
              سامانه جامع تنخواه گردان، فیش‌های واریزی و فاکتورهای مالی رابو
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              مدیریت ثبت فاکتورها، رسیدگی و بستن مالی اسناد، کنترل مانده ریالی، ترازگیری و گزارش رسمی تنخواه‌دار
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* دکمه ترازگیری و مغایرت‌گیری */}
          <button
            type="button"
            onClick={() => setShowReconciliationModal(true)}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="صورت ترازگیری و مغایرت مالی تنخواه"
          >
            <Scale className="w-4 h-4 text-emerald-200" />
            <span>ترازگیری و مغایرت‌گیری</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddExpenseModal(true)}
            className="flex items-center gap-1.5 bg-[#800000] hover:bg-[#9a0000] text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت هزینه تنخواه (با فاکتور)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddInflowModal(true)}
            className="flex items-center gap-1.5 bg-[#13213c] hover:bg-[#1e345b] text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>ثبت فیش واریزی شارژ</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance Card */}
        <div className={`rounded-xl p-4 border shadow-xs ${
          metrics.isLowBalance 
            ? 'bg-rose-50/80 border-rose-200 text-rose-950' 
            : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold">مانده موجودی تنخواه:</span>
            {metrics.isLowBalance ? (
              <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-bold">نیاز به شارژ</span>
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div className="text-xl font-black font-mono mt-1">
            {formatPriceFa(metrics.remainingBalance)}
            <span className="text-xs font-sans font-normal mr-1">تومان</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>وضعیت نقدینگی صندوق:</span>
            <span className="font-bold">{metrics.isLowBalance ? 'کمتر از حد نصاب' : 'مطلوب و آماده'}</span>
          </div>
        </div>

        {/* Total Inflows */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">کل شارژ و واریزی‌ها</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-slate-900 font-mono">
            {formatPriceFa(metrics.totalInflow)}
            <span className="text-[10px] font-sans font-normal text-slate-500 mr-1">تومان</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>تعداد فیش‌های شارژ:</span>
            <span className="font-bold font-mono text-slate-700">{metrics.totalInflowsCount} سند</span>
          </div>
        </div>

        {/* Total Outflows & Locked Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">کل هزینه‌کرد و فاکتورها</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-lg font-black text-slate-900 font-mono">
            {formatPriceFa(metrics.totalOutflow)}
            <span className="text-[10px] font-sans font-normal text-slate-500 mr-1">تومان</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>اسناد رسیدگی‌شده (قفل):</span>
            <span className="font-bold font-mono text-emerald-700">{metrics.lockedExpensesCount} از {metrics.totalExpensesCount}</span>
          </div>
        </div>

        {/* Custodian & Refill Due Date */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold">امین و مسئول تنخواه:</span>
              <button
                type="button"
                onClick={() => {
                  setTempCustodianName(custodianName);
                  setShowCustodianModal(true);
                }}
                className="text-[10px] text-blue-700 font-bold hover:underline cursor-pointer"
                title="تغییر مسئول تنخواه‌گردان"
              >
                تغییر امین
              </button>
            </div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-1">
              <User className="w-4 h-4 text-amber-500" />
              <span>{custodianName}</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>سررسید شارژ بعدی:</span>
            <span className="font-bold font-mono text-amber-800">{metrics.nextDueDate}</span>
          </div>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Main Tabs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('expenses')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'expenses'
                  ? 'bg-[#13213c] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>فاکتورها و هزینه‌های تنخواه ({expenses.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('inflows')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'inflows'
                  ? 'bg-[#13213c] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>فیش‌های واریزی و شارژ صندوق ({inflows.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="جستجو در شرح، خریدار، پروژه..."
              className="w-full pl-3 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white"
            />
          </div>
        </div>

        {/* Filter Bar (Only for expenses) */}
        {activeTab === 'expenses' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500 font-bold shrink-0">دسته‌بندی هزینه:</span>
              {[
                { id: 'all', label: 'همه' },
                { id: 'اسنپ و ایاب‌ذهاب', label: 'اسنپ و مأموریت' },
                { id: 'خرید قطعات و ملزومات', label: 'قطعات و ابزار' },
                { id: 'پذیرایی و جلسات', label: 'پذیرایی و جلسه' },
                { id: 'ملزومات اداری و چاپ', label: 'اداری و چاپ' }
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    categoryFilter === cat.id
                      ? 'bg-amber-100 text-amber-950 font-bold border border-amber-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold shrink-0">پروژه:</span>
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className="text-xs p-1.5 border border-slate-200 rounded-lg outline-none bg-white font-medium"
              >
                <option value="all">همه پروژه‌ها و امور جاری</option>
                <option value="OTHER">امور جاری شرکت (سایر)</option>
                {projectsList.map(p => (
                  <option key={p.id} value={p.id}>[{p.id}] {p.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          TABLE 1: EXPENSES (هزینه‌ها و فاکتورهای تنخواه)
      ======================================================== */}
      {activeTab === 'expenses' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">کد سند</th>
                  <th className="py-2.5 px-3">علت خرید و شرح هزینه</th>
                  <th className="py-2.5 px-3">پروژه مرتبط</th>
                  <th className="py-2.5 px-3">دسته‌بندی</th>
                  <th className="py-2.5 px-3">مبلغ هزینه (تومان)</th>
                  <th className="py-2.5 px-3">تاریخ</th>
                  <th className="py-2.5 px-3">خریدار / کارمند</th>
                  <th className="py-2.5 px-3 text-center">وضعیت رسیدگی</th>
                  <th className="py-2.5 px-3 text-center">مدارک و فاکتورها</th>
                  <th className="py-2.5 px-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      هیچ سند هزینه‌ای منطبق با جستجو یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-600">{exp.id}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{exp.title}</div>
                        {exp.description && (
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">{exp.description}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-medium ${
                          exp.projectId === 'OTHER'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                          {exp.projectId === 'OTHER' ? 'امور جاری شرکت' : `[${exp.projectId}] ${exp.projectName}`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10.5px]">{exp.category}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-black text-rose-700">
                        {formatPriceFa(exp.amount)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{exp.date}</td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">{exp.employeeName}</td>

                      {/* وضعیت رسیدگی و قفل */}
                      <td className="py-2.5 px-3 text-center">
                        {exp.isLocked ? (
                          <span 
                            className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10.5px] font-bold"
                            title={`رسیدگی‌شده توسط ${exp.auditedBy || 'مدیریت مالی'} در تاریخ ${exp.auditDate || '-'}`}
                          >
                            <Lock className="w-3 h-3 text-emerald-700" />
                            <span>مختومه 🔒</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10.5px] font-bold">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>در انتظار رسیدگی</span>
                          </span>
                        )}
                      </td>

                      {/* فاکتور و رسید */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setViewDocumentModal({
                            title: exp.title,
                            invoice: exp.invoiceFileName,
                            receipt: exp.paymentReceiptFileName
                          })}
                          className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-amber-600" />
                          <span>فاکتور / رسید</span>
                        </button>
                      </td>

                      {/* عملیات سطر (رسیدگی، ویرایش، حذف) */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* دکمه رسیدگی مالی و بستن سند برای مدیر ارشد */}
                          {currentUser.isManager && !exp.isLocked && (
                            <button
                              type="button"
                              onClick={() => handleLockExpense(exp.id)}
                              className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                              title="رسیدگی مالی و بستن سند (قفل دائم)"
                            >
                              <ShieldCheck className="w-3 h-3 text-amber-300" />
                              <span>بستن سند</span>
                            </button>
                          )}

                          {/* دکمه ویرایش (تنها در صورت قفل نبودن) */}
                          {!exp.isLocked && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingExpense(exp);
                                setEditExpenseForm({
                                  title: exp.title,
                                  amountRaw: exp.amount.toString(),
                                  category: exp.category,
                                  projectId: exp.projectId,
                                  employeeName: exp.employeeName,
                                  date: exp.date,
                                  description: exp.description || ''
                                });
                              }}
                              className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
                              title="ویرایش هزینه"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* دکمه حذف (تنها در صورت قفل نبودن) */}
                          {!exp.isLocked && (
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(exp.id, exp.isLocked)}
                              className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                              title="حذف سند"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {exp.isLocked && (
                            <span className="text-[10.5px] text-slate-400 italic font-mono">
                              بسته شده
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TABLE 2: INFLOWS (فیش‌های واریزی و شارژ صندوق)
      ======================================================== */}
      {activeTab === 'inflows' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">کد شارژ</th>
                  <th className="py-2.5 px-3">تاریخ واریز</th>
                  <th className="py-2.5 px-3">مبلغ شارژ تنخواه</th>
                  <th className="py-2.5 px-3">شماره پیگیری فیش</th>
                  <th className="py-2.5 px-3">تنخواه‌دار</th>
                  <th className="py-2.5 px-3">موعد شارژ بعدی</th>
                  <th className="py-2.5 px-3">وضعیت حسابداری</th>
                  <th className="py-2.5 px-3 text-center">تصویر فیش بانکی</th>
                  <th className="py-2.5 px-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inflows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      هیچ فیش واریزی در سامانه ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  inflows.map(inf => (
                    <tr key={inf.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-600">{inf.id}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{inf.date}</td>
                      <td className="py-2.5 px-3 font-mono font-black text-emerald-700">
                        {formatPriceFa(inf.amount)} تومان
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{inf.referenceNo}</td>
                      <td className="py-2.5 px-3 text-slate-800 font-medium">{inf.custodianName}</td>
                      <td className="py-2.5 px-3 font-mono text-amber-700 font-bold">{inf.dueDateNextRefill}</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10.5px] font-bold">
                          {inf.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setViewDocumentModal({
                            title: `فیش واریزی شارژ تنخواه (${inf.referenceNo})`,
                            receipt: inf.receiptFileName
                          })}
                          className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-slate-600" />
                          <span>مشاهده فیش</span>
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {currentUser.isManager && (
                          <button
                            type="button"
                            onClick={() => handleDeleteInflow(inf.id)}
                            className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                            title="حذف فیش شارژ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 1: ADD EXPENSE
      ======================================================== */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 bg-[#13213c]/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#13213c] text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span>ثبت هزینه جدید در تنخواه و الحاق فاکتور</span>
              </h3>
              <button type="button" onClick={() => setShowAddExpenseModal(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveExpense} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">شرح و علت خرید / خدمت *</label>
                <input
                  type="text"
                  required
                  value={newExpenseForm.title}
                  onChange={e => setNewExpenseForm({ ...newExpenseForm, title: e.target.value })}
                  placeholder="مثال: هزینه اسنپ مأموریت بازدید کارگاهی پروژه الهیه"
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">مبلغ هزینه (تومان) *</label>
                  <input
                    type="text"
                    required
                    value={newExpenseForm.amountRaw ? formatPriceFa(parseRawNumber(newExpenseForm.amountRaw)) : ''}
                    onChange={e => setNewExpenseForm({ ...newExpenseForm, amountRaw: handleMoneyInputChange(e.target.value) })}
                    placeholder="مبلغ به تومان"
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-mono font-bold text-rose-700 text-left dir-ltr"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">دسته‌بندی سرفصل</label>
                  <select
                    value={newExpenseForm.category}
                    onChange={e => setNewExpenseForm({ ...newExpenseForm, category: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none bg-white font-medium"
                  >
                    <option value="اسنپ و ایاب‌ذهاب">اسنپ و ایاب‌ذهاب</option>
                    <option value="خرید قطعات و ملزومات">خرید قطعات و ملزومات</option>
                    <option value="پذیرایی و جلسات">پذیرایی و جلسات</option>
                    <option value="کارشناسی و مأموریت کارگاهی">کارشناسی و مأموریت کارگاهی</option>
                    <option value="ملزومات اداری و چاپ">ملزومات اداری و چاپ</option>
                    <option value="سایر">سایر</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">پروژه مرتبط</label>
                  <select
                    value={newExpenseForm.projectId}
                    onChange={e => setNewExpenseForm({ ...newExpenseForm, projectId: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none bg-white"
                  >
                    <option value="OTHER">امور جاری شرکت (سایر)</option>
                    {projectsList.map(p => (
                      <option key={p.id} value={p.id}>[{p.id}] {p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">خریدار / اقدام‌کننده</label>
                  <select
                    value={newExpenseForm.employeeName}
                    onChange={e => setNewExpenseForm({ ...newExpenseForm, employeeName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none bg-white font-medium"
                  >
                    {personnelList.map(p => (
                      <option key={p.id} value={p.name}>{p.name} ({p.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">تاریخ پرداخت</label>
                <ShamsiDatePicker
                  value={newExpenseForm.date}
                  onChange={d => setNewExpenseForm({ ...newExpenseForm, date: d })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تصویر یا PDF فاکتور خرید</label>
                  <input
                    type="file"
                    onChange={e => setInvoiceFile(e.target.files?.[0] || null)}
                    className="w-full text-[11px] p-2 border border-dashed border-slate-300 rounded-xl bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رسید پوز یا فیش پرداخت</label>
                  <input
                    type="file"
                    onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                    className="w-full text-[11px] p-2 border border-dashed border-slate-300 rounded-xl bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddExpenseModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 font-bold cursor-pointer">انصراف</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#800000] text-white font-bold cursor-pointer">ثبت قطعی در تنخواه</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: EDIT EXPENSE
      ======================================================== */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 bg-[#13213c]/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#13213c] text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <span>ویرایش سند هزینه تنخواه ({editingExpense.id})</span>
              </h3>
              <button type="button" onClick={() => setEditingExpense(null)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleUpdateExpense} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">شرح و علت خرید / خدمت *</label>
                <input
                  type="text"
                  required
                  value={editExpenseForm.title}
                  onChange={e => setEditExpenseForm({ ...editExpenseForm, title: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">مبلغ هزینه (تومان) *</label>
                  <input
                    type="text"
                    required
                    value={editExpenseForm.amountRaw ? formatPriceFa(parseRawNumber(editExpenseForm.amountRaw)) : ''}
                    onChange={e => setEditExpenseForm({ ...editExpenseForm, amountRaw: handleMoneyInputChange(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-mono font-bold text-rose-700 text-left dir-ltr"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">دسته‌بندی سرفصل</label>
                  <select
                    value={editExpenseForm.category}
                    onChange={e => setEditExpenseForm({ ...editExpenseForm, category: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none bg-white font-medium"
                  >
                    <option value="اسنپ و ایاب‌ذهاب">اسنپ و ایاب‌ذهاب</option>
                    <option value="خرید قطعات و ملزومات">خرید قطعات و ملزومات</option>
                    <option value="پذیرایی و جلسات">پذیرایی و جلسات</option>
                    <option value="کارشناسی و مأموریت کارگاهی">کارشناسی و مأموریت کارگاهی</option>
                    <option value="ملزومات اداری و چاپ">ملزومات اداری و چاپ</option>
                    <option value="سایر">سایر</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">پروژه مرتبط</label>
                  <select
                    value={editExpenseForm.projectId}
                    onChange={e => setEditExpenseForm({ ...editExpenseForm, projectId: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none bg-white"
                  >
                    <option value="OTHER">امور جاری شرکت (سایر)</option>
                    {projectsList.map(p => (
                      <option key={p.id} value={p.id}>[{p.id}] {p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">خریدار / اقدام‌کننده</label>
                  <select
                    value={editExpenseForm.employeeName}
                    onChange={e => setEditExpenseForm({ ...editExpenseForm, employeeName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none bg-white font-medium"
                  >
                    {personnelList.map(p => (
                      <option key={p.id} value={p.name}>{p.name} ({p.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">توضیحات تکمیلی</label>
                <textarea
                  rows={2}
                  value={editExpenseForm.description}
                  onChange={e => setEditExpenseForm({ ...editExpenseForm, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setEditingExpense(null)} className="px-4 py-2 rounded-xl bg-slate-100 font-bold cursor-pointer">انصراف</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#13213c] text-white font-bold cursor-pointer">ذخیره تغییرات</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: ADD INFLOW (شارژ تنخواه)
      ======================================================== */}
      {showAddInflowModal && (
        <div className="fixed inset-0 z-50 bg-[#13213c]/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#13213c] text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>ثبت فیش واریزی و شارژ موجودی تنخواه</span>
              </h3>
              <button type="button" onClick={() => setShowAddInflowModal(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveInflow} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">مبلغ واریزی به حساب تنخواه‌گردان (تومان) *</label>
                <input
                  type="text"
                  required
                  value={newInflowForm.amountRaw ? formatPriceFa(parseRawNumber(newInflowForm.amountRaw)) : ''}
                  onChange={e => setNewInflowForm({ ...newInflowForm, amountRaw: handleMoneyInputChange(e.target.value) })}
                  placeholder="مثال: ۱۰,۰۰۰,۰۰۰"
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-mono font-bold text-emerald-700 text-left dir-ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاریخ واریز</label>
                  <ShamsiDatePicker
                    value={newInflowForm.date}
                    onChange={d => setNewInflowForm({ ...newInflowForm, date: d })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">شماره پیگیری فیش</label>
                  <input
                    type="text"
                    value={newInflowForm.referenceNo}
                    onChange={e => setNewInflowForm({ ...newInflowForm, referenceNo: e.target.value })}
                    placeholder="TR-88291039"
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">امین تنخواه‌دار</label>
                  <select
                    value={newInflowForm.custodianName}
                    onChange={e => setNewInflowForm({ ...newInflowForm, custodianName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none bg-white font-medium"
                  >
                    {personnelList.map(p => (
                      <option key={p.id} value={p.name}>{p.name} ({p.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">موعد شارژ بعدی</label>
                  <ShamsiDatePicker
                    value={newInflowForm.dueDateNextRefill}
                    onChange={d => setNewInflowForm({ ...newInflowForm, dueDateNextRefill: d })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-mono text-amber-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">بارگذاری تصویر فیش بانکی یا رسید پایا</label>
                <input
                  type="file"
                  onChange={e => setInflowReceiptFile(e.target.files?.[0] || null)}
                  className="w-full text-[11px] p-2 border border-dashed border-slate-300 rounded-xl bg-slate-50"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddInflowModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 font-bold cursor-pointer">انصراف</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#13213c] text-white font-bold cursor-pointer">ثبت شارژ صندوق</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: CUSTODIAN MANAGEMENT (مدیریت تنخواه‌گردان)
      ======================================================== */}
      {showCustodianModal && (
        <div className="fixed inset-0 z-50 bg-[#13213c]/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#13213c] text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                <span>تعیین و مدیریت امین تنخواه‌گردان شرکت</span>
              </h3>
              <button type="button" onClick={() => setShowCustodianModal(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">انتخاب مسئول و امین تنخواه از کادر پرسنلی</label>
                <select
                  value={tempCustodianName}
                  onChange={e => setTempCustodianName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none bg-white font-bold"
                >
                  {personnelList.map(p => (
                    <option key={p.id} value={p.name}>{p.name} ({p.role})</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  شخص تعیین‌شده مسئول حفظ اسناد، واریز مبالغ شارژ و پاسخگویی تراز نقدی است.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">سقف اعتبار ریالی مجاز تنخواه (تومان)</label>
                <input
                  type="text"
                  value={custodianCeiling}
                  onChange={e => setCustodianCeiling(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-mono font-bold"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-950 space-y-1">
                <div className="font-bold">تعهدات و ضمانت‌های تنخواه‌دار:</div>
                <div className="text-[11px] text-amber-800">
                  تضمین حسن انجام کار و سفته متناسب با سقف تنخواه در پرونده پرسنلی ثبت شده است.
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowCustodianModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 font-bold cursor-pointer">انصراف</button>
                <button
                  type="button"
                  onClick={() => {
                    setCustodianName(tempCustodianName);
                    setShowCustodianModal(false);
                    setToastMessage(`امین تنخواه‌گردان به «${tempCustodianName}» تغییر یافت.`);
                  }}
                  className="px-5 py-2 rounded-xl bg-[#13213c] text-white font-bold cursor-pointer"
                >
                  ذخیره و تایید مسئول
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 5: RECONCILIATION & BALANCE SUMMARY (ترازگیری)
      ======================================================== */}
      {showReconciliationModal && (
        <div className="fixed inset-0 z-50 bg-[#13213c]/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="bg-[#13213c] text-white p-4 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <span>صورت تراز جامع و مغایرت‌گیری صندوق تنخواه (Reconciliation)</span>
              </h3>
              <button type="button" onClick={() => setShowReconciliationModal(false)} className="text-white/70 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-5 text-xs overflow-y-auto">
              {/* Header Box */}
              <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <div className="font-bold text-slate-800 text-sm">شرکت مهندسی ایمنی و حریق رابو</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">صورت تراز مقطعی حساب تنخواه‌گردان | تاریخ: {todayStr}</div>
                </div>
                <div className="text-left font-mono">
                  <div className="text-[11px] text-slate-500">امین تنخواه:</div>
                  <div className="font-bold text-slate-800">{custodianName}</div>
                </div>
              </div>

              {/* 3 Main Figures */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <div className="text-emerald-800 text-[11px]">مجموع شارژهای دریافتی</div>
                  <div className="text-base font-black font-mono text-emerald-950 mt-1">{formatPriceFa(metrics.totalInflow)}</div>
                  <div className="text-[10px] text-emerald-700">تومان</div>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                  <div className="text-rose-800 text-[11px]">مجموع هزینه‌کرد و فاکتورها</div>
                  <div className="text-base font-black font-mono text-rose-950 mt-1">{formatPriceFa(metrics.totalOutflow)}</div>
                  <div className="text-[10px] text-rose-700">تومان</div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
                  <div className="text-blue-800 text-[11px]">مانده نقدی تنخواه‌دار</div>
                  <div className="text-base font-black font-mono text-blue-950 mt-1">{formatPriceFa(metrics.remainingBalance)}</div>
                  <div className="text-[10px] text-blue-700">تومان</div>
                </div>
              </div>

              {/* Audit Status */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span>وضعیت اسناد و رسیدگی مالی:</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10.5px]">
                    تراز حسابداری کامل
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px] pt-1">
                  <div>• اسناد مختومه و قفل‌شده: <strong>{metrics.lockedExpensesCount} مورد ({formatPriceFa(metrics.lockedTotalAmount)} تومان)</strong></div>
                  <div>• اسناد در انتظار رسیدگی مالی: <strong>{metrics.pendingExpensesCount} مورد</strong></div>
                  <div>• تعداد کل فیش‌های شارژ بانکی: <strong>{metrics.totalInflowsCount} سند</strong></div>
                  <div>• مغایرت یا کسری موجودی: <strong className="text-emerald-700">صفر (مطابق دفاتر مالی)</strong></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                <button
                  type="button"
                  onClick={handlePrintReconciliation}
                  className="flex items-center gap-1.5 bg-[#13213c] hover:bg-[#1f355c] text-white px-4 py-2.5 rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>چاپ / خروجی گزارش تراز تنخواه (PDF A4)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowReconciliationModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold cursor-pointer"
                >
                  بستن پنجره
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 6: VIEW ATTACHMENT / INVOICE
      ======================================================== */}
      {viewDocumentModal && (
        <div className="fixed inset-0 z-50 bg-[#13213c]/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#13213c] text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm truncate max-w-[320px]">{viewDocumentModal.title}</h3>
              <button type="button" onClick={() => setViewDocumentModal(null)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              {viewDocumentModal.invoice && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-600" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">فاکتور رسمی خرید:</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{viewDocumentModal.invoice}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadAttachment(viewDocumentModal.invoice, viewDocumentModal.title)}
                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
                    title="دانلود فاکتور"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              )}

              {viewDocumentModal.receipt && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">رسید پرداخت / فیش بانکی:</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{viewDocumentModal.receipt}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadAttachment(viewDocumentModal.receipt, viewDocumentModal.title)}
                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
                    title="دانلود رسید"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setViewDocumentModal(null)}
                  className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                >
                  بستن پنجره
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
