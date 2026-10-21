import React, { useState } from 'react';
import { ManagementSystemLeadItem, Employee } from '../../types';
import { 
  Award, 
  Shield, 
  Plus, 
  Search, 
  X, 
  Eye, 
  MapPin, 
  Phone, 
  Calendar, 
  FileText, 
  Building,
  CheckCircle,
  Briefcase,
  Layers,
  FileCheck
} from 'lucide-react';
import { GoogleMapsLocationPicker, LocationCoordinates } from '../GoogleMapsLocationPicker';
import { VoiceInputButton } from '../VoiceInputButton';
import { toFa, getExactShamsiTimestamp } from '../../utils/jalali';

interface ManagementLeadsBankProps {
  currentUser: Employee;
  managementLeads: ManagementSystemLeadItem[];
  setManagementLeads: React.Dispatch<React.SetStateAction<ManagementSystemLeadItem[]>>;
  personnelList: Employee[];
  todayStr: string;
  setToastMessage: (msg: string) => void;
  onCrossRefer?: (params: {
    sourceDepartment: 'fire' | 'energy' | 'management';
    targetDepartments: ('fire' | 'energy' | 'management')[];
    clientName: string;
    gender?: 'آقا' | 'خانم';
    companyName: string;
    phone: string;
    nationalId?: string;
    address: string;
    notes: string;
    referredBy: string;
  }) => void;
  onConvertToProject?: (leadData: {
    name: string;
    employer: string;
    phone: string;
    address: string;
    type: string;
    description: string;
  }) => void;
}

const COMMON_ISO_STANDARDS = [
  'ISO 9001 (مدیریت کیفیت)',
  'ISO 14001 (محیط زیست)',
  'ISO 45001 (ایمنی و بهداشت شغلی)',
  'IMS (سیستم مدیریت یکپارچه)',
  'ISO 22000 (صنایع غذایی و بهداشت)',
  'HACCP (آنالیز خطر و نقاط بحرانی غذا)',
  'ISO 27001 (امنیت اطلاعات ISMS)',
  'ISO 13485 (تجهیزات پزشکی)',
  'IATF 16949 (صنایع خودروسازی)',
  'HSE-MS (بهداشت، ایمنی و محیط زیست)',
  'ISO 10002 / 10004 (رسیدگی به شکایات مشتریان)',
  'ISO 17025 (آزمایشگاه‌های آزمون و کالیبراسیون)'
];

