import React, { useState } from 'react';
import { CrmLead, Employee, Project, SalesOpportunities } from '../../types';
import { 
  Building2, 
  PhoneCall, 
  MapPin, 
  Plus, 
  Search, 
  X, 
  Eye, 
  Tag, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Phone,
  FileText,
  User,
  Shield,
  Layers,
  ChevronRight,
  Trash2,
  Edit2
} from 'lucide-react';
import { GoogleMapsLocationPicker, LocationCoordinates, TEHRAN_PRESETS } from '../GoogleMapsLocationPicker';
import { VoiceInputButton } from '../VoiceInputButton';
import { ShamsiDatePicker } from '../ShamsiDatePicker';
import { toFa, getExactShamsiTimestamp } from '../../utils/jalali';

interface FireLeadsBankProps {
  currentUser: Employee;
  crmLeads: CrmLead[];
  setCrmLeads: React.Dispatch<React.SetStateAction<CrmLead[]>>;
  personnelList: Employee[];
  projectsList: Project[];
  setProjectsList: React.Dispatch<React.SetStateAction<Project[]>>;
  setPersonnelList?: React.Dispatch<React.SetStateAction<Employee[]>>;
  todayStr: string;
  setToastMessage: (msg: string) => void;
  onInspectLocation?: (address: string) => void;
  onCrossRefer?: (payload: {
    sourceDept: string;
    targetDepts: ('fire' | 'energy' | 'management')[];
    ownerName: string;
    gender?: 'آقا' | 'خانم';
    phone: string;
    companyOrFacilityName?: string;
    address: string;
    notes: string;
    marketerName: string;
  }) => void;
}

