import React, { useState } from 'react';
import { 
  Project, 
  Employee, 
  ReceivedLetter, 
  SentLetter, 
  ProjectExpense, 
  ProjectTaskItem, 
  ProjectDocumentItem, 
  ProjectCallItem, 
  ProjectMilestoneItem 
} from '../../types';
import { 
  X, 
  Building2, 
  User, 
  Users, 
  Calendar, 
  Clock, 
  Phone, 
  MapPin, 
  Coins, 
  Car, 
  FileText, 
  CheckSquare, 
  Paperclip, 
  PhoneCall, 
  GitBranch, 
  ExternalLink, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  Award,
  Sparkles,
  Eye,
  Download,
  Upload,
  Trash2
} from 'lucide-react';
import { GoogleMapsLocationPicker } from '../GoogleMapsLocationPicker';
import { VoiceInputButton } from '../VoiceInputButton';
import { notifyTaskAssigned } from '../../utils/browserNotifications';

interface ProjectDetailHubProps {
  project: Project;
  onClose: () => void;
  onUpdateProject: (updated: Project) => void;
  personnelList: Employee[];
  receivedLetters: ReceivedLetter[];
  sentLetters: SentLetter[];
  todayStr: string;
  setToastMessage: (msg: string) => void;
}

export const ProjectDetailHub: React.FC<ProjectDetailHubProps> = ({
  project,
  onClose,
  onUpdateProject,
  personnelList,
  receivedLetters,
  sentLetters,
  todayStr,
  setToastMessage
}) => {
  const [activeBranch, setActiveBranch] = useState<
    'overview' | 'letters' | 'tasks' | 'finance' | 'documents' | 'calls' | 'timeline'
  >('overview');

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    category: 'اسنپ و ایاب‌ذهاب' as ProjectExpense['category'],
    employeeName: personnelList[0]?.name || 'کارشناس رابو'
  });

  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    assigneeName: personnelList[0]?.name || 'کارشناس رابو',
    dueDate: todayStr,
    notes: ''
  });

  // Call form state
  const [callForm, setCallForm] = useState({
    contactPerson: project.clientName || 'کارفرما',
    phone: project.clientPhone || '',
    summary: '',
    result: ''
  });

  // Milestone form state
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    date: todayStr,
    description: '',
    completed: true
  });

  // Document state & modal
  const [docPreviewModal, setDocPreviewModal] = useState<ProjectDocumentItem | null>(null);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [newDocForm, setNewDocForm] = useState<{
    title: string;
    category: ProjectDocumentItem['category'];
  }>({
    title: '',
    category: 'نقشه و طراحی'
  });
  const [newDocFile, setNewDocFile] = useState<File | null>(null);

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocForm.title.trim()) return;
    const sizeStr = newDocFile ? `${(newDocFile.size / (1024 * 1024)).toFixed(1)} مگابایت` : '۲.۱ مگابایت';
    const newDoc: ProjectDocumentItem = {
      id: `DOC-${Date.now()}`,
      title: newDocForm.title.trim(),
      category: newDocForm.category,
      fileName: newDocFile ? newDocFile.name : `${newDocForm.title.trim()}.pdf`,
      uploadDate: todayStr,
      fileSize: sizeStr
    };
    const updated = {
      ...project,
      documents: [newDoc, ...(project.documents || [])]
    };
    onUpdateProject(updated);
    setShowAddDocModal(false);
    setNewDocForm({ title: '', category: 'نقشه و طراحی' });
    setNewDocFile(null);
    setToastMessage(`سند «${newDoc.title}» با موفقیت به پروژه ضمیمه گردید.`);
  };

  const handleDeleteDocument = (docId: string) => {
    if (!window.confirm('آیا از حذف این مدرک فنی اطمینان دارید؟')) return;
    const updated = {
      ...project,
      documents: (project.documents || []).filter(d => d.id !== docId)
    };
    onUpdateProject(updated);
    setToastMessage('مدرک با موفقیت حذف گردید.');
    if (docPreviewModal?.id === docId) {
      setDocPreviewModal(null);
    }
  };

  // Associated letters
  const projectLettersIn = receivedLetters.filter(l => 
    l.projectId === project.id || (l.projectName && l.projectName.includes(project.name))
  );
  const projectLettersOut = sentLetters.filter(l => 
    l.projectId === project.id || (l.projectName && l.projectName.includes(project.name))
  );

  // Financial calculations
  const totalContract = Number((project.totalContractAmount || '0').replace(/[^0-9]/g, '')) || 0;
  const totalReceived = Number((project.receivedAmount || '0').replace(/[^0-9]/g, '')) || 0;
  const totalExpenses = (project.expenses || []).reduce((sum, item) => sum + item.amount, 0);
  const netProfit = totalReceived - totalExpenses;

  const calculateOutstanding = (totalStr: string, recStr: string) => {
    const total = Number((totalStr || '0').replace(/[^0-9]/g, '')) || 0;
    const rec = Number((recStr || '0').replace(/[^0-9]/g, '')) || 0;
    const diff = total - rec;
    return diff > 0 ? `${diff.toLocaleString('fa-IR')} تومان` : 'تسویه شده';
  };

  // Handlers
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(expenseForm.amount.replace(/,/g, ''));
    if (!expenseForm.title.trim() || !amountNum) {
      setToastMessage('لطفاً شرح و مبلغ هزینه را وارد کنید.');
      return;
    }

    const newExpense: ProjectExpense = {
      id: `EXP-${Date.now()}`,
      title: expenseForm.title,
      amount: amountNum,
      category: expenseForm.category,
      date: todayStr,
      employeeName: expenseForm.employeeName
    };

    const updated = {
      ...project,
      expenses: [newExpense, ...(project.expenses || [])]
    };
    onUpdateProject(updated);
    setExpenseForm({
      title: '',
      amount: '',
      category: 'اسنپ و ایاب‌ذهاب',
      employeeName: personnelList[0]?.name || 'کارشناس رابو'
    });
    setToastMessage(`هزینه «${newExpense.title}» به حساب پروژه ${project.id} ثبت شد.`);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    const newTask: ProjectTaskItem = {
      id: `TSK-${Date.now()}`,
      title: taskForm.title,
      assigneeName: taskForm.assigneeName,
      dueDate: taskForm.dueDate,
      status: 'در حال انجام',
      notes: taskForm.notes
    };

    const updated = {
      ...project,
      tasks: [newTask, ...(project.tasks || [])]
    };
    onUpdateProject(updated);

    // ارسال نوتیفیکیشن مرورگری برای انتصاب وظیفه در پروژه
    notifyTaskAssigned({
      taskTitle: newTask.title,
      assigneeName: newTask.assigneeName,
      projectName: project.name,
      dueDate: newTask.dueDate
    });

    setTaskForm({
      title: '',
      assigneeName: personnelList[0]?.name || 'کارشناس رابو',
      dueDate: todayStr,
      notes: ''
    });
    setToastMessage(`وظیفه جدید برای ${newTask.assigneeName} در پروژه ثبت شد.`);
  };

  const handleToggleTask = (taskId: string) => {
    const updatedTasks = (project.tasks || []).map(t => 
      t.id === taskId ? { ...t, status: (t.status === 'انجام شده' ? 'در حال انجام' : 'انجام شده') as any } : t
    );
    onUpdateProject({ ...project, tasks: updatedTasks });
  };

  const handleAddCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!callForm.summary.trim()) return;

    const newCall: ProjectCallItem = {
      id: `CALL-${Date.now()}`,
      date: todayStr,
      contactPerson: callForm.contactPerson,
      phone: callForm.phone,
      summary: callForm.summary,
      result: callForm.result || 'مکالمه انجام شد'
    };

    const updated = {
      ...project,
      calls: [newCall, ...(project.calls || [])]
    };
    onUpdateProject(updated);
    setCallForm({
      contactPerson: project.clientName || 'کارفرما',
      phone: project.clientPhone || '',
      summary: '',
      result: ''
    });
    setToastMessage('گزارش مکالمه با کارفرما در پرونده پروژه ثبت شد.');
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneForm.title.trim()) return;

    const newMilestone: ProjectMilestoneItem = {
      id: `M-${Date.now()}`,
      title: milestoneForm.title,
      date: milestoneForm.date,
      completed: milestoneForm.completed,
      description: milestoneForm.description
    };

    const updated = {
      ...project,
      milestones: [...(project.milestones || []), newMilestone]
    };
    onUpdateProject(updated);
    setMilestoneForm({
      title: '',
      date: todayStr,
      description: '',
      completed: true
    });
    setToastMessage('مرحله جدید به تایم‌لاین مسیر پروژه افزوده شد.');
  };

  const openInSnapp = () => {
    const lat = project.location?.lat || 35.7820;
    const lng = project.location?.lng || 51.3730;
    const destName = encodeURIComponent(project.address || project.name);
    window.open(`https://app.snapp.taxi/ride?dest_lat=${lat}&dest_lng=${lng}&dest_name=${destName}`, '_blank');
  };

  const openInBalad = () => {
    const lat = project.location?.lat || 35.7820;
    const lng = project.location?.lng || 51.3730;
    window.open(`https://balad.ir/location?latitude=${lat}&longitude=${lng}`, '_blank');
  };

  const openInNeshan = () => {
    const lat = project.location?.lat || 35.7820;
    const lng = project.location?.lng || 51.3730;
    window.open(`https://neshan.org/maps/@${lat},${lng},16z,0p`, '_blank');
  };

  const getUnitIcon = () => {
    if (project.unit === 'مهندسی حریق') return <ShieldCheck className="w-5 h-5 text-amber-400" />;
    if (project.unit === 'انرژی') return <Zap className="w-5 h-5 text-amber-400" />;
    return <Award className="w-5 h-5 text-amber-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header - ستون فقرات پروژه با کد یکتا */}
        <div className="bg-[#13213c] text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
              {getUnitIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-400 text-[#13213c] font-black text-xs px-2.5 py-0.5 rounded-md font-mono">
                  {project.id}
                </span>
                <h2 className="text-base font-black text-white">{project.name}</h2>
                <span className="bg-white/10 text-slate-200 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                  {project.unit}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
                <span>کارفرما: <strong>{project.clientName || 'تعیین‌نشده'}</strong></span>
                <span>•</span>
                <span>مدیر پروژه رابو: <strong>{project.projectManagerName || 'مهندس رضا محمدی'}</strong></span>
                <span>•</span>
                <span>پیشرفت: <strong>{project.progress || 0}٪</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Quick Dispatch Buttons for Experts */}
            <button
              type="button"
              onClick={openInSnapp}
              className="bg-[#22c55e] hover:bg-[#16a34a] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="درخواست اسنپ مستقیم برای کارشناس به مقصد پروژه"
            >
              <Car className="w-3.5 h-3.5" />
              <span>اسنپ رفتن به پروژه</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs - شاخه‌های متصل به تنه درخت پروژه */}
        <div className="bg-slate-100/80 border-b border-slate-200 px-4 flex items-center gap-1.5 overflow-x-auto text-xs font-bold py-2">
          <button
            onClick={() => setActiveBranch('overview')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeBranch === 'overview' ? 'bg-[#13213c] text-white shadow-2xs' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>شناسنامه و تیم پروژه</span>
          </button>

          <button
            onClick={() => setActiveBranch('letters')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeBranch === 'letters' ? 'bg-[#13213c] text-white shadow-2xs' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>نامه‌ها و مکاتبات ({projectLettersIn.length + projectLettersOut.length})</span>
          </button>

          <button
            onClick={() => setActiveBranch('tasks')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeBranch === 'tasks' ? 'bg-[#13213c] text-white shadow-2xs' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>وظایف و تسک‌ها ({(project.tasks || []).length})</span>
          </button>

          <button
            onClick={() => setActiveBranch('finance')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeBranch === 'finance' ? 'bg-[#13213c] text-white shadow-2xs' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>مالی و هزینه‌ها (اسنپ و خرج‌ها)</span>
          </button>

          <button
            onClick={() => setActiveBranch('documents')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeBranch === 'documents' ? 'bg-[#13213c] text-white shadow-2xs' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5 text-amber-400" />
            <span>مدارک و نقشه‌ها ({(project.documents || []).length})</span>
          </button>

          <button
            onClick={() => setActiveBranch('calls')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeBranch === 'calls' ? 'bg-[#13213c] text-white shadow-2xs' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
            <span>تماس‌ها با کارفرما ({(project.calls || []).length})</span>
          </button>

          <button
            onClick={() => setActiveBranch('timeline')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeBranch === 'timeline' ? 'bg-[#13213c] text-white shadow-2xs' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-amber-400" />
            <span>تایم‌لاین مسیر ۱ ساله (تنه درخت)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-700 flex-1">
          
          {/* TAB 1: OVERVIEW */}
          {activeBranch === 'overview' && (
            <div className="space-y-4">
              {/* خلاصه کارت وضعیت */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[11px]">شماره پرونده / پروانه:</span>
                  <strong className="text-slate-900 font-mono text-sm">{project.permitNo || project.id}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">تاریخ عقد قرارداد:</span>
                  <strong className="text-slate-900">{project.contractDate || '۱۴۰۵/۰۱/۱۵'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">وضعیت جاری:</span>
                  <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[11px]">
                    {project.status || 'در حال اجرا'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">درصد پیشرفت عملیات:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full" 
                        style={{ width: `${project.progress || 0}%` }}
                      />
                    </div>
                    <span className="font-bold text-slate-800">{project.progress || 0}٪</span>
                  </div>
                </div>
              </div>

              {/* منابع انسانی و تیم متصل به پروژه */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#13213c]" />
                  <span>منابع انسانی و تیم کارشناسی رابو در این پروژه</span>
                </h4>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <div className="bg-white border border-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold text-slate-800">
                    <User className="w-3.5 h-3.5 text-amber-600" />
                    <span>مدیر پروژه: {project.projectManagerName || 'مهندس رضا محمدی'}</span>
                  </div>
                  {(project.teamMembers || []).map((member, i) => (
                    <span key={i} className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 font-medium">
                      👤 {member}
                    </span>
                  ))}
                </div>
              </div>

              {/* نشانی و دکمه‌های سریع مسیریابی کارشناسان در بلد، نشان و اسنپ */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-600" />
                    <span>نشانی و اعزام سریع کارشناس به پروژه (بدون نیاز به جستجو)</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={openInBalad}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer"
                    >
                      مسیریابی در بلد
                    </button>
                    <button
                      type="button"
                      onClick={openInNeshan}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer"
                    >
                      مسیریابی در نشان
                    </button>
                    <button
                      type="button"
                      onClick={openInSnapp}
                      className="bg-[#22c55e] hover:bg-[#16a34a] text-white px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer"
                    >
                      اسنپ گرفتن
                    </button>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-800 font-medium">
                  {project.address || 'تهران، سعادت‌آباد، خیابان سرو'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LETTERS (نامه‌ها و مکاتبات متصل به پروژه) */}
          {activeBranch === 'letters' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs">
                  نامه‌ها، ابلاغیه‌ها و دستورات فنی متصل به پروژه {project.id}
                </h4>
              </div>

              {projectLettersIn.length === 0 && projectLettersOut.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-400">
                  نامه یا دستور اداری خاصی هنوز به این شماره پروژه الصاق نشده است. در بخش کارتابل نامه‌ها با انتخاب این پروژه، مکاتبات مستقیماً اینجا آرشیو می‌شوند.
                </div>
              ) : (
                <div className="space-y-3">
                  {projectLettersIn.map(l => (
                    <div key={l.id} className="bg-blue-50/50 border border-blue-200/80 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">وارده</span>
                        <strong className="text-slate-900 text-xs mr-2">{l.subject}</strong>
                        <div className="text-[11px] text-slate-500 mt-1">از: {l.senderOrg} | تاریخ: {l.issueDate}</div>
                      </div>
                      <span className="font-mono text-slate-700 text-[11px] font-bold">{l.id}</span>
                    </div>
                  ))}
                  {projectLettersOut.map(l => (
                    <div key={l.id} className="bg-emerald-50/50 border border-emerald-200/80 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">صادره</span>
                        <strong className="text-slate-900 text-xs mr-2">{l.subject}</strong>
                        <div className="text-[11px] text-slate-500 mt-1">به: {l.recipientOrg} | تاریخ: {l.date}</div>
                      </div>
                      <span className="font-mono text-slate-700 text-[11px] font-bold">{l.id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TASKS (تسک‌ها و وظایف) */}
          {activeBranch === 'tasks' && (
            <div className="space-y-4">
              <form onSubmit={handleAddTask} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    placeholder="عنوان وظیفه یا دستور کارگاه..."
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#13213c] bg-white text-xs"
                  />
                </div>
                <div>
                  <select
                    value={taskForm.assigneeName}
                    onChange={(e) => setTaskForm({ ...taskForm, assigneeName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#13213c] bg-white text-xs"
                  >
                    {personnelList.map(p => (
                      <option key={p.id} value={p.name}>{p.name} ({p.unit})</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="bg-[#13213c] hover:bg-[#1f345c] text-white font-bold p-2 rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>افزودن تسک</span>
                </button>
              </form>

              <div className="space-y-2">
                {(project.tasks || []).length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl">
                    تسک ثبت‌شده‌ای وجود ندارد. از کادر بالا اقدام به افزودن وظیفه نمایید.
                  </div>
                ) : (
                  (project.tasks || []).map(task => (
                    <div 
                      key={task.id} 
                      onClick={() => handleToggleTask(task.id)}
                      className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={task.status === 'انجام شده'}
                          onChange={() => handleToggleTask(task.id)}
                          className="rounded text-[#13213c]"
                        />
                        <span className={`text-xs font-bold ${task.status === 'انجام شده' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {task.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">{task.assigneeName}</span>
                        <span>موعد: {task.dueDate}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: FINANCE (مالی، قرارداد و هزینه‌های اسنپ و کارمندان) */}
          {activeBranch === 'finance' && (
            <div className="space-y-4">
              {/* شاخص‌های مالی پروژه */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">مبلغ کل قرارداد:</span>
                  <strong className="text-slate-900 text-sm">{project.totalContractAmount || 'تعیین‌نشده'}</strong>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">مبالغ دریافتی از کارفرما:</span>
                  <strong className="text-emerald-700 text-sm">{project.receivedAmount || '۰ تومان'}</strong>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">مجموع مخارج و اسنپ پرسنل:</span>
                  <strong className="text-rose-700 text-sm">{totalExpenses.toLocaleString('fa-IR')} تومان</strong>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">تراز سود جاری پروژه:</span>
                  <strong className="text-[#13213c] text-sm">{netProfit.toLocaleString('fa-IR')} تومان</strong>
                </div>
              </div>

              {/* فرم ثبت هزینه پرسنل برای پروژه (اسنپ، پذیرایی، خرید) */}
              <form onSubmit={handleAddExpense} className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3">
                <h5 className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-amber-700" />
                  <span>ثبت هزینه‌کرد پرسنل برای این پروژه (اسنپ، ایاب‌ذهاب، تنخواه، پذیرایی)</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">شرح هزینه *</label>
                    <input
                      type="text"
                      required
                      value={expenseForm.title}
                      onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                      placeholder="مثال: اسنپ رفت و برگشت به کارگاه جهت بازدید ناظر"
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#13213c] bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">مبلغ هزینه (تومان) *</label>
                    <input
                      type="number"
                      required
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      placeholder="مثال: ۱۲۰۰۰۰"
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#13213c] bg-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">کارمند پرداخت‌کننده</label>
                    <select
                      value={expenseForm.employeeName}
                      onChange={(e) => setExpenseForm({ ...expenseForm, employeeName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#13213c] bg-white text-xs"
                    >
                      {personnelList.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-[#13213c] hover:bg-[#1f345c] text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>ثبت هزینه در پروژه</span>
                  </button>
                </div>
              </form>

              {/* لیست هزینه‌های ثبت شده */}
              <div className="space-y-2">
                <h5 className="font-bold text-slate-800 text-xs">ریز مخارج و اسنپ‌های انجام‌شده در این پروژه:</h5>
                {(project.expenses || []).length === 0 ? (
                  <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl">
                    هنوز هزینه‌ای ثبت نشده است.
                  </div>
                ) : (
                  (project.expenses || []).map(exp => (
                    <div key={exp.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <strong className="text-slate-900 text-xs">{exp.title}</strong>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          پرداخت توسط: {exp.employeeName} | تاریخ: {exp.date}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-rose-700 text-xs">
                        {exp.amount.toLocaleString('fa-IR')} تومان
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: DOCUMENTS (مدارک و نقشه‌ها - همراه با پیش‌نمایش و دانلود) */}
          {activeBranch === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">
                    اسناد، نقشه‌ها، چک‌لیست‌ها و تاییدیه رسمی پروژه {project.id}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    امکان مشاهده پیش‌نمایش، دانلود مستقیم فایل‌ها و الصاق مدارک فنی جدید
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddDocModal(true)}
                  className="bg-[#13213c] hover:bg-[#1f345c] text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>بارگذاری مدرک جدید</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(project.documents || []).length === 0 ? (
                  <div className="sm:col-span-2 p-6 text-center text-slate-400 bg-slate-50 rounded-xl">
                    هنوز مدرک فنی در این پروژه بارگذاری نشده است. با دکمه بالا اولین سند را اضافه کنید.
                  </div>
                ) : (
                  (project.documents || []).map(doc => (
                    <div key={doc.id} className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between gap-3 shadow-2xs hover:border-amber-400/60 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                            <Paperclip className="w-4 h-4" />
                          </div>
                          <div>
                            <strong className="text-slate-900 text-xs block leading-tight">{doc.title}</strong>
                            <span className="text-[11px] text-slate-500">{doc.category} | {doc.uploadDate}</span>
                          </div>
                        </div>
                        <span className="text-[10.5px] font-mono text-slate-400 shrink-0">{doc.fileSize}</span>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                        {/* دکمه پیش‌نمایش */}
                        <button
                          type="button"
                          onClick={() => setDocPreviewModal(doc)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer flex items-center gap-1 transition-colors"
                          title="پیش‌نمایش سند"
                        >
                          <Eye className="w-3 h-3 text-slate-600" />
                          <span>پیش‌نمایش</span>
                        </button>

                        {/* دکمه دانلود */}
                        <button
                          type="button"
                          onClick={() => {
                            const blob = new Blob([`محتوای فایل سند فنی ${doc.title} - پروژه ${project.id} شرکت مهندسی رابو`], { type: 'application/pdf' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${doc.title}.pdf`;
                            a.click();
                            URL.revokeObjectURL(url);
                            setToastMessage(`فایل «${doc.title}» با موفقیت دانلود شد.`);
                          }}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer flex items-center gap-1 transition-colors"
                          title="دانلود سند"
                        >
                          <Download className="w-3 h-3 text-emerald-600" />
                          <span>دانلود</span>
                        </button>

                        {/* دکمه حذف */}
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                          title="حذف مدرک"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: CALLS & MEETINGS (تماس‌ها با کارفرما با میکروفون) */}
          {activeBranch === 'calls' && (
            <div className="space-y-4">
              <form onSubmit={handleAddCall} className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                    <PhoneCall className="w-4 h-4 text-blue-700" />
                    <span>ثبت مکالمه جدید با کارفرما یا نماینده</span>
                  </h5>
                  <VoiceInputButton
                    onTranscript={(text) => {
                      setCallForm(prev => ({
                        ...prev,
                        summary: prev.summary ? `${prev.summary} ${text}` : text
                      }));
                    }}
                    buttonText="صحبت با میکروفون"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">مخاطب مکالمه</label>
                    <input
                      type="text"
                      value={callForm.contactPerson}
                      onChange={(e) => setCallForm({ ...callForm, contactPerson: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#13213c] bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">نتیجه مکالمه</label>
                    <input
                      type="text"
                      value={callForm.result}
                      onChange={(e) => setCallForm({ ...callForm, result: e.target.value })}
                      placeholder="مثال: توافق با زمان بازدید"
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#13213c] bg-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">شرح مذاکرات (با میکروفون صحبت کنید)</label>
                  <textarea
                    rows={2}
                    value={callForm.summary}
                    onChange={(e) => setCallForm({ ...callForm, summary: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#13213c] bg-white text-xs"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-[#13213c] hover:bg-[#1f345c] text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>ثبت تماس</span>
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {(project.calls || []).length === 0 ? (
                  <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl">
                    تماس یا گزارشی ثبت نشده است.
                  </div>
                ) : (
                  (project.calls || []).map(call => (
                    <div key={call.id} className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <strong className="text-slate-900">{call.contactPerson}</strong>
                        <span className="text-slate-500 font-mono text-[11px]">{call.date}</span>
                      </div>
                      <p className="text-slate-700 text-xs">{call.summary}</p>
                      <div className="text-[11px] text-emerald-700 font-bold">نتیجه: {call.result}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 7: TIMELINE (تایم‌لاین مسیر رشد ۱ ساله درخت پروژه: کجا بودیم؟ الان کجاییم؟ به کجا می‌رسیم؟) */}
          {activeBranch === 'timeline' && (
            <div className="space-y-5">
              <div className="bg-[#13213c] text-white p-4 rounded-lg border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <h5 className="font-black text-sm text-white flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-amber-400" />
                    <span>تنه درخت اتوماسیون: سرگذشت و نقشه راه ۱ ساله پروژه</span>
                  </h5>
                  <p className="text-[11.5px] text-slate-300 mt-1 leading-relaxed text-justify">
                    ثبت دقیق مسیر حرکت از روز افتتاح پرونده تا الان و چشم‌انداز رسیدن به مقاصد نهایی، تاییدیه‌ها و تسویه‌حساب کامل.
                  </p>
                </div>
                <div className="bg-white/10 border border-white/15 px-3 py-1.5 rounded-lg text-center shrink-0">
                  <span className="block text-[10px] text-amber-300">پیشرفت کلی تنه درخت</span>
                  <span className="text-base font-black text-white">{project.progress || 0}٪</span>
                </div>
              </div>

              {/* ۳ بخش کلان مسیر حرکت پروژه: ۱. کجا بودیم؟ ۲. الان کجاییم؟ ۳. به کجا می‌رسیم؟ */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* فاز ۱: کجا بودیم؟ */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                    <strong className="text-xs text-slate-800">۱. کجا بودیم؟ (گذشته و آغاز)</strong>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed text-justify">
                    پروژه با عقد قرارداد رسمی در تاریخ <strong>{project.contractDate || 'ابتدای دوره'}</strong> و دریافت پیش‌پرداخت اولیه آغاز شد. مدارک و نقشه‌های اولیه ثبت و اولین دستورات اداری صادر گردید.
                  </p>
                  <div className="text-[10.5px] text-slate-500 bg-white p-2 rounded-md border border-slate-200">
                    <div>• افتتاح پرونده در ستون فقرات رابو</div>
                    <div>• مبالغ اولیه دریافتی: {project.receivedAmount || 'طبق قرارداد'}</div>
                  </div>
                </div>

                {/* فاز ۲: الان کجاییم؟ */}
                <div className="bg-amber-50/70 p-4 rounded-lg border border-amber-200 space-y-2.5">
                  <div className="flex items-center gap-2 border-b border-amber-300/60 pb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <strong className="text-xs text-amber-950">۲. الان کجاییم؟ (وضعیت جاری)</strong>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed text-justify">
                    پروژه در وضعیت <strong>«{project.status || 'در حال اجرا'}»</strong> با پیشرفت فیزیکی <strong>{project.progress || 0}٪</strong> قرار دارد.
                  </p>
                  <div className="text-[10.5px] text-amber-900 bg-white p-2 rounded-md border border-amber-200 space-y-1">
                    <div>• تسک‌های فعال کارشناسان: {(project.tasks || []).filter(t => t.status !== 'انجام شده').length} مورد</div>
                    <div>• مجموع هزینه‌ها و اسنپ‌های ثبت‌شده: {totalExpenses.toLocaleString('fa-IR')} تومان</div>
                    <div>• آخرین تماس ثبت‌شده: {(project.calls || [])[0]?.date || 'در انتظار تماس'}</div>
                  </div>
                </div>

                {/* فاز ۳: به کجا می‌رسیم؟ */}
                <div className="bg-emerald-50/70 p-4 rounded-lg border border-emerald-200 space-y-2.5">
                  <div className="flex items-center gap-2 border-b border-emerald-300/60 pb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    <strong className="text-xs text-emerald-950">۳. به کجا می‌رسیم؟ (اهداف آینده)</strong>
                  </div>
                  <p className="text-[11px] text-emerald-900 leading-relaxed text-justify">
                    هدف نهایی: بازرسی قطعی، اخذ تاییدیه پایان‌کار / صدور گواهینامه معتبر، تحویل دائم پروژه به کارفرما و تسویه کامل مانده مطالبات.
                  </p>
                  <div className="text-[10.5px] text-emerald-900 bg-white p-2 rounded-md border border-emerald-200">
                    <div>• مانده مطالبات جهت تسویه: {calculateOutstanding(project.totalContractAmount || '', project.receivedAmount || '')}</div>
                    <div>• تحویل بسته‌های مستندات و گواهی رسمی</div>
                  </div>
                </div>
              </div>

              {/* خط زمانی رویدادها */}
              <div className="space-y-3 pt-2">
                <span className="font-bold text-xs text-slate-800 block">گاه‌شمار تفصیلی اقدامات و مراحل طی‌شده:</span>
                <div className="relative pr-6 border-r-2 border-amber-400/40 space-y-4 mr-3">
                  {(project.milestones || []).map((m) => (
                    <div key={m.id} className="relative">
                      <div className={`absolute -right-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-2xs ${
                        m.completed ? 'bg-emerald-600' : 'bg-amber-500'
                      }`} />
                      <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs">{m.title}</span>
                          <span className="text-slate-400 font-mono text-[11px]">{m.date}</span>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed text-justify">{m.description}</p>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          m.completed ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {m.completed ? 'تکمیل شده ✓' : 'در دست اقدام...'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* فرم افزودن رویداد جدید به خط زمانی */}
              <form onSubmit={handleAddMilestone} className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  required
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                  placeholder="عنوان گام یا نقطه عطف جدید..."
                  className="p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#13213c] bg-white text-xs"
                />
                <input
                  type="text"
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  placeholder="توضیحات و شرح اقدام این مرحله..."
                  className="p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#13213c] bg-white text-xs"
                />
                <button
                  type="submit"
                  className="bg-[#13213c] hover:bg-[#1f345c] text-white font-bold p-2 rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>ثبت گام در تایم‌لاین</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3.5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer"
          >
            بستن پرونده
          </button>
        </div>
      </div>

      {/* مودال بارگذاری مدرک جدید */}
      {showAddDocModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#13213c] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">بارگذاری مدرک یا نقشه جدید به پرونده</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDocModal(false)}
                className="text-white/70 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDocument} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">عنوان مدرک / نقشه *</label>
                <input
                  type="text"
                  required
                  value={newDocForm.title}
                  onChange={e => setNewDocForm({ ...newDocForm, title: e.target.value })}
                  placeholder="مثال: نقشه جانمایی اسپرینکلرها و بوستر پمپ زون ۴"
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#13213c]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">دسته‌بندی فنی مدرک</label>
                <select
                  value={newDocForm.category}
                  onChange={e => setNewDocForm({ ...newDocForm, category: e.target.value as any })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none bg-white font-medium"
                >
                  <option value="نقشه و طراحی">نقشه و طراحی</option>
                  <option value="تاییدیه و گواهینامه">تاییدیه و گواهینامه</option>
                  <option value="قرارداد">قرارداد</option>
                  <option value="صورتجلسه">صورتجلسه</option>
                  <option value="گزارش ممیزی">گزارش ممیزی</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">انتخاب فایل از کامپیوتر</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors">
                  <input
                    type="file"
                    id="doc-upload"
                    className="hidden"
                    onChange={e => setNewDocFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="doc-upload" className="cursor-pointer flex flex-col items-center gap-1 text-slate-600">
                    <Upload className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-[#13213c]">
                      {newDocFile ? newDocFile.name : 'انتخاب فایل (PDF, DWG, JPG)'}
                    </span>
                    <span className="text-[10px] text-slate-400">حداکثر حجم ۳۰ مگابایت</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#13213c] hover:bg-[#1f345c] text-white font-bold cursor-pointer shadow-xs"
                >
                  ثبت مدرک در پرونده
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال پیش‌نمایش مدرک */}
      {docPreviewModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#13213c] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">پیش‌نمایش سند فنی پروژه</h3>
              </div>
              <button
                type="button"
                onClick={() => setDocPreviewModal(null)}
                className="text-white/70 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 text-center space-y-4 text-xs">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>

              <div>
                <strong className="text-sm font-black text-slate-900 block">{docPreviewModal.title}</strong>
                <span className="text-[11px] text-slate-500 block mt-1">
                  دسته‌بندی: {docPreviewModal.category} | تاریخ ثبت: {docPreviewModal.uploadDate}
                </span>
                <span className="inline-block mt-2 bg-blue-50 text-blue-800 border border-blue-200 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full">
                  حجم فایل: {docPreviewModal.fileSize}
                </span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-right text-[11px] text-slate-600 space-y-1">
                <div><strong>کد پروژه مرتبط:</strong> {project.id} - {project.name}</div>
                <div><strong>امضای دیجیتال:</strong> دارای مهر و تاییدیه مهندسی رابو</div>
                <div><strong>وضعیت دسترسی:</strong> مجاز برای پرسنل و مدیران پروژه</div>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([`سند ${docPreviewModal.title} پروژه ${project.id}`], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${docPreviewModal.title}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setToastMessage(`فایل «${docPreviewModal.title}» دریافت شد.`);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>دانلود فایل مدرک</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDocPreviewModal(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
