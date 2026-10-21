import React, { useState } from 'react';
import { Project, Employee, ReceivedLetter, SentLetter } from '../types';
import { 
  FolderKanban, 
  MapPin, 
  Plus, 
  Search, 
  Building2, 
  ShieldCheck, 
  Car, 
  Edit2, 
  Eye, 
  Coins, 
  Zap, 
  Award, 
  Users, 
  Phone,
  Calendar,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { GoogleMapsLocationPicker, LocationCoordinates } from './GoogleMapsLocationPicker';
import { ProjectDetailHub } from './projects/ProjectDetailHub';
import { formatPriceNumber, handleMoneyInputChange } from '../utils/numberFormat';
import { ExcelExportButton } from './ExcelExportButton';
import { exportProjectsToExcel } from '../utils/excelExport';

interface ProjectsViewProps {
  currentUser: Employee;
  projectsList: Project[];
  setProjectsList: React.Dispatch<React.SetStateAction<Project[]>>;
  todayStr: string;
  setToastMessage: (msg: string) => void;
  onInspectLocation?: (address: string) => void;
  personnelList?: Employee[];
  receivedLetters?: ReceivedLetter[];
  sentLetters?: SentLetter[];
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  currentUser,
  projectsList,
  setProjectsList,
  todayStr,
  setToastMessage,
  personnelList = [],
  receivedLetters = [],
  sentLetters = []
}) => {
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHubProject, setSelectedHubProject] = useState<Project | null>(null);

  // Modal for new/edit project
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formActiveSection, setFormActiveSection] = useState<'basics' | 'clientFinance' | 'locationDocs'>('basics');

  const [projectForm, setProjectForm] = useState({
    name: '',
    unit: 'مهندسی حریق' as 'مهندسی حریق' | 'انرژی' | 'سیستم مدیریت',
    clientName: '',
    clientPhone: '',
    contractNo: '',
    address: 'تهران، سعادت‌آباد، میدان کاج',
    location: {
      lat: 35.7820,
      lng: 51.3730,
      addressDescription: 'تهران، سعادت‌آباد'
    } as LocationCoordinates,
    status: 'آغاز عملیات و برداشت اولیه',
    progress: 15,
    permitNo: '',
    projectManagerName: personnelList[0]?.name || 'مهندس رضا محمدی',
    totalContractAmount: '500,000,000',
    receivedAmount: '150,000,000',
    paymentTerms: '۴۰٪ پیش‌پرداخت، ۴۰٪ پس از تاییدیه فاز ۱، ۲۰٪ پس از تحویل نهایی',
    scopeDescription: 'ارائه کلیه خدمات مهندسی، مشاوره، تهیه نقشه‌ها و اخذ تاییدیه‌های قانونی'
  });

  // مرتب‌سازی تعاملی جدول پروژه‌ها
  type ProjectSortField = 'id' | 'name' | 'unit' | 'clientName' | 'projectManagerName' | 'totalContractAmount' | 'receivedAmount' | 'progress';
  const [sortField, setSortField] = useState<ProjectSortField | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const parseAmountNumber = (val?: string | number): number => {
    if (!val) return 0;
    const str = String(val).replace(/[^\d.-]/g, '');
    return parseFloat(str) || 0;
  };

  const handleSort = (field: ProjectSortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection(field === 'totalContractAmount' || field === 'receivedAmount' || field === 'progress' ? 'desc' : 'asc');
    }
  };

  const filteredProjects = projectsList.filter(p => {
    // Data isolation: non-managers only see projects where they are in teamMembers or project manager
    if (!currentUser.isManager) {
      const isMember = 
        (p.teamMembers && p.teamMembers.includes(currentUser.name)) ||
        p.projectManagerId === currentUser.id ||
        p.projectManagerName === currentUser.name;
      if (!isMember) return false;
    }

    const matchesUnit = selectedUnit === 'all' || p.unit === selectedUnit;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery = !q || 
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      (p.clientName && p.clientName.toLowerCase().includes(q)) ||
      (p.address && p.address.toLowerCase().includes(q)) ||
      (p.permitNo && p.permitNo.toLowerCase().includes(q));
    return matchesUnit && matchesQuery;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (!sortField) return 0;

    let res = 0;
    if (sortField === 'id') {
      res = a.id.localeCompare(b.id, 'fa');
    } else if (sortField === 'name') {
      res = a.name.localeCompare(b.name, 'fa');
    } else if (sortField === 'unit') {
      res = (a.unit || '').localeCompare(b.unit || '', 'fa');
    } else if (sortField === 'clientName') {
      res = (a.clientName || '').localeCompare(b.clientName || '', 'fa');
    } else if (sortField === 'projectManagerName') {
      res = (a.projectManagerName || '').localeCompare(b.projectManagerName || '', 'fa');
    } else if (sortField === 'totalContractAmount') {
      res = parseAmountNumber(a.totalContractAmount) - parseAmountNumber(b.totalContractAmount);
    } else if (sortField === 'receivedAmount') {
      res = parseAmountNumber(a.receivedAmount) - parseAmountNumber(b.receivedAmount);
    } else if (sortField === 'progress') {
      res = (a.progress || 0) - (b.progress || 0);
    }

    return sortDirection === 'asc' ? res : -res;
  });

  const handleOpenAddModal = () => {
    setEditingProject(null);
    setFormActiveSection('basics');
    const prefix = selectedUnit === 'انرژی' ? 'NRG' : selectedUnit === 'سیستم مدیریت' ? 'ISO' : 'FIRE';
    const randCode = Math.floor(100 + Math.random() * 900);
    setProjectForm({
      name: '',
      unit: selectedUnit === 'all' ? 'مهندسی حریق' : (selectedUnit as any),
      clientName: '',
      clientPhone: '',
      contractNo: `CNT-${prefix}-1405-${randCode}`,
      address: 'تهران، سعادت‌آباد، میدان کاج',
      location: {
        lat: 35.7820,
        lng: 51.3730,
        addressDescription: 'تهران، سعادت‌آباد'
      },
      status: 'آغاز عملیات و تدوین برنامه اجرایی',
      progress: 10,
      permitNo: `PRJ-${prefix}-${randCode}`,
      projectManagerName: personnelList[0]?.name || 'مهندس رضا محمدی',
      totalContractAmount: '450,000,000',
      receivedAmount: '100,000,000',
      paymentTerms: '۳۰٪ پیش‌پرداخت، ۴۰٪ فاز دوم، ۳۰٪ تسویه نهایی',
      scopeDescription: 'انجام خدمات تخصصی بر مبنای استانداردهای جاری شرکت مهندسی رابو'
    });
    setShowAddProjectModal(true);
  };

  const handleOpenEditModal = (proj: Project) => {
    setEditingProject(proj);
    setFormActiveSection('basics');
    setProjectForm({
      name: proj.name,
      unit: (proj.unit as any) || 'مهندسی حریق',
      clientName: proj.clientName || '',
      clientPhone: proj.clientPhone || '',
      contractNo: (proj as any).contractNo || `CNT-${proj.id}`,
      address: proj.address || '',
      location: proj.location || {
        lat: 35.7820,
        lng: 51.3730,
        addressDescription: proj.address || 'تهران'
      },
      status: proj.status || 'در حال اجرا',
      progress: proj.progress || 50,
      permitNo: proj.permitNo || proj.id,
      projectManagerName: proj.projectManagerName || 'مهندس رضا محمدی',
      totalContractAmount: formatPriceNumber(proj.totalContractAmount || ''),
      receivedAmount: formatPriceNumber(proj.receivedAmount || ''),
      paymentTerms: (proj as any).paymentTerms || 'طبق مفاد قرارداد فیمابین',
      scopeDescription: (proj as any).scopeDescription || 'شرح تفصیلی تعهدات مهندسی در قرارداد'
    });
    setShowAddProjectModal(true);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!projectForm.name || !projectForm.name.trim()) {
      setToastMessage('لطفاً نام کامل پروژه را وارد فرمایید.');
      setFormActiveSection('basics');
      return;
    }

    try {
      const formattedTotal = `${projectForm.totalContractAmount || '۰'} تومان`;
      const formattedReceived = `${projectForm.receivedAmount || '۰'} تومان`;

      if (editingProject) {
        const updated = projectsList.map(p => 
          p.id === editingProject.id 
            ? {
                ...p,
                name: projectForm.name.trim(),
                unit: projectForm.unit,
                clientName: projectForm.clientName || 'کارفرما',
                clientPhone: projectForm.clientPhone || '',
                address: projectForm.address || 'تهران',
                location: projectForm.location,
                status: projectForm.status,
                progress: Number(projectForm.progress) || 0,
                permitNo: projectForm.permitNo || p.id,
                projectManagerName: projectForm.projectManagerName,
                totalContractAmount: formattedTotal,
                receivedAmount: formattedReceived,
                contractNo: projectForm.contractNo,
                paymentTerms: projectForm.paymentTerms,
                scopeDescription: projectForm.scopeDescription
              }
            : p
        );
        setProjectsList(updated);
        setToastMessage(`پروژه ${projectForm.name} با موفقیت ویرایش شد.`);
      } else {
        const prefix = projectForm.unit === 'مهندسی حریق' ? 'FIRE' : projectForm.unit === 'انرژی' ? 'NRG' : 'ISO';
        const newId = projectForm.permitNo?.trim() || `PRJ-${prefix}-1405-${Math.floor(100 + Math.random() * 900)}`;
        const newProj: Project = {
          id: newId,
          name: projectForm.name.trim(),
          unit: projectForm.unit,
          clientName: projectForm.clientName || 'کارفرما',
          clientPhone: projectForm.clientPhone || '',
          address: projectForm.address || 'تهران',
          location: projectForm.location,
          status: projectForm.status || 'آغاز عملیات و برداشت اولیه',
          progress: Number(projectForm.progress) || 10,
          permitNo: newId,
          contractDate: todayStr,
          projectManagerName: projectForm.projectManagerName || currentUser.name,
          teamMembers: [projectForm.projectManagerName || currentUser.name, currentUser.name].filter((v, i, a) => a.indexOf(v) === i),
          totalContractAmount: formattedTotal,
          receivedAmount: formattedReceived,
          expenses: [],
          tasks: [],
          documents: [],
          calls: [],
          milestones: [
            {
              id: 'M-1',
              title: 'ثبت پروژه و آغاز فرآیند اجرایی',
              date: todayStr,
              completed: true,
              description: 'تعریف پروژه در سامانه اتوماسیون مهندسی رابو'
            }
          ]
        };
        setProjectsList([newProj, ...projectsList]);
        setToastMessage(`پروژه «${newProj.name}» با شناسه ${newProj.id} با موفقیت ثبت شد.`);
      }

      setShowAddProjectModal(false);
      setEditingProject(null);
    } catch (err) {
      console.error('Save project error:', err);
      setToastMessage('خطا در ذخیره‌سازی پروژه.');
    }
  };

  const handleDeleteProject = (projectId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`آیا از حذف کامل پروژه ${projectId} اطمینان دارید؟`)) return;
    setProjectsList(prev => prev.filter(p => p.id !== projectId));
    setToastMessage(`پروژه ${projectId} با موفقیت حذف گردید.`);
    if (selectedHubProject?.id === projectId) {
      setSelectedHubProject(null);
    }
  };

  const handleUpdateProjectInList = (updated: Project) => {
    setProjectsList(projectsList.map(p => p.id === updated.id ? updated : p));
    setSelectedHubProject(updated);
  };

  const openInSnapp = (proj: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const lat = proj.location?.lat || 35.7820;
    const lng = proj.location?.lng || 51.3730;
    const destName = encodeURIComponent(proj.address || proj.name);
    window.open(`https://app.snapp.taxi/ride?dest_lat=${lat}&dest_lng=${lng}&dest_name=${destName}`, '_blank');
  };

  const openInBalad = (proj: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const lat = proj.location?.lat || 35.7820;
    const lng = proj.location?.lng || 51.3730;
    window.open(`https://balad.ir/location?latitude=${lat}&longitude=${lng}`, '_blank');
  };

  const openInNeshan = (proj: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const lat = proj.location?.lat || 35.7820;
    const lng = proj.location?.lng || 51.3730;
    window.open(`https://neshan.org/maps/@${lat},${lng},16z,0p`, '_blank');
  };

  // Helper to calculate outstanding balance
  const calculateOutstanding = (totalStr: string, recStr: string) => {
    const total = Number((totalStr || '0').replace(/[^0-9]/g, '')) || 0;
    const rec = Number((recStr || '0').replace(/[^0-9]/g, '')) || 0;
    const diff = total - rec;
    return diff > 0 ? `${diff.toLocaleString('fa-IR')} تومان` : 'تسویه شده';
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm sm:text-base font-black text-[#13213c]">
              مدیریت یکپارچه پروژه‌ها
            </h2>
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold px-2 py-0.5 rounded-md">
              {filteredProjects.length} پروژه فعال
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 text-justify sm:text-right leading-relaxed">
            نمای ردیفی پرونده‌ها؛ اتصال مستقیم مکاتبات، وظایف، مخارج، پرسنل و مسیریابی به پروژه
          </p>
        </div>

        {currentUser.isManager && (
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 bg-[#800000] hover:bg-[#660000] text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>تعریف پروژه جدید</span>
          </button>
        )}
      </div>

      {/* ۳ دسته تخصصی پروژه‌ها (تفکیک رسمی حوزه‌های کاری رابو) */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedUnit('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
              selectedUnit === 'all' 
                ? 'bg-[#13213c] text-white shadow-xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            همه حوزه‌ها ({projectsList.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedUnit('مهندسی حریق')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedUnit === 'مهندسی حریق' 
                ? 'bg-rose-700 text-white shadow-xs' 
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>۱. مهندسی حریق</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedUnit('انرژی')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedUnit === 'انرژی' 
                ? 'bg-amber-600 text-white shadow-xs' 
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>۲. ممیزی و مدیریت انرژی</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedUnit('سیستم مدیریت')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedUnit === 'سیستم مدیریت' 
                ? 'bg-blue-700 text-white shadow-xs' 
                : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200/60'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>۳. سیستم‌های مدیریت (ISO)</span>
          </button>
        </div>

        {/* فیلد جستجوی سریع و دکمه استخراج اکسل */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس نام پروژه، کد PRJ، کارفرما..."
              className="w-full pl-3 pr-9 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#13213c] bg-white"
            />
          </div>

          <ExcelExportButton
            onExportFiltered={() => {
              exportProjectsToExcel(sortedProjects, 'filtered');
              setToastMessage(`فایل اکسل با موفقیت ایجاد و دانلود شد (${sortedProjects.length} پروژه فیلترشده).`);
            }}
            onExportFull={() => {
              exportProjectsToExcel(projectsList, 'full');
              setToastMessage(`فایل اکسل کلیه پروژه‌ها با موفقیت ایجاد و دانلود شد (${projectsList.length} پروژه).`);
            }}
            filteredCount={sortedProjects.length}
            totalCount={projectsList.length}
            entityName="پروژه‌ها"
          />
        </div>
      </div>

      {/* نحوه نمایش ردیفی پروژه‌ها با قابلیت مرتب‌سازی تعاملی ستون‌ها و خطوط راهنمای خوانا */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {sortField && (
          <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-950">
            <div className="flex items-center gap-2 font-medium">
              <span className="text-slate-600">مرتب‌سازی بر اساس:</span>
              <span className="bg-amber-200/90 text-amber-900 px-2.5 py-0.5 rounded-md font-black text-xs flex items-center gap-1">
                {sortField === 'id' ? 'کد سیستمی' :
                 sortField === 'name' ? 'نام پروژه' :
                 sortField === 'unit' ? 'حوزه تخصصی' :
                 sortField === 'clientName' ? 'کارفرما' :
                 sortField === 'projectManagerName' ? 'مدیر پروژه' :
                 sortField === 'totalContractAmount' ? 'مبلغ قرارداد' :
                 sortField === 'receivedAmount' ? 'دریافتی' : 'درصد پیشرفت'}
                <span>{sortDirection === 'asc' ? '(صعودی ⬆)' : '(نزولی ⬇)'}</span>
              </span>
              <span className="text-slate-400 font-mono text-[11px]">| {sortedProjects.length} پروژه</span>
            </div>
            <button
              type="button"
              onClick={() => setSortField(null)}
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
                  onClick={() => handleSort('id')}
                  className={`p-3 cursor-pointer select-none transition-colors border-l border-slate-200/70 hover:bg-slate-200/90 ${
                    sortField === 'id' ? 'bg-amber-100/80 text-[#13213c] font-black' : ''
                  }`}
                  title="کلیک برای مرتب‌سازی بر اساس کد سیستمی"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>کد سیستمی</span>
                    {sortField === 'id' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-700" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-700" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('name')}
                  className={`p-3 cursor-pointer select-none transition-colors border-l border-slate-200/70 hover:bg-slate-200/90 ${
                    sortField === 'name' ? 'bg-amber-100/80 text-[#13213c] font-black' : ''
                  }`}
                  title="کلیک برای مرتب‌سازی بر اساس نام پروژه"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>نام کامل پروژه</span>
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-700" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-700" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('unit')}
                  className={`p-3 cursor-pointer select-none transition-colors border-l border-slate-200/70 hover:bg-slate-200/90 ${
                    sortField === 'unit' ? 'bg-amber-100/80 text-[#13213c] font-black' : ''
                  }`}
                  title="کلیک برای مرتب‌سازی بر اساس حوزه تخصصی"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>حوزه تخصصی</span>
                    {sortField === 'unit' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-700" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-700" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('clientName')}
                  className={`p-3 cursor-pointer select-none transition-colors border-l border-slate-200/70 hover:bg-slate-200/90 ${
                    sortField === 'clientName' ? 'bg-amber-100/80 text-[#13213c] font-black' : ''
                  }`}
                  title="کلیک برای مرتب‌سازی بر اساس نام کارفرما"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>کارفرما و تماس</span>
                    {sortField === 'clientName' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-700" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-700" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('projectManagerName')}
                  className={`p-3 cursor-pointer select-none transition-colors border-l border-slate-200/70 hover:bg-slate-200/90 ${
                    sortField === 'projectManagerName' ? 'bg-amber-100/80 text-[#13213c] font-black' : ''
                  }`}
                  title="کلیک برای مرتب‌سازی بر اساس مدیر پروژه"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>مدیر پروژه رابو</span>
                    {sortField === 'projectManagerName' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-700" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-700" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('totalContractAmount')}
                  className={`p-3 cursor-pointer select-none transition-colors border-l border-slate-200/70 hover:bg-slate-200/90 ${
                    sortField === 'totalContractAmount' ? 'bg-amber-100/80 text-[#13213c] font-black' : ''
                  }`}
                  title="کلیک برای مرتب‌سازی بر اساس مبلغ کل قرارداد"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>مبلغ کل قرارداد</span>
                    {sortField === 'totalContractAmount' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-700" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-700" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('receivedAmount')}
                  className={`p-3 cursor-pointer select-none transition-colors border-l border-slate-200/70 hover:bg-slate-200/90 ${
                    sortField === 'receivedAmount' ? 'bg-amber-100/80 text-[#13213c] font-black' : ''
                  }`}
                  title="کلیک برای مرتب‌سازی بر اساس مبلغ دریافتی تاکنون"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>دریافتی تاکنون</span>
                    {sortField === 'receivedAmount' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-700" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-700" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('progress')}
                  className={`p-3 cursor-pointer select-none transition-colors border-l border-slate-200/70 hover:bg-slate-200/90 ${
                    sortField === 'progress' ? 'bg-amber-100/80 text-[#13213c] font-black' : ''
                  }`}
                  title="کلیک برای مرتب‌سازی بر اساس درصد پیشرفت"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>پیشرفت</span>
                    {sortField === 'progress' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-700" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-700" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                    )}
                  </div>
                </th>

                <th className="p-3 text-center border-l border-slate-200/70">مسیریابی سریع</th>
                <th className="p-3 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {sortedProjects.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center text-slate-400">
                    هیچ پروژه‌ای مطابق فیلتر یا جستجو یافت نشد.
                  </td>
                </tr>
              ) : (
                sortedProjects.map((project, idx) => {
                  const isEven = idx % 2 === 0;

                  return (
                    <tr
                      key={project.id}
                      onClick={() => setSelectedHubProject(project)}
                      className={`group cursor-pointer transition-all duration-150 ${
                        isEven ? 'bg-white' : 'bg-slate-50/60'
                      } hover:bg-amber-50/80 hover:shadow-xs`}
                    >
                      <td className="p-3 text-center text-slate-400 font-mono text-[11px] border-l border-slate-200/60 group-hover:text-amber-800 group-hover:font-bold group-hover:border-r-3 group-hover:border-r-[#13213c] transition-all">
                        {idx + 1}
                      </td>
                      <td className="p-3 border-l border-slate-200/60">
                        <span className="font-mono font-bold text-xs bg-[#13213c] text-white px-2 py-0.5 rounded shadow-2xs">
                          {project.id}
                        </span>
                      </td>
                      <td className="p-3 border-l border-slate-200/60">
                        <div className="font-black text-slate-900 group-hover:text-[#13213c] transition-colors leading-snug">
                          {project.name}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {project.address || 'تهران'}
                        </div>
                      </td>
                      <td className="p-3 border-l border-slate-200/60">
                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md ${
                          project.unit === 'مهندسی حریق'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : project.unit === 'انرژی'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                          {project.unit}
                        </span>
                      </td>
                      <td className="p-3 border-l border-slate-200/60">
                        <div className="font-bold text-slate-800">{project.clientName || '-'}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{project.clientPhone || ''}</div>
                      </td>
                      <td className="p-3 text-slate-700 font-medium border-l border-slate-200/60">
                        {project.projectManagerName || 'مهندس رضا محمدی'}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800 text-[11.5px] border-l border-slate-200/60">
                        {formatPriceNumber(project.totalContractAmount)} تومان
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-700 text-[11.5px] border-l border-slate-200/60">
                        {formatPriceNumber(project.receivedAmount)} تومان
                      </td>
                      <td className="p-3 border-l border-slate-200/60">
                        <div className="flex items-center gap-1.5 w-24">
                          <div className="flex-1 h-2 rounded-full bg-slate-200/80 overflow-hidden">
                            <div 
                              className="h-full bg-amber-500 rounded-full transition-all duration-300" 
                              style={{ width: `${project.progress || 0}%` }}
                            />
                          </div>
                          <span className="font-bold text-[11px] text-slate-600">{project.progress || 0}٪</span>
                        </div>
                      </td>
                      <td className="p-3 text-center border-l border-slate-200/60" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1 text-[10.5px]">
                          <button
                            type="button"
                            onClick={(e) => openInSnapp(project, e)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors"
                            title="اسنپ به سمت پروژه"
                          >
                            اسنپ
                          </button>
                          <button
                            type="button"
                            onClick={(e) => openInBalad(project, e)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors"
                            title="بلد"
                          >
                            بلد
                          </button>
                          <button
                            type="button"
                            onClick={(e) => openInNeshan(project, e)}
                            className="bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors"
                            title="نشان"
                          >
                            نشان
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedHubProject(project)}
                            className="bg-[#13213c] hover:bg-[#1f345c] text-white px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer shadow-2xs flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>جزییات بیشتر</span>
                          </button>

                          {currentUser.isManager && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(project)}
                                className="p-1 rounded-md text-slate-500 hover:text-[#13213c] hover:bg-slate-100 cursor-pointer transition-colors"
                                title="ویرایش پروژه"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteProject(project.id, e)}
                                className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                                title="حذف کامل پروژه"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

      {/* Central Backbone Project Detail Hub Modal (ستون فقرات پروژه) */}
      {selectedHubProject && (
        <ProjectDetailHub
          project={selectedHubProject}
          onClose={() => setSelectedHubProject(null)}
          onUpdateProject={handleUpdateProjectInList}
          personnelList={personnelList}
          receivedLetters={receivedLetters}
          sentLetters={sentLetters}
          todayStr={todayStr}
          setToastMessage={setToastMessage}
        />
      )}

      {/* مودال تعریف / ویرایش پروژه - دارای ۳ بخش تفکیک‌شده طبق دستور کاربر */}
      {showAddProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* هدر سرمه‌ای مودال */}
            <div className="bg-[#13213c] text-white p-4 sm:p-5 flex items-center justify-between border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-400 text-[#13213c] flex items-center justify-center font-black">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {editingProject ? `ویرایش پرونده پروژه ${editingProject.id}` : 'تعریف پروژه جدید در سامانه'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    ساختار سه‌بخشی مهندسی رابو برای اتصال یکپارچه کلیه شاخه‌های اتوماسیون
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddProjectModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* نوار ۳ بخش تفکیک‌شده (Tab Bar) */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => setFormActiveSection('basics')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  formActiveSection === 'basics' 
                    ? 'bg-[#13213c] text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5 text-amber-400" />
                <span>بخش ۱: شناسنامه و اطلاعات فنی</span>
              </button>

              <button
                type="button"
                onClick={() => setFormActiveSection('clientFinance')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  formActiveSection === 'clientFinance' 
                    ? 'bg-[#13213c] text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>بخش ۲: اطلاعات کارفرما، قرارداد و مالی</span>
              </button>

              <button
                type="button"
                onClick={() => setFormActiveSection('locationDocs')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  formActiveSection === 'locationDocs' 
                    ? 'bg-[#13213c] text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>بخش ۳: موقعیت مکانی، ناوبری و مستندات</span>
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              
              {/* بخش ۱: شناسنامه و اطلاعات فنی */}
              {formActiveSection === 'basics' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800 block text-xs">اطلاعات اولیه و حوزه مهندسی رابو:</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      مشخصات هویتی و مدیر پروژه که به عنوان تنه اصلی عمل می‌کند.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-700 font-bold mb-1">نام کامل پروژه *</label>
                      <input
                        type="text"
                        value={projectForm.name}
                        onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                        placeholder="مثال: اخذ تاییدیه و تست نهایی اطفا حریق برج آفتاب"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#13213c] bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">حوزه تخصصی رابو *</label>
                      <select
                        value={projectForm.unit}
                        onChange={(e) => setProjectForm({ ...projectForm, unit: e.target.value as any })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#13213c] bg-white text-xs"
                      >
                        <option value="مهندسی حریق">۱. مهندسی حریق و ایمنی معماری</option>
                        <option value="انرژی">۲. ممیزی و مدیریت انرژی و نیروگاه خورشیدی</option>
                        <option value="سیستم مدیریت">۳. سیستم‌های مدیریت کیفیت، محیط‌زیست و ایمنی (ISO)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">شماره پرونده / کد رهگیری سیستمی</label>
                      <input
                        type="text"
                        value={projectForm.permitNo}
                        onChange={(e) => setProjectForm({ ...projectForm, permitNo: e.target.value })}
                        placeholder="مثال: PRJ-FIRE-1405-101"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#13213c] bg-white text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">مدیر پروژه منتخب (از پرسنل رسمی رابو) *</label>
                      <select
                        value={projectForm.projectManagerName}
                        onChange={(e) => setProjectForm({ ...projectForm, projectManagerName: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#13213c] bg-white text-xs"
                      >
                        {personnelList.map(p => (
                          <option key={p.id} value={p.name}>{p.name} ({p.role})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">فاز و وضعیت اجرایی پروژه</label>
                      <select
                        value={projectForm.status}
                        onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#13213c] bg-white text-xs"
                      >
                        <option value="آغاز عملیات و برداشت اولیه">آغاز عملیات و برداشت اولیه</option>
                        <option value="طراحی نقشه‌ها و تدوین مستندات">طراحی نقشه‌ها و تدوین مستندات</option>
                        <option value="بررسی در کارگروه و اخذ تاییدیه فاز ۱">بررسی در کارگروه و اخذ تاییدیه فاز ۱</option>
                        <option value="نظارت کارگاهی و تست تجهیزات">نظارت کارگاهی و تست تجهیزات</option>
                        <option value="ممیزی مرحله نهایی">ممیزی مرحله نهایی</option>
                        <option value="صدور گواهینامه / تاییدیه پایان‌کار">صدور گواهینامه / تاییدیه پایان‌کار</option>
                        <option value="تحویل قطعی و تسویه حساب">تحویل قطعی و تسویه حساب</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between font-bold text-slate-700 mb-1.5">
                        <span>درصد پیشرفت فیزیکی عملیات:</span>
                        <span className="text-[#13213c] font-black text-sm">{projectForm.progress}٪</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={projectForm.progress}
                        onChange={(e) => setProjectForm({ ...projectForm, progress: Number(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* بخش ۲: اطلاعات کارفرما، قرارداد و مالی */}
              {formActiveSection === 'clientFinance' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800 block text-xs">امور قراردادی و منابع مالی (با جداکننده ۳ رقم):</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ارقام مالی جهت جلوگیری از خطای کاربر به صورت ۳ رقم ۳ رقم جدا می‌شوند.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">نام کارفرما / شرکت طرف قرارداد *</label>
                      <input
                        type="text"
                        value={projectForm.clientName}
                        onChange={(e) => setProjectForm({ ...projectForm, clientName: e.target.value })}
                        placeholder="مثال: شرکت ساختمانی برج‌سازان تهران"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#13213c] bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">شماره تماس مستقیم کارفرما</label>
                      <input
                        type="text"
                        value={projectForm.clientPhone}
                        onChange={(e) => setProjectForm({ ...projectForm, clientPhone: e.target.value })}
                        placeholder="مثال: 09121112233"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#13213c] bg-white text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">شماره قرارداد رسمی</label>
                      <input
                        type="text"
                        value={projectForm.contractNo}
                        onChange={(e) => setProjectForm({ ...projectForm, contractNo: e.target.value })}
                        placeholder="مثال: CNT-1405-092"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#13213c] bg-white text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">مبلغ کل قرارداد (تومان)</label>
                      <input
                        type="text"
                        value={projectForm.totalContractAmount}
                        onChange={(e) => setProjectForm({ ...projectForm, totalContractAmount: handleMoneyInputChange(e.target.value) })}
                        placeholder="مثال: ۶۵۰,۰۰۰,۰۰۰"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#13213c] bg-white text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">مبالغ دریافتی تاکنون (تومان)</label>
                      <input
                        type="text"
                        value={projectForm.receivedAmount}
                        onChange={(e) => setProjectForm({ ...projectForm, receivedAmount: handleMoneyInputChange(e.target.value) })}
                        placeholder="مثال: ۲۰۰,۰۰۰,۰۰۰"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#13213c] bg-white text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">مانده مطالبات محاسبه‌شده</label>
                      <div className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-800 font-bold text-xs font-mono">
                        {calculateOutstanding(projectForm.totalContractAmount, projectForm.receivedAmount)}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-700 font-bold mb-1">نحوه و شرایط پرداخت اقساط قرارداد</label>
                      <input
                        type="text"
                        value={projectForm.paymentTerms}
                        onChange={(e) => setProjectForm({ ...projectForm, paymentTerms: e.target.value })}
                        placeholder="مثال: ۳۰٪ پیش‌پرداخت، ۴۰٪ بعد از تاییدیه، ۳۰٪ تسویه نهایی"
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#13213c] bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* بخش ۳: موقعیت مکانی، ناوبری و مستندات */}
              {formActiveSection === 'locationDocs' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800 block text-xs">موقعیت مکانی و هدایت مستقیم کارشناسان:</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      نشانی دقیق برای اینکه کارشناسان رابو با یک لمس در نشان، بلد یا اسنپ به کارگاه برسند.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <GoogleMapsLocationPicker
                      initialLocation={projectForm.location}
                      onSelectLocation={(loc) => setProjectForm(prev => ({ ...prev, location: loc }))}
                      addressValue={projectForm.address}
                      onAddressChange={(addr) => setProjectForm(prev => ({ ...prev, address: addr }))}
                      title="موقعیت مکانی و نشانی دقیق پروژه"
                    />

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">دامنه خدمات مهندسی و توضیحات اولیه کارشناس</label>
                      <textarea
                        rows={3}
                        value={projectForm.scopeDescription}
                        onChange={(e) => setProjectForm({ ...projectForm, scopeDescription: e.target.value })}
                        placeholder="شرح تعهدات و الزامات مهندسی مورد توافق با کارفرما..."
                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#13213c] bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* دکمه‌های ناوبری بین بخش‌ها و ثبت نهایی با رنگ زرشکی */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {formActiveSection !== 'basics' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (formActiveSection === 'locationDocs') setFormActiveSection('clientFinance');
                        else if (formActiveSection === 'clientFinance') setFormActiveSection('basics');
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-lg text-xs cursor-pointer"
                    >
                      بخش قبلی
                    </button>
                  )}
                  {formActiveSection !== 'locationDocs' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (formActiveSection === 'basics') setFormActiveSection('clientFinance');
                        else if (formActiveSection === 'clientFinance') setFormActiveSection('locationDocs');
                      }}
                      className="bg-[#13213c]/10 hover:bg-[#13213c]/20 text-[#13213c] font-bold px-3 py-2 rounded-lg text-xs cursor-pointer"
                    >
                      بخش بعدی
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddProjectModal(false)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer"
                  >
                    انصراف
                  </button>
                  {/* کلید ثبت نهایی به رنگ زرشکی طبق دستور کاربر */}
                  <button
                    type="submit"
                    className="bg-[#800000] hover:bg-[#660000] text-white font-bold px-6 py-2 rounded-lg text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4 text-amber-300" />
                    <span>{editingProject ? 'ذخیره تغییرات پروژه' : 'ثبت قطعی پروژه'}</span>
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