export const FireLeadsBank: React.FC<FireLeadsBankProps> = ({
  currentUser,
  crmLeads,
  setCrmLeads,
  personnelList,
  projectsList,
  setProjectsList,
  setPersonnelList,
  todayStr,
  setToastMessage,
  onCrossRefer
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterTemp, setFilterTemp] = useState<string>('all');

  // Interactive follow-up logging inside dossier modal
  const [dossierNote, setDossierNote] = useState('');
  const [dossierResult, setDossierResult] = useState('');
  const [dossierNextDate, setDossierNextDate] = useState(todayStr);

  // New Lead Form state (No engineering unit field!)
  const [form, setForm] = useState({
    urbanCode: '',
    manualFileNo: '',
    gender: 'آقا' as 'آقا' | 'خانم',
    ownerName: '',
    ownerPhone: '',
    referToManagement: false,
    referToEnergy: false,
    contactRole: 'مالک و سازنده اصلی',
    clientDecisionMaker: 'مالک اصلی',
    constructionStage: 'اسکلت و اجرای سقف‌ها',
    secondaryPhone: '',
    lawyerName: '',
    lawyerPhone: '',
    address: 'تهران، سعادت‌آباد، میدان کاج',
    municipalityZone: 'منطقه ۲',
    cadastralNo: '',
    buildingUsage: 'مسکونی',
    floorsAbove: '۶ طبقه روی همکف',
    floorsBelow: '۲ منفی',
    builtArea: '۳,۲۰۰',
    salesOpportunities: {
      consulting: true,
      design: true,
      productSupply: true,
      execution: false,
      fireApproval: true
    } as SalesOpportunities,
    salesExpertNotes: '',
    contactDate: todayStr,
    contactTime: '۱۰:۳۰',
    lastCallResult: 'مکالمه اولیه و تمایل به دریافت پروپوزال فنی و مالی',
    nextFollowUpDate: todayStr,
    nextFollowUpTime: '۱۱:۰۰',
    leadTemperature: 'گرم' as 'داغ' | 'گرم' | 'متوسط' | 'سرد',
    estimatedBudget: '',
    assignedExpertId: 'EMP-08',
    locationCoordinates: {
      lat: 35.7820,
      lng: 51.3730,
      addressDescription: 'تهران، سعادت‌آباد، میدان کاج'
    } as LocationCoordinates
  });

  const fireLeads = crmLeads.filter(l => l.unit === 'مهندسی حریق' || !l.unit || l.unit.includes('حریق'));

  const filteredLeads = fireLeads.filter(lead => {
    // Data isolation: non-managers only see leads assigned to them or with their followups
    if (!currentUser.isManager) {
      const isAssigned = 
        lead.assignedExpertId === currentUser.id ||
        lead.assignedExpertName === currentUser.name ||
        lead.assignedMarketerName === currentUser.name ||
        lead.assignedTo === currentUser.name ||
        lead.managerId === currentUser.id ||
        lead.followUps?.some(f => f.user === currentUser.name);
      if (!isAssigned) return false;
    }

    const q = searchQuery.trim().toLowerCase();
    const matchQuery = !q || 
      lead.urbanCode?.toLowerCase().includes(q) ||
      lead.ownerName?.toLowerCase().includes(q) ||
      lead.manualFileNo?.toLowerCase().includes(q) ||
      lead.ownerPhone?.includes(q) ||
      lead.municipalityZone?.toLowerCase().includes(q);
    
    const matchTemp = filterTemp === 'all' || lead.leadTemperature === filterTemp;
    return matchQuery && matchTemp;
  });

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.urbanCode.trim() || !form.ownerName.trim()) {
      setToastMessage('لطفاً شماره شهرسازی و نام مالک را وارد کنید.');
      return;
    }

    const assigned = personnelList.find(p => p.id === form.assignedExpertId) || personnelList[0];

    const newLead: CrmLead = {
      id: `LEAD-FIRE-${Date.now()}`,
      urbanCode: form.urbanCode,
      manualFileNo: form.manualFileNo,
      unit: 'مهندسی حریق',
      gender: form.gender,
      ownerName: form.ownerName,
      ownerPhone: form.ownerPhone,
      contactRole: form.contactRole,
      clientDecisionMaker: form.clientDecisionMaker,
      constructionStage: form.constructionStage,
      secondaryPhone: form.secondaryPhone,
      lawyerName: form.lawyerName,
      lawyerPhone: form.lawyerPhone,
      address: form.address,
      municipalityZone: form.municipalityZone,
      cadastralNo: form.cadastralNo,
      buildingUsage: form.buildingUsage,
      floorsAbove: form.floorsAbove,
      floorsBelow: form.floorsBelow,
      builtArea: form.builtArea,
      potentialServices: ['مشاوره و اخذ تاییدیه آتش‌نشانی', 'طراحی نقشه‌های ایمنی و تهویه'],
      salesOpportunities: form.salesOpportunities,
      salesExpertNotes: form.salesExpertNotes,
      contactDate: form.contactDate,
      contactTime: form.contactTime,
      lastCallResult: form.lastCallResult,
      nextFollowUpDate: form.nextFollowUpDate,
      nextFollowUpTime: form.nextFollowUpTime,
      leadTemperature: form.leadTemperature,
      estimatedBudget: form.estimatedBudget,
      status: 'در حال مذاکره اولیه',
      assignedTo: assigned.name,
      assignedMarketerId: assigned.id,
      assignedMarketerName: assigned.name,
      followUps: [
        {
          id: 1,
          date: getExactShamsiTimestamp(),
          user: assigned.name,
          note: form.salesExpertNotes || 'ثبت اولیه پرونده در بانک اطلاعات حریق'
        }
      ],
      followUpHistory: [
        {
          id: 1,
          date: `${form.contactDate} - ${form.contactTime}`,
          user: assigned.name,
          note: form.salesExpertNotes || 'ثبت اولیه پرونده در بانک اطلاعات حریق',
          result: form.lastCallResult
        }
      ],
      meetingInfo: null,
      locationCoordinates: form.locationCoordinates
    };

    setCrmLeads([newLead, ...crmLeads]);

    if (onCrossRefer && (form.referToManagement || form.referToEnergy)) {
      const targets: ('energy' | 'management')[] = [];
      if (form.referToManagement) targets.push('management');
      if (form.referToEnergy) targets.push('energy');
      onCrossRefer({
        sourceDept: 'مهندسی حریق',
        targetDepts: targets,
        ownerName: form.ownerName,
        gender: form.gender,
        phone: form.ownerPhone,
        companyOrFacilityName: `ساختمان ${form.ownerName} (${form.urbanCode})`,
        address: form.address,
        notes: form.salesExpertNotes || form.lastCallResult,
        marketerName: assigned.name
      });
    }

    setShowAddModal(false);
    setToastMessage(`پرونده شهرسازی ${form.urbanCode} با موفقیت ثبت شد.`);
  };

  const convertLeadToProject = (lead: CrmLead) => {
    const newProjectId = `PRJ-FIRE-${Math.floor(1000 + Math.random() * 9000)}`;
    const newProject: Project = {
      id: newProjectId,
      name: `پروژه ${lead.ownerName} (${lead.urbanCode})`,
      unit: 'مهندسی حریق',
      employer: lead.ownerName,
      clientName: lead.ownerName,
      manager: currentUser.name,
      address: lead.address,
      location: lead.locationCoordinates || { lat: 35.7820, lng: 51.3730, addressDescription: lead.address },
      status: 'در حال اجرا (فاز ۱)',
      progress: 15,
      permitNo: lead.urbanCode,
      contractDate: todayStr,
      projectManagerId: currentUser.id,
      projectManagerName: currentUser.name,
      teamMembers: [currentUser.name, lead.assignedMarketerName || ''].filter(Boolean),
      contractAmount: lead.estimatedBudget || '۳۵۰,۰۰۰,۰۰۰',
      totalContractAmount: lead.estimatedBudget || '۳۵۰,۰۰۰,۰۰۰ تومان',
      receivedAmount: '۱۰۰,۰۰۰,۰۰۰',
      expenses: [],
      tasks: [],
      documents: [],
      calls: [],
      milestones: [
        {
          id: 'M-1',
          title: 'عقد قرارداد رسمی و شروع پروژه',
          date: todayStr,
          completed: true,
          description: 'تبدیل سرنخ حریق به پروژه اجرایی'
        }
      ]
    };
    setProjectsList([...projectsList, newProject]);

    if (setPersonnelList) {
      const updatedPersonnel = personnelList.map(p => {
        if (p.id === lead.assignedMarketerId) {
          const currentComm = Number((p.commissionAmount || '0').replace(/,/g, '')) || 0;
          return {
            ...p,
            commissionAmount: (currentComm + 5000000).toLocaleString('fa-IR')
          };
        }
        return p;
      });
      setPersonnelList(updatedPersonnel);
    }

    setCrmLeads(crmLeads.map(l => l.id === lead.id ? { ...l, status: 'منتج به قرارداد (تبدیل به پروژه)', convertedToProjectId: newProjectId } : l));
    setSelectedLead(null);
    setToastMessage(`قرارداد منعقد شد! پروژه ${newProjectId} ثبت و در بانک پروژه‌های جاری فعال گردید.`);
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-[#13213c]">بانک اطلاعات حریق (پرونده‌های شهرسازی)</h2>
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold px-2 py-0.5 rounded-full">
              {filteredLeads.length} پرونده
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            مشاوره، طراحی نقشه‌های آتش‌نشانی، اخذ تاییدیه و تامین تجهیزات استاندارد سازه‌ها
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-[#800000] hover:bg-[#660000] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>ثبت پرونده حریق جدید</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو بر اساس نام مالک، شماره شهرسازی، پرونده دستی یا منطقه..."
            className="w-full pl-3 pr-9 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-bold">
          <button
            onClick={() => setFilterTemp('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterTemp === 'all' ? 'bg-[#13213c] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            همه پرونده‌ها
          </button>
          <button
            onClick={() => setFilterTemp('داغ')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterTemp === 'داغ' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            🔥 داغ
          </button>
          <button
            onClick={() => setFilterTemp('گرم')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterTemp === 'گرم' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            ⚡ گرم
          </button>
        </div>
      </div>

      {/* Row-based table display */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-[#13213c] text-white font-bold border-b border-slate-700">
                <th className="p-3.5 whitespace-nowrap">شماره پرونده / دستی</th>
                <th className="p-3.5 whitespace-nowrap">مالک و سازنده</th>
                <th className="p-3.5 whitespace-nowrap">منطقه و کاربری</th>
                <th className="p-3.5 whitespace-nowrap">متراژ زیربنا</th>
                <th className="p-3.5 whitespace-nowrap">سوابق تماس و پیگیری</th>
                <th className="p-3.5 whitespace-nowrap">کارشناس فروش</th>
                <th className="p-3.5 whitespace-nowrap">اولویت</th>
                <th className="p-3.5 whitespace-nowrap">وضعیت</th>
                <th className="p-3.5 whitespace-nowrap text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    پرونده‌ای با مشخصات جستجو شده یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-amber-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#13213c] bg-slate-100 px-2 py-0.5 rounded-md">
                          {toFa(lead.urbanCode)}
                        </span>
                        {lead.manualFileNo && (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {toFa(lead.manualFileNo)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-800">
                        {lead.gender ? `${lead.gender}ی ` : ''}{lead.ownerName}
                      </div>
                      <div className="text-[11px] text-slate-500">{toFa(lead.ownerPhone)}</div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="text-slate-700 font-semibold">{lead.municipalityZone || 'منطقه ۲'}</span>
                      <span className="text-slate-400 mx-1">|</span>
                      <span className="text-slate-600">{lead.buildingUsage}</span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-700 font-semibold">
                      {lead.builtArea ? `${toFa(lead.builtArea)} م²` : '-'}
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <div className="truncate text-slate-700 font-medium text-[11px]">
                        {lead.lastCallResult || lead.salesExpertNotes || 'ثبت اولیه'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {toFa((lead.followUpHistory?.length || lead.followUps?.length || 1))} نوبت پیگیری
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-700 font-medium">
                      {lead.assignedMarketerName || 'کارشناس فروش رابو'}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10.5px] font-black ${
                        lead.leadTemperature === 'داغ'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : lead.leadTemperature === 'گرم'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {lead.leadTemperature === 'داغ' ? '🔥 داغ' : lead.leadTemperature === 'گرم' ? '⚡ گرم' : 'متوسط'}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedLead(lead)}
                          className="inline-flex items-center gap-1 bg-[#13213c] hover:bg-[#1d325a] text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          title="مشاهده پرونده"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>مشاهده</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLead(lead);
                          }}
                          className="p-1 rounded-md text-slate-500 hover:text-[#13213c] hover:bg-slate-100 cursor-pointer transition-colors"
                          title="ویرایش پرونده"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm(`آیا از حذف پرونده ${lead.urbanCode} (${lead.ownerName}) اطمینان دارید؟`)) return;
                            setCrmLeads(crmLeads.filter(l => l.id !== lead.id));
                            setToastMessage(`پرونده ${lead.urbanCode} با موفقیت حذف گردید.`);
                            if (selectedLead?.id === lead.id) setSelectedLead(null);
                          }}
                          className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                          title="حذف پرونده"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Large Detail Modal - سرمه‌ای و سفید شیک */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#13213c] text-white p-5 flex items-center justify-between border-b border-amber-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-white">
                      پرونده شهرسازی: {selectedLead.urbanCode}
                    </h3>
                    {selectedLead.manualFileNo && (
                      <span className="bg-amber-400 text-[#13213c] font-black text-xs px-2.5 py-0.5 rounded-md">
                        پرونده دستی: {selectedLead.manualFileNo}
                      </span>
                    )}
                    <span className="bg-emerald-500 text-white font-bold text-xs px-2 py-0.5 rounded-md">
                      {selectedLead.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    مالک: {selectedLead.ownerName} | کارشناس فروش: {selectedLead.assignedMarketerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
              {/* Grid 1: مشخصات ملک و ساختمانی */}
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-3">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>مشخصات فنی و ساختمانی ملک</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">منطقه شهرداری:</span>
                    <strong className="text-slate-800">{selectedLead.municipalityZone || 'منطقه ۲'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">کاربری:</span>
                    <strong className="text-slate-800">{selectedLead.buildingUsage}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">متراژ تقریبی زیربنا:</span>
                    <strong className="text-slate-800">{selectedLead.builtArea ? `${selectedLead.builtArea} مترمربع` : '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">تعداد طبقات:</span>
                    <strong className="text-slate-800">{selectedLead.floorsAbove} / {selectedLead.floorsBelow}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">مرحله ساختمانی:</span>
                    <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">{selectedLead.constructionStage || 'اسکلت'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">تصمیم‌گیرنده اصلی:</span>
                    <strong className="text-slate-800">{selectedLead.clientDecisionMaker || selectedLead.ownerName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">پلاک ثبتی:</span>
                    <strong className="text-slate-800">{selectedLead.cadastralNo || 'ثبت‌نشده'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">اولویت پیگیری:</span>
                    <span className="font-black text-rose-700">{selectedLead.leadTemperature || 'گرم'}</span>
                  </div>
                </div>
              </div>

              {/* Grid 2: اطلاعات مالکان و تماس */}
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-3">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>اطلاعات مالک، سازنده و وکیل فنی</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[11px]">مالک / سازنده:</span>
                      <strong className="text-slate-900 text-sm">{selectedLead.ownerName}</strong>
                      <div className="text-slate-500 font-mono mt-0.5">{selectedLead.ownerPhone}</div>
                    </div>
                    <a
                      href={`tel:${selectedLead.ownerPhone}`}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>تماس تلفنی</span>
                    </a>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[11px]">وکیل / نماینده فنی:</span>
                      <strong className="text-slate-900 text-sm">{selectedLead.lawyerName || 'بدون وکیل'}</strong>
                      {selectedLead.lawyerPhone && <div className="text-slate-500 font-mono mt-0.5">{selectedLead.lawyerPhone}</div>}
                    </div>
                    {selectedLead.lawyerPhone && (
                      <a
                        href={`tel:${selectedLead.lawyerPhone}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>تماس</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Grid 3: توضیحات کارشناس فروش و مذاکرات */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-700" />
                    <span>توضیحات کارشناس فروش:</span>
                  </span>
                  <p className="text-xs leading-relaxed text-amber-900">
                    {selectedLead.salesExpertNotes || 'توضیحاتی ثبت نشده است.'}
                  </p>
                </div>

                <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <PhoneCall className="w-4 h-4 text-blue-700" />
                    <span>نتیجه آخرین تماس کارشناس فروش:</span>
                  </span>
                  <p className="text-xs leading-relaxed text-blue-900">
                    {selectedLead.lastCallResult || 'تماس اولیه ثبت شده است.'}
                  </p>
                  <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-3 border-t border-blue-200/60">
                    <span>تاریخ تماس: {selectedLead.contactDate || todayStr}</span>
                    <span>پیگیری بعدی: {selectedLead.nextFollowUpDate || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Grid 3.5: ثبت پیگیری جدید و سوابق تماس شماره‌دار */}
              <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-[#13213c] text-xs flex items-center gap-1.5">
                    <PhoneCall className="w-4 h-4 text-amber-600" />
                    <span>ثبت پیگیری جدید در پرونده جامع تعاملات مشتری</span>
                  </h4>
                  <VoiceInputButton
                    onTranscript={text => setDossierNote(prev => prev ? `${prev} ${text}` : text)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">نتیجه تماس / وضعیت پرونده</label>
                    <input
                      type="text"
                      value={dossierResult}
                      onChange={e => setDossierResult(e.target.value)}
                      placeholder="مثال: ارسال پیش‌فاکتور اعلام و اطفا - موافقت اولیه کارفرما"
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white outline-none"
                    />
                  </div>
                  <div>
                    <ShamsiDatePicker
                      label="موعد پیگیری بعدی"
                      value={dossierNextDate}
                      onChange={val => setDossierNextDate(val)}
                    />
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={dossierNote}
                  onChange={e => setDossierNote(e.target.value)}
                  placeholder="شرح کامل مذاکره با کارفرما را بنویسید یا با میکروفون صحبت کنید..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white outline-none"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {onCrossRefer && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onCrossRefer({
                          sourceDept: 'مهندسی حریق',
                          targetDepts: ['management'],
                          ownerName: selectedLead.ownerName,
                          gender: selectedLead.gender,
                          phone: selectedLead.ownerPhone,
                          companyOrFacilityName: `ساختمان ${selectedLead.ownerName}`,
                          address: selectedLead.address,
                          notes: dossierNote || selectedLead.salesExpertNotes || 'ارجاع از واحد حریق',
                          marketerName: selectedLead.assignedMarketerName || currentUser.name
                        })}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-[11px] font-bold cursor-pointer"
                      >
                        ارجاع همزمان به واحد سیستم مدیریت
                      </button>
                      <button
                        type="button"
                        onClick={() => onCrossRefer({
                          sourceDept: 'مهندسی حریق',
                          targetDepts: ['energy'],
                          ownerName: selectedLead.ownerName,
                          gender: selectedLead.gender,
                          phone: selectedLead.ownerPhone,
                          companyOrFacilityName: `ساختمان ${selectedLead.ownerName}`,
                          address: selectedLead.address,
                          notes: dossierNote || selectedLead.salesExpertNotes || 'ارجاع از واحد حریق',
                          marketerName: selectedLead.assignedMarketerName || currentUser.name
                        })}
                        className="px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 text-[11px] font-bold cursor-pointer"
                      >
                        ارجاع همزمان به واحد انرژی
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!dossierNote.trim() && !dossierResult.trim()) return;
                      const newEntry = {
                        id: Date.now(),
                        date: getExactShamsiTimestamp(),
                        user: currentUser.name,
                        note: dossierNote.trim(),
                        result: dossierResult.trim() || 'ثبت پیگیری جدید'
                      };
                      const updated: CrmLead = {
                        ...selectedLead,
                        lastCallResult: dossierResult.trim() || selectedLead.lastCallResult,
                        nextFollowUpDate: dossierNextDate || selectedLead.nextFollowUpDate,
                        followUpHistory: [newEntry, ...(selectedLead.followUpHistory || [])]
                      };
                      setCrmLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
                      setSelectedLead(updated);
                      setDossierNote('');
                      setDossierResult('');
                      setToastMessage('سابقه تماس و پیگیری با موفقیت در پرونده مشتری ثبت شد.');
                    }}
                    className="bg-[#13213c] hover:bg-[#1f345c] text-white px-4 py-2 rounded-xl font-bold cursor-pointer"
                  >
                    ثبت در سوابق تماس و پیگیری
                  </button>
                </div>

                {/* لیست شماره‌دار سوابق تماس */}
                {selectedLead.followUpHistory && selectedLead.followUpHistory.length > 0 && (
                  <div className="pt-3 border-t border-amber-200/70 space-y-2">
                    <div className="font-bold text-slate-800 text-[11px]">سوابق تماس و پیگیری ثبت‌شده:</div>
                    {selectedLead.followUpHistory.map((h, idx) => (
                      <div key={h.id} className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#13213c] text-amber-400 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                            {toFa(idx + 1)}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900">{h.result}</div>
                            {h.note && <div className="text-slate-600 text-[11px] mt-0.5">{h.note}</div>}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">{toFa(h.date)} ({h.user})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Grid 4: نقشه و نشانی یکپارچه با نشان، بلد، اسنپ و گوگل‌مپ */}
              <div>
                <GoogleMapsLocationPicker
                  initialLocation={selectedLead.locationCoordinates || { lat: 35.7820, lng: 51.3730, addressDescription: selectedLead.address }}
                  onSelectLocation={() => {}}
                  readOnly={true}
                  addressValue={selectedLead.address}
                  title="موقعیت مکانی و مسیریابی سریع پروژه در نشان، بلد، اسنپ و گوگل‌مپ"
                />
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {!selectedLead.status.includes('قرارداد') && (
                  <button
                    type="button"
                    onClick={() => convertLeadToProject(selectedLead)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>منتج به قرارداد (تبدیل به پروژه جاری)</span>
                  </button>
                )}

                <select
                  value={selectedLead.rejectionReason || ''}
                  onChange={e => {
                    const reason = e.target.value;
                    if (!reason) return;
                    const updated: CrmLead = {
                      ...selectedLead,
                      status: 'عدم تمایل / بایگانی',
                      rejectionReason: reason
                    };
                    setCrmLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
                    setSelectedLead(updated);
                    setToastMessage(`علت عدم همکاری (${reason}) در آمار تحلیلی مدیریت ثبت گردید.`);
                  }}
                  className="p-2 border border-rose-200 bg-rose-50 text-rose-900 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="">ثبت دلیل عدم همکاری / رد پیشنهاد...</option>
                  <option value="قیمت بالاتر از رقبا">قیمت بالاتر از رقبا</option>
                  <option value="توقف یا تعلیق پروژه ساختمانی">توقف یا تعلیق پروژه ساختمانی</option>
                  <option value="همکاری با مشاور قبلی">همکاری با مشاور قبلی</option>
                  <option value="عدم نیاز فعلی به خدمات مهندسی">عدم نیاز فعلی به خدمات مهندسی</option>
                  <option value="عدم پاسخگویی یا انصراف کارفرما">عدم پاسخگویی یا انصراف کارفرما</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal - بدون واحد مهندسی، با میکروفون و نقشه یکپارچه */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Top */}
            <div className="bg-[#13213c] text-white p-5 flex items-center justify-between border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-[#13213c] flex items-center justify-center font-black">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">ثبت پرونده شهرسازی (حریق) جدید</h3>
                  <p className="text-xs text-slate-300">ورود مشخصات پرونده، مالک، کاربری و نشانی یکپارچه روی نقشه</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateLead} className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* بخش ۱: اطلاعات پرونده و ملک (بدون فیلد واحد مهندسی) */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#13213c] text-xs border-b pb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>۱. اطلاعات پرونده و ملک</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">شماره پرونده شهرسازی *</label>
                    <input
                      type="text"
                      required
                      value={form.urbanCode}
                      onChange={(e) => setForm({ ...form, urbanCode: e.target.value })}
                      placeholder="مثال: ۲۱۰۸۷۹۴۳"
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">شماره پرونده دستی (بایگانی فیزیکی)</label>
                    <input
                      type="text"
                      value={form.manualFileNo}
                      onChange={(e) => setForm({ ...form, manualFileNo: e.target.value })}
                      placeholder="مثال: زونکن منطقه ۲ - پرونده ۱۴"
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">مرحله ساختمانی پروژه</label>
                    <select
                      value={form.constructionStage}
                      onChange={(e) => setForm({ ...form, constructionStage: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c] bg-white"
                    >
                      <option value="صدور دستور نقشه">صدور دستور نقشه</option>
                      <option value="در حال اخذ پروانه / اسکلت">در حال اخذ پروانه / اسکلت</option>
                      <option value="اسکلت و اجرای سقف‌ها">اسکلت و اجرای سقف‌ها</option>
                      <option value="سفت‌کاری و تیغه‌چینی">سفت‌کاری و تیغه‌چینی</option>
                      <option value="نازک‌کاری و تاسیسات">نازک‌کاری و تاسیسات</option>
                      <option value="آماده تست نهایی و پایان‌کار">آماده تست نهایی و پایان‌کار</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">منطقه شهرداری تهران</label>
                    <select
                      value={form.municipalityZone}
                      onChange={(e) => setForm({ ...form, municipalityZone: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c] bg-white"
                    >
                      {TEHRAN_PRESETS.map((p, i) => (
                        <option key={i} value={p.zone}>{p.zone} - {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">کاربری ملک</label>
                    <select
                      value={form.buildingUsage}
                      onChange={(e) => setForm({ ...form, buildingUsage: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c] bg-white"
                    >
                      <option value="مسکونی">مسکونی</option>
                      <option value="تجاری - اداری">تجاری - اداری</option>
                      <option value="صنعتی - کارگاهی">صنعتی - کارگاهی</option>
                      <option value="درمانی و بیمارستانی">درمانی و بیمارستانی</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">متراژ تقریبی زیربنا (مترمربع)</label>
                    <input
                      type="text"
                      value={form.builtArea}
                      onChange={(e) => setForm({ ...form, builtArea: e.target.value })}
                      placeholder="مثال: ۳,۵۰۰"
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                    />
                  </div>
                </div>
              </div>

              {/* بخش ۲: مشخصات مالک و مخاطبان */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#13213c] text-xs border-b pb-1.5 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>۲. اطلاعات مالک و کارفرما</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">جنسیت مخاطب *</label>
                    <select
                      value={form.gender}
                      onChange={e => setForm({ ...form, gender: e.target.value as 'آقا' | 'خانم' })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none bg-white font-bold"
                    >
                      <option value="آقا">آقا</option>
                      <option value="خانم">خانم</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">نام مالک / سازنده *</label>
                    <input
                      type="text"
                      required
                      value={form.ownerName}
                      onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                      placeholder="مثال: مهندس جمشید صادقی"
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">شماره تماس اصلی *</label>
                    <input
                      type="text"
                      required
                      value={form.ownerPhone}
                      onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })}
                      placeholder="مثال: 09121234567"
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">شخص تصمیم‌گیرنده نهایی</label>
                    <input
                      type="text"
                      value={form.clientDecisionMaker}
                      onChange={(e) => setForm({ ...form, clientDecisionMaker: e.target.value })}
                      placeholder="مثال: مالک اصلی / سرمایه‌گذار"
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">نام وکیل یا نماینده فنی (در صورت وجود)</label>
                    <input
                      type="text"
                      value={form.lawyerName}
                      onChange={(e) => setForm({ ...form, lawyerName: e.target.value })}
                      placeholder="مثال: مهندس کاوه بیات"
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                    />
                  </div>
                </div>
                {/* ارجاع همزمان آنی به سایر واحدها */}
                <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3 flex flex-wrap items-center gap-4">
                  <span className="font-bold text-indigo-950 text-xs">ارجاع همزمان آنی به سایر دپارتمان‌ها:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={form.referToManagement}
                      onChange={e => setForm({ ...form, referToManagement: e.target.checked })}
                      className="rounded text-[#13213c]"
                    />
                    <span>ارجاع همزمان به واحد سیستم مدیریت (ISO)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={form.referToEnergy}
                      onChange={e => setForm({ ...form, referToEnergy: e.target.checked })}
                      className="rounded text-[#13213c]"
                    />
                    <span>ارجاع همزمان به واحد انرژی</span>
                  </label>
                </div>
              </div>

              {/* بخش ۳: نشانی پروژه یکپارچه با نقشه و نشان، بلد، اسنپ */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#13213c] text-xs border-b pb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-600" />
                  <span>۳. نشانی یکپارچه پروژه و نقشه (نشان، بلد، اسنپ)</span>
                </h4>
                <GoogleMapsLocationPicker
                  initialLocation={form.locationCoordinates}
                  onSelectLocation={(loc) => setForm(prev => ({ ...prev, locationCoordinates: loc }))}
                  addressValue={form.address}
                  onAddressChange={(addr) => setForm(prev => ({ ...prev, address: addr }))}
                  title="موقعیت مکانی و نشانی دقیق پروژه"
                />
              </div>

              {/* بخش ۴: توضیحات کارشناس فروش با ورودی میکروفون صوتی */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#13213c] text-xs border-b pb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>۴. توضیحات کارشناس فروش و نتیجه تماس</span>
                  </span>
                  {/* دکمه میکروفون برای صحبت کردن */}
                  <VoiceInputButton
                    onTranscript={(text) => {
                      setForm(prev => ({
                        ...prev,
                        salesExpertNotes: prev.salesExpertNotes ? `${prev.salesExpertNotes} ${text}` : text
                      }));
                    }}
                    buttonText="صحبت با میکروفون (صوت به متن)"
                  />
                </h4>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    توضیحات کارشناس فروش (امکان صحبت با میکروفون):
                  </label>
                  <textarea
                    rows={3}
                    value={form.salesExpertNotes}
                    onChange={(e) => setForm({ ...form, salesExpertNotes: e.target.value })}
                    placeholder="توضیحات و مذاکرات کارشناس فروش با کارفرما یا دکمه میکروفون را بزنید و صحبت کنید..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c] leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">نتیجه تماس کارشناس فروش</label>
                    <input
                      type="text"
                      value={form.lastCallResult}
                      onChange={(e) => setForm({ ...form, lastCallResult: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">اولویت پیگیری</label>
                    <select
                      value={form.leadTemperature}
                      onChange={(e) => setForm({ ...form, leadTemperature: e.target.value as any })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c] bg-white"
                    >
                      <option value="داغ">🔥 داغ (پیگیری فوری)</option>
                      <option value="گرم">⚡ گرم (پیگیری ظرف ۴۸ ساعت)</option>
                      <option value="متوسط">متوسط</option>
                      <option value="سرد">سرد</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit and Cancel buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="bg-[#800000] hover:bg-[#660000] text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>ثبت قطعی پرونده حریق</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