export const ManagementLeadsBank: React.FC<ManagementLeadsBankProps> = ({
  currentUser,
  managementLeads,
  setManagementLeads,
  personnelList,
  todayStr,
  setToastMessage,
  onCrossRefer,
  onConvertToProject
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStd, setFilterStd] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<ManagementSystemLeadItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFollowUpNote, setNewFollowUpNote] = useState('');
  const [newFollowUpResult, setNewFollowUpResult] = useState('ارسال پروپوزال استقرار سیستم مدیریت ISO');

  // New Management Lead Form state
  const [form, setForm] = useState({
    code: `ISO-${Math.floor(1000 + Math.random() * 9000)}`,
    manualFileNo: '',
    companyName: '',
    contactPerson: '',
    gender: 'آقا' as 'آقا' | 'خانم',
    contactPhone: '',
    nationalId: '',
    industryField: 'صنایع دارویی و شیمیایی',
    address: 'تهران، کیلومتر ۱۴ جاده مخصوص کرج',
    requestedStandards: ['ISO 9001 (مدیریت کیفیت)', 'ISO 45001 (ایمنی و بهداشت شغلی)'],
    serviceScope: 'مشاوره و استقرار کامل' as ManagementSystemLeadItem['serviceScope'],
    employeeCount: '۱۲۰ نفر',
    certificationBodyPreference: 'مراجع معتبر بین‌المللی IAF (توف نورد / SGS)',
    salesExpertNotes: '',
    contactDate: todayStr,
    lastCallResult: 'توافق برای ارزیابی گپ آنالیز اولیه فرآیندها',
    nextFollowUpDate: todayStr,
    leadTemperature: 'گرم' as 'داغ' | 'گرم' | 'متوسط' | 'سرد',
    assignedExpertId: 'EMP-08',
    crossRefFire: false,
    crossRefEnergy: false,
    locationCoordinates: {
      lat: 35.7088,
      lng: 51.2215,
      addressDescription: 'تهران، کیلومتر ۱۴ جاده مخصوص کرج'
    } as LocationCoordinates
  });

  const filteredLeads = managementLeads.filter(lead => {
    // Data isolation: non-managers only see leads assigned to them
    if (!currentUser.isManager) {
      const isAssigned = 
        lead.assignedExpertId === currentUser.id ||
        lead.assignedExpertName === currentUser.name;
      if (!isAssigned) return false;
    }

    const q = searchQuery.trim().toLowerCase();
    const matchQuery = !q || 
      lead.companyName?.toLowerCase().includes(q) ||
      lead.contactPerson?.toLowerCase().includes(q) ||
      lead.code?.toLowerCase().includes(q) ||
      lead.manualFileNo?.toLowerCase().includes(q) ||
      lead.contactPhone?.includes(q) ||
      lead.industryField?.toLowerCase().includes(q);

    const matchStd = filterStd === 'all' || lead.requestedStandards.some(s => s.includes(filterStd));
    return matchQuery && matchStd;
  });

  const toggleStandardSelection = (std: string) => {
    if (form.requestedStandards.includes(std)) {
      setForm({ ...form, requestedStandards: form.requestedStandards.filter(s => s !== std) });
    } else {
      setForm({ ...form, requestedStandards: [...form.requestedStandards, std] });
    }
  };

  const handleCreateManagementLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim() || !form.contactPerson.trim()) {
      setToastMessage('لطفاً نام شرکت و نام رابط مدیریت را وارد نمایید.');
      return;
    }

    const assigned = personnelList.find(p => p.id === form.assignedExpertId) || personnelList[0];

    const newLead: ManagementSystemLeadItem = {
      id: `ISO-${Date.now()}`,
      code: form.code,
      manualFileNo: form.manualFileNo,
      companyName: form.companyName,
      contactPerson: form.contactPerson,
      gender: form.gender,
      contactPhone: form.contactPhone,
      nationalId: form.nationalId,
      industryField: form.industryField,
      address: form.address,
      locationCoordinates: form.locationCoordinates,
      requestedStandards: form.requestedStandards.length > 0 ? form.requestedStandards : ['ISO 9001 (مدیریت کیفیت)'],
      serviceScope: form.serviceScope,
      employeeCount: form.employeeCount,
      certificationBodyPreference: form.certificationBodyPreference,
      salesExpertNotes: form.salesExpertNotes,
      contactDate: form.contactDate,
      lastCallResult: form.lastCallResult,
      nextFollowUpDate: form.nextFollowUpDate,
      leadTemperature: form.leadTemperature,
      status: 'در حال تدوین پروپوزال مشاوره',
      assignedExpertId: assigned.id,
      assignedExpertName: assigned.name,
      followUpHistory: [
        {
          id: 1,
          date: `${form.contactDate} - ۱۱:۰۰`,
          user: assigned.name,
          note: form.salesExpertNotes || 'ثبت پرونده در بانک اطلاعات سیستم مدیریت ISO',
          result: form.lastCallResult
        }
      ]
    };

    setManagementLeads([newLead, ...managementLeads]);

    const targets: ('fire' | 'energy' | 'management')[] = [];
    if (form.crossRefFire) targets.push('fire');
    if (form.crossRefEnergy) targets.push('energy');
    if (targets.length > 0 && onCrossRefer) {
      onCrossRefer({
        sourceDepartment: 'management',
        targetDepartments: targets,
        clientName: form.contactPerson,
        gender: form.gender,
        companyName: form.companyName,
        phone: form.contactPhone,
        nationalId: form.nationalId,
        address: form.address,
        notes: form.salesExpertNotes,
        referredBy: currentUser.name
      });
    } else {
      setToastMessage(`پرونده سیستم مدیریت ${newLead.code} برای ${newLead.companyName} ثبت شد.`);
    }

    setShowAddModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-[#13213c]">بانک اطلاعات سیستم مدیریت (استانداردهای بین‌المللی ISO)</h2>
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold px-2 py-0.5 rounded-full">
              {filteredLeads.length} پرونده
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            مشاوره، پیاده‌سازی، ممیزی و اخذ گواهینامه‌های معتبر بین‌المللی ISO 9001, 14001, 45001, IMS, 22000, 27001
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-[#800000] hover:bg-[#660000] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>ثبت پرونده سیستم مدیریت جدید</span>
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
            placeholder="جستجو بر اساس نام سازمان، استاندارد ISO، رابط یا شماره تماس..."
            className="w-full pl-3 pr-9 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-bold">
          <button
            onClick={() => setFilterStd('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterStd === 'all' ? 'bg-[#13213c] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            همه
          </button>
          <button
            onClick={() => setFilterStd('9001')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterStd === '9001' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            ISO 9001 کیفیت
          </button>
          <button
            onClick={() => setFilterStd('45001')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterStd === '45001' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            ISO 45001 ایمنی
          </button>
          <button
            onClick={() => setFilterStd('IMS')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterStd === 'IMS' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
            }`}
          >
            IMS یکپارچه
          </button>
          <button
            onClick={() => setFilterStd('22000')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterStd === '22000' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            ISO 22000 غذا
          </button>
          <button
            onClick={() => setFilterStd('27001')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterStd === '27001' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
            }`}
          >
            ISO 27001 امنیت
          </button>
        </div>
      </div>

      {/* Row-based table display */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-[#13213c] text-white font-bold border-b border-slate-700">
                <th className="p-3.5 whitespace-nowrap">کد پرونده</th>
                <th className="p-3.5 whitespace-nowrap">نام سازمان / متقاضی</th>
                <th className="p-3.5 whitespace-nowrap">مخاطب / نماینده</th>
                <th className="p-3.5 whitespace-nowrap">استانداردهای مدنظر</th>
                <th className="p-3.5 whitespace-nowrap">دامنه خدمات</th>
                <th className="p-3.5 whitespace-nowrap">کارشناس فروش</th>
                <th className="p-3.5 whitespace-nowrap">اولویت</th>
                <th className="p-3.5 whitespace-nowrap">سوابق تماس و پیگیری</th>
                <th className="p-3.5 whitespace-nowrap text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    پرونده سیستم مدیریتی یافت نشد.
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
                        <span className="font-mono font-bold text-[#13213c] bg-slate-100 px-2 py-0.5 rounded-md">
                          {toFa(lead.code)}
                        </span>
                        {lead.manualFileNo && (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {toFa(lead.manualFileNo)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{lead.companyName}</div>
                      <div className="text-[11px] text-slate-500">{lead.industryField}</div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">
                        {lead.gender ? `${lead.gender === 'آقا' ? 'جناب آقای' : 'سرکار خانم'} ` : ''}{lead.contactPerson}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{toFa(lead.contactPhone)}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1 flex-wrap max-w-xs">
                        {lead.requestedStandards.map((std, i) => (
                          <span key={i} className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {std.split(' ')[0]} {std.split(' ')[1]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-700 font-semibold">
                      {lead.serviceScope}
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-700 font-medium">
                      {lead.assignedExpertName || 'کارشناس فروش رابو'}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10.5px] font-black ${
                        lead.leadTemperature === 'داغ'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {lead.leadTemperature === 'داغ' ? '🔥 داغ' : '⚡ گرم'}
                      </span>
                    </td>
                    <td className="p-3.5 max-w-[220px]">
                      <div className="text-xs font-semibold text-slate-700 truncate">{lead.lastCallResult}</div>
                      <div className="text-[10px] text-indigo-600 font-bold mt-0.5">
                        {toFa(lead.followUpHistory?.length || 1)} مرحله پیگیری ثبت شده
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLead(lead);
                        }}
                        className="inline-flex items-center gap-1 bg-[#13213c] hover:bg-[#1d325a] text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>مشاهده کامل</span>
                      </button>
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
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#13213c] flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-white">
                      پرونده سیستم مدیریت: {selectedLead.companyName} ({selectedLead.code})
                    </h3>
                    <span className="bg-amber-400 text-[#13213c] font-black text-xs px-2.5 py-0.5 rounded-md">
                      {selectedLead.serviceScope}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    مخاطب: {selectedLead.contactPerson} | کارشناس فروش: {selectedLead.assignedExpertName}
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
              {/* استانداردهای درخواستی */}
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-3">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  <span>استانداردهای بین‌المللی انتخابی</span>
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedLead.requestedStandards.map((std, i) => (
                    <span key={i} className="bg-white border border-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-xl shadow-2xs">
                      🏆 {std}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs border-t border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[11px]">حوزه و صنعت:</span>
                    <strong className="text-slate-800">{selectedLead.industryField}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">تعداد پرسنل:</span>
                    <strong className="text-slate-800">{selectedLead.employeeCount || '-'}</strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block text-[11px]">مرجع صدور گواهینامه (CB):</span>
                    <strong className="text-slate-800">{selectedLead.certificationBodyPreference || 'مراجع معتبر تحت IAF'}</strong>
                  </div>
                </div>
              </div>

              {/* مخاطب و تماس */}
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">مخاطب / نماینده مدیریت:</span>
                  <strong className="text-slate-900 text-sm">{selectedLead.contactPerson}</strong>
                  <div className="text-slate-500 font-mono mt-0.5">{selectedLead.contactPhone}</div>
                </div>
                <a
                  href={`tel:${selectedLead.contactPhone}`}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>تماس با نماینده</span>
                </a>
              </div>

              {/* یادداشت‌ها و نتیجه تماس کارشناس فروش */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl space-y-1.5">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-700" />
                    <span>توضیحات کارشناس فروش:</span>
                  </span>
                  <p className="text-xs leading-relaxed text-amber-900">
                    {selectedLead.salesExpertNotes || 'توضیحی ثبت نشده است.'}
                  </p>
                </div>

                <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-2xl space-y-1.5">
                  <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-blue-700" />
                    <span>نتیجه آخرین تماس:</span>
                  </span>
                  <p className="text-xs leading-relaxed text-blue-900">
                    {selectedLead.lastCallResult || 'مذاکره اولیه'}
                  </p>
                  <div className="text-[11px] text-slate-500 pt-1">
                    پیگیری بعدی: {selectedLead.nextFollowUpDate || '-'}
                  </div>
                </div>
              </div>

              {/* نقشه و نشانی یکپارچه */}
              <div>
                <GoogleMapsLocationPicker
                  initialLocation={selectedLead.locationCoordinates}
                  onSelectLocation={() => {}}
                  readOnly={true}
                  addressValue={selectedLead.address}
                  title="موقعیت مکانی سازمان در نشان، بلد، اسنپ و گوگل‌مپ"
                />
              </div>

              {/* سوابق تماس و پیگیری شماره‌گذاری شده */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#13213c]">سوابق تماس و پیگیری (شماره‌گذاری شده)</span>
                  {onConvertToProject && (
                    <button
                      type="button"
                      onClick={() => {
                        onConvertToProject({
                          name: `پروژه سیستم مدیریت ${selectedLead.companyName}`,
                          employer: selectedLead.contactPerson,
                          phone: selectedLead.contactPhone,
                          address: selectedLead.address,
                          type: 'سیستم مدیریت و ایزو',
                          description: `استانداردها: ${selectedLead.requestedStandards.join('، ')}`
                        });
                        setSelectedLead(null);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      تبدیل به پروژه جاری
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {(selectedLead.followUpHistory || []).map((item, idx) => (
                    <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#13213c] text-[#d8b683] font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        {toFa(idx + 1)}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-slate-500 mb-1">
                          <span className="font-bold text-slate-800">{item.user}</span>
                          <span className="font-mono">{toFa(item.date)}</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">{item.note}</p>
                        <div className="mt-1 text-[11px] font-bold text-indigo-700">نتیجه: {item.result}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">ثبت پیگیری جدید در پرونده</span>
                    <VoiceInputButton onTranscript={(t) => setNewFollowUpNote(prev => prev ? `${prev} ${t}` : t)} />
                  </div>
                  <textarea
                    rows={2}
                    value={newFollowUpNote}
                    onChange={e => setNewFollowUpNote(e.target.value)}
                    placeholder="شرح مذاکره جدید با نماینده مدیریت..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newFollowUpResult}
                      onChange={e => setNewFollowUpResult(e.target.value)}
                      placeholder="نتیجه تماس..."
                      className="flex-1 p-2 rounded-xl border border-slate-300 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newFollowUpNote.trim()) return;
                        const entry = {
                          id: Date.now(),
                          date: getExactShamsiTimestamp(),
                          user: currentUser.name,
                          note: newFollowUpNote,
                          result: newFollowUpResult
                        };
                        const updated: ManagementSystemLeadItem = {
                          ...selectedLead,
                          lastCallResult: newFollowUpResult,
                          followUpHistory: [entry, ...(selectedLead.followUpHistory || [])]
                        };
                        setManagementLeads(prev => prev.map(l => l.id === selectedLead.id ? updated : l));
                        setSelectedLead(updated);
                        setNewFollowUpNote('');
                        setToastMessage('سابقه پیگیری جدید در پرونده سیستم مدیریت ثبت شد.');
                      }}
                      className="bg-[#13213c] hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      ثبت پیگیری
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end">
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

      {/* Add Management Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#13213c] text-white p-5 flex items-center justify-between border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-[#13213c] flex items-center justify-center font-black">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">ثبت پرونده سیستم مدیریت (ISO) جدید</h3>
                  <p className="text-xs text-slate-300">استانداردهای بین‌المللی ایزو، مستندسازی و ممیزی صدور گواهینامه</p>
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

            <form onSubmit={handleCreateManagementLead} className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="space-y-3">
                <h4 className="font-bold text-[#13213c] text-xs border-b pb-1.5 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-amber-600" />
                  <span>۱. مشخصات شرکت یا سازمان متقاضی</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">نام سازمان / شرکت *</label>
                    <input
                      type="text"
                      required
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      placeholder="مثال: شرکت داروسازی البرز شیمی"
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">حوزه و صنعت فعالیت</label>
                    <input
                      type="text"
                      value={form.industryField}
                      onChange={(e) => setForm({ ...form, industryField: e.target.value })}
                      placeholder="مثال: صنایع دارویی، غذایی، ساختمانی، IT..."
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">نام مخاطب / نماینده مدیریت *</label>
                    <input
                      type="text"
                      required
                      value={form.contactPerson}
                      onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                      placeholder="مثال: دکتر فروزش"
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">شماره تماس *</label>
                    <input
                      type="text"
                      required
                      value={form.contactPhone}
                      onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                      placeholder="مثال: 09121112233"
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                    />
                  </div>
                </div>
              </div>

              {/* بخش ۲: انتخاب استانداردهای ایزو */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#13213c] text-xs border-b pb-1.5 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>۲. استانداردهای درخواستی (بر اساس سیستم‌های مدیریتی رایج)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
                  {COMMON_ISO_STANDARDS.map((std, i) => (
                    <label key={i} className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-200 text-slate-800 cursor-pointer hover:bg-amber-50/50">
                      <input
                        type="checkbox"
                        checked={form.requestedStandards.includes(std)}
                        onChange={() => toggleStandardSelection(std)}
                        className="rounded text-[#13213c]"
                      />
                      <span className="font-medium text-[11px]">{std}</span>
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">دامنه خدمات</label>
                    <select
                      value={form.serviceScope}
                      onChange={(e) => setForm({ ...form, serviceScope: e.target.value as any })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c] bg-white"
                    >
                      <option value="مشاوره و استقرار کامل">مشاوره و استقرار کامل</option>
                      <option value="ممیزی داخلی و گپ آنالیز">ممیزی داخلی و گپ آنالیز</option>
                      <option value="ممیزی صدور گواهینامه CB">ممیزی صدور گواهینامه CB</option>
                      <option value="آموزش و تمدید سالانه">آموزش و تمدید سالانه</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">مرجع صدور گواهی مدنظر (CB)</label>
                    <input
                      type="text"
                      value={form.certificationBodyPreference}
                      onChange={(e) => setForm({ ...form, certificationBodyPreference: e.target.value })}
                      placeholder="مثال: توف، داکس، SGS، بی کیو سی..."
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                    />
                  </div>
                </div>
              </div>

              {/* بخش ۳: نقشه و نشانی یکپارچه */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#13213c] text-xs border-b pb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-600" />
                  <span>۳. نشانی یکپارچه سازمان و کارخانه (نشان، بلد، اسنپ)</span>
                </h4>
                <GoogleMapsLocationPicker
                  initialLocation={form.locationCoordinates}
                  onSelectLocation={(loc) => setForm(prev => ({ ...prev, locationCoordinates: loc }))}
                  addressValue={form.address}
                  onAddressChange={(addr) => setForm(prev => ({ ...prev, address: addr }))}
                  title="موقعیت مکانی و نشانی سازمان"
                />
              </div>

              {/* بخش ۴: توضیحات کارشناس فروش با میکروفون */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="font-bold text-[#13213c] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>۴. توضیحات کارشناس فروش و مذاکرات</span>
                  </span>
                  <VoiceInputButton
                    onTranscript={(text) => {
                      setForm(prev => ({
                        ...prev,
                        salesExpertNotes: prev.salesExpertNotes ? `${prev.salesExpertNotes} ${text}` : text
                      }));
                    }}
                    buttonText="صحبت با میکروفون"
                  />
                </div>

                <div>
                  <textarea
                    rows={3}
                    value={form.salesExpertNotes}
                    onChange={(e) => setForm({ ...form, salesExpertNotes: e.target.value })}
                    placeholder="توضیحات کارشناس فروش، نیازهای سازمانی یا با میکروفون صحبت کنید..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                  />
                </div>
              </div>

              {/* Cross-Referral to other departments */}
              <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-black text-indigo-950">ارجاع همزمان سرنخ به سایر دپارتمان‌های رابو:</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.crossRefFire}
                      onChange={e => setForm({ ...form, crossRefFire: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    ارجاع به واحد آتش‌نشانی
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.crossRefEnergy}
                      onChange={e => setForm({ ...form, crossRefEnergy: e.target.checked })}
                      className="rounded text-amber-600"
                    />
                    ارجاع به واحد انرژی و سولار
                  </label>
                </div>
              </div>

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
                  <span>ثبت پرونده سیستم مدیریت</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
