import React, { useState } from 'react';
import { EnergyLeadItem, Employee } from '../../types';
import { 
  Zap, 
  Sun, 
  ShieldCheck, 
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
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { GoogleMapsLocationPicker, LocationCoordinates } from '../GoogleMapsLocationPicker';
import { VoiceInputButton } from '../VoiceInputButton';
import { toFa, getExactShamsiTimestamp } from '../../utils/jalali';

interface EnergyLeadsBankProps {
  currentUser: Employee;
  energyLeads: EnergyLeadItem[];
  setEnergyLeads: React.Dispatch<React.SetStateAction<EnergyLeadItem[]>>;
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

export const EnergyLeadsBank: React.FC<EnergyLeadsBankProps> = ({
  currentUser,
  energyLeads,
  setEnergyLeads,
  personnelList,
  todayStr,
  setToastMessage,
  onCrossRefer,
  onConvertToProject
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<EnergyLeadItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFollowUpNote, setNewFollowUpNote] = useState('');
  const [newFollowUpResult, setNewFollowUpResult] = useState('ارسال پروپوزال ممیزی انرژی / نیروگاه خورشیدی');

  // New Energy Lead form state
  const [form, setForm] = useState({
    code: `NRG-${Math.floor(1000 + Math.random() * 9000)}`,
    manualFileNo: '',
    facilityName: '',
    clientName: '',
    gender: 'آقا' as 'آقا' | 'خانم',
    clientPhone: '',
    nationalId: '',
    facilityType: 'صنعتی - تولیدی' as EnergyLeadItem['facilityType'],
    address: 'تهران، جاده مخصوص کرج',
    energyServiceType: 'ممیزی تفصیلی انرژی' as EnergyLeadItem['energyServiceType'],
    solarCapacityKw: '',
    contractDemandKw: '',
    averageMonthlyBill: '',
    estimatedEnergySaving: '',
    criticalEquipmentStr: 'چیلرهای مرکزی، بویلرها، الکتروموتورها',
    salesExpertNotes: '',
    contactDate: todayStr,
    lastCallResult: 'مذاکره اولیه پیرامون کاهش هزینه‌های انرژی و قبض برق',
    nextFollowUpDate: todayStr,
    leadTemperature: 'گرم' as 'داغ' | 'گرم' | 'متوسط' | 'سرد',
    assignedExpertId: 'EMP-08',
    crossRefFire: false,
    crossRefIso: false,
    locationCoordinates: {
      lat: 35.7022,
      lng: 51.1873,
      addressDescription: 'تهران، جاده مخصوص کرج'
    } as LocationCoordinates
  });

  const filteredLeads = energyLeads.filter(lead => {
    // Data isolation: non-managers only see leads assigned to them
    if (!currentUser.isManager) {
      const isAssigned = 
        lead.assignedExpertId === currentUser.id ||
        lead.assignedExpertName === currentUser.name;
      if (!isAssigned) return false;
    }

    const q = searchQuery.trim().toLowerCase();
    const matchQuery = !q || 
      lead.facilityName?.toLowerCase().includes(q) ||
      lead.clientName?.toLowerCase().includes(q) ||
      lead.code?.toLowerCase().includes(q) ||
      lead.manualFileNo?.toLowerCase().includes(q) ||
      lead.clientPhone?.includes(q);

    const matchType = filterType === 'all' || lead.energyServiceType.includes(filterType);
    return matchQuery && matchType;
  });

  const handleCreateEnergyLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.facilityName.trim() || !form.clientName.trim()) {
      setToastMessage('لطفاً نام مجتمع و نام کارفرما را وارد فرمایید.');
      return;
    }

    const assigned = personnelList.find(p => p.id === form.assignedExpertId) || personnelList[0];

    const newLead: EnergyLeadItem = {
      id: `NRG-${Date.now()}`,
      code: form.code,
      manualFileNo: form.manualFileNo,
      facilityName: form.facilityName,
      clientName: form.clientName,
      gender: form.gender,
      clientPhone: form.clientPhone,
      nationalId: form.nationalId,
      facilityType: form.facilityType,
      address: form.address,
      locationCoordinates: form.locationCoordinates,
      energyServiceType: form.energyServiceType,
      solarCapacityKw: form.solarCapacityKw,
      contractDemandKw: form.contractDemandKw,
      averageMonthlyBill: form.averageMonthlyBill,
      estimatedEnergySaving: form.estimatedEnergySaving,
      criticalEquipment: form.criticalEquipmentStr ? form.criticalEquipmentStr.split('،').map(s => s.trim()) : [],
      salesExpertNotes: form.salesExpertNotes,
      contactDate: form.contactDate,
      lastCallResult: form.lastCallResult,
      nextFollowUpDate: form.nextFollowUpDate,
      leadTemperature: form.leadTemperature,
      status: 'در حال مذاکره فنی',
      assignedExpertId: assigned.id,
      assignedExpertName: assigned.name,
      followUpHistory: [
        {
          id: 1,
          date: `${form.contactDate} - ۱۰:۰۰`,
          user: assigned.name,
          note: form.salesExpertNotes || 'ثبت پرونده در بانک اطلاعات انرژی',
          result: form.lastCallResult
        }
      ]
    };

    setEnergyLeads([newLead, ...energyLeads]);

    const targets: ('fire' | 'energy' | 'management')[] = [];
    if (form.crossRefFire) targets.push('fire');
    if (form.crossRefIso) targets.push('management');
    if (targets.length > 0 && onCrossRefer) {
      onCrossRefer({
        sourceDepartment: 'energy',
        targetDepartments: targets,
        clientName: form.clientName,
        gender: form.gender,
        companyName: form.facilityName,
        phone: form.clientPhone,
        nationalId: form.nationalId,
        address: form.address,
        notes: form.salesExpertNotes,
        referredBy: currentUser.name
      });
    } else {
      setToastMessage(`پرونده تخصصی انرژی ${newLead.code} با موفقیت ثبت شد.`);
    }

    setShowAddModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-[#13213c]">بانک اطلاعات انرژی</h2>
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold px-2 py-0.5 rounded-full">
              {filteredLeads.length} پرونده
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ممیزی تفصیلی انرژی، استقرار سیستم مدیریت انرژی ISO 50001 و احداث نیروگاه‌های خورشیدی (سولار)
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-[#800000] hover:bg-[#660000] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>ثبت پرونده انرژی جدید</span>
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
            placeholder="جستجو بر اساس نام تاسیسات، کارفرما، کد انرژی یا تلفن..."
            className="w-full pl-3 pr-9 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-bold">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterType === 'all' ? 'bg-[#13213c] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            همه
          </button>
          <button
            onClick={() => setFilterType('ممیزی')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterType === 'ممیزی' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            ⚡ ممیزی انرژی
          </button>
          <button
            onClick={() => setFilterType('خورشیدی')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterType === 'خورشیدی' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
            }`}
          >
            ☀️ پنل خورشیدی
          </button>
          <button
            onClick={() => setFilterType('ISO 50001')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterType === 'ISO 50001' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            🛡️ سیستم مدیریت انرژی
          </button>
        </div>
      </div>

      {/* Row-based table display */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-[#13213c] text-white font-bold border-b border-slate-700">
                <th className="p-3.5 whitespace-nowrap">کد پرونده انرژی</th>
                <th className="p-3.5 whitespace-nowrap">نام مجتمع / کارخانه</th>
                <th className="p-3.5 whitespace-nowrap">کارفرما / مدیر</th>
                <th className="p-3.5 whitespace-nowrap">محور تخصصی انرژی</th>
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
                    پرونده انرژی یافت نشد.
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
                          {lead.code}
                        </span>
                        {lead.manualFileNo && (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {lead.manualFileNo}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{lead.facilityName}</div>
                      <div className="text-[11px] text-slate-500">{lead.facilityType}</div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{lead.clientName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{lead.clientPhone}</div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                        lead.energyServiceType.includes('خورشیدی')
                          ? 'bg-orange-50 text-orange-800 border border-orange-200'
                          : lead.energyServiceType.includes('ISO 50001')
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-900 border border-amber-200'
                      }`}>
                        {lead.energyServiceType}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-700 font-semibold">
                      {lead.solarCapacityKw || lead.contractDemandKw || lead.estimatedEnergySaving || '-'}
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
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                        {lead.status}
                      </span>
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
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-white">
                      پرونده انرژی: {selectedLead.facilityName} ({selectedLead.code})
                    </h3>
                    <span className="bg-amber-400 text-[#13213c] font-black text-xs px-2.5 py-0.5 rounded-md">
                      {selectedLead.energyServiceType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    کارفرما: {selectedLead.clientName} | کارشناس فروش: {selectedLead.assignedExpertName}
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
              {/* بخش ۱: شاخص‌های فنی-مالی انرژی */}
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-3">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Activity className="w-4 h-4 text-amber-600" />
                  <span>شاخص‌های فنی، مصرف و تحلیل انرژی</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">نوع کاربری تاسیسات:</span>
                    <strong className="text-slate-800">{selectedLead.facilityType}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">ظرفیت پنل خورشیدی:</span>
                    <strong className="text-orange-700">{selectedLead.solarCapacityKw || 'فاقد سولار'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">دیماند برق قراردادی:</span>
                    <strong className="text-slate-800">{selectedLead.contractDemandKw || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">متوسط قبوض ماهانه:</span>
                    <strong className="text-slate-800">{selectedLead.averageMonthlyBill || '-'}</strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block text-[11px]">پتانسیل صرفه‌جویی / معافیت:</span>
                    <span className="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded">
                      {selectedLead.estimatedEnergySaving || 'نیازمند ممیزی میدانی'}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block text-[11px]">تجهیزات پرمصرف کلیدی:</span>
                    <strong className="text-slate-800">
                      {selectedLead.criticalEquipment && selectedLead.criticalEquipment.length > 0 
                        ? selectedLead.criticalEquipment.join('، ')
                        : 'چیلرها و بویلرها'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* بخش ۲: تماس و کارفرما */}
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">کارفرما / مدیر انرژی:</span>
                  <strong className="text-slate-900 text-sm">{selectedLead.clientName}</strong>
                  <div className="text-slate-500 font-mono mt-0.5">{selectedLead.clientPhone}</div>
                </div>
                <a
                  href={`tel:${selectedLead.clientPhone}`}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>تماس با کارفرما</span>
                </a>
              </div>

              {/* بخش ۳: توضیحات کارشناس فروش */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl space-y-1.5">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-700" />
                    <span>توضیحات کارشناس فروش:</span>
                  </span>
                  <p className="text-xs leading-relaxed text-amber-900">
                    {selectedLead.salesExpertNotes || 'توضیحاتی درج نشده است.'}
                  </p>
                </div>

                <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-2xl space-y-1.5">
                  <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-blue-700" />
                    <span>نتیجه آخرین تماس کارشناس فروش:</span>
                  </span>
                  <p className="text-xs leading-relaxed text-blue-900">
                    {selectedLead.lastCallResult || 'تماس اولیه ثبت شده.'}
                  </p>
                  <div className="text-[11px] text-slate-500 pt-1">
                    پیگیری بعدی: {selectedLead.nextFollowUpDate || '-'}
                  </div>
                </div>
              </div>

              {/* بخش ۴: نقشه و نشانی یکپارچه */}
              <div>
                <GoogleMapsLocationPicker
                  initialLocation={selectedLead.locationCoordinates}
                  onSelectLocation={() => {}}
                  readOnly={true}
                  addressValue={selectedLead.address}
                  title="موقعیت مکانی مجتمع صنعتی/تجاری در نشان، بلد، اسنپ و گوگل‌مپ"
                />
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {onConvertToProject && !selectedLead.status.includes('قرارداد') && (
                  <button
                    type="button"
                    onClick={() => {
                      onConvertToProject(selectedLead);
                      setEnergyLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status: 'عقد قرارداد (تبدیل به پروژه)' } : l));
                      setSelectedLead(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>تبدیل به پروژه جاری</span>
                  </button>
                )}
                {onCrossRefer && (
                  <button
                    type="button"
                    onClick={() => onCrossRefer({
                      sourceDept: 'انرژی',
                      targetDepts: ['management'],
                      ownerName: selectedLead.clientName,
                      gender: selectedLead.gender,
                      phone: selectedLead.clientPhone,
                      companyOrFacilityName: selectedLead.facilityName,
                      address: selectedLead.address,
                      notes: selectedLead.salesExpertNotes || 'ارجاع از واحد انرژی',
                      marketerName: selectedLead.assignedExpertName || currentUser.name
                    })}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold px-3 py-2 rounded-xl text-xs cursor-pointer"
                  >
                    ارجاع همزمان به واحد سیستم مدیریت
                  </button>
                )}
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

      {/* Add Energy Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#13213c] text-white p-5 flex items-center justify-between border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-[#13213c] flex items-center justify-center font-black">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">ثبت پرونده تخصصی انرژی جدید</h3>
                  <p className="text-xs text-slate-300">ممیزی تفصیلی انرژی، سیستم مدیریت ISO 50001 و پنل خورشیدی</p>
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

            <form onSubmit={handleCreateEnergyLead} className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="space-y-3">
                <h4 className="font-bold text-[#13213c] text-xs border-b pb-1.5 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-amber-600" />
                  <span>۱. مشخصات تاسیسات و کارفرما</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">نام مجتمع / کارخانه / ساختمان *</label>
                    <input
                      type="text"
                      required
                      value={form.facilityName}
                      onChange={(e) => setForm({ ...form, facilityName: e.target.value })}
                      placeholder="مثال: کارخانه داروسازی یا مجتمع تجاری میلاد"
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">نوع کاربری تاسیسات</label>
                    <select
                      value={form.facilityType}
                      onChange={(e) => setForm({ ...form, facilityType: e.target.value as any })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c] bg-white"
                    >
                      <option value="صنعتی - تولیدی">صنعتی - تولیدی</option>
                      <option value="تجاری - اداری">تجاری - اداری</option>
                      <option value="بیمارستانی">بیمارستانی</option>
                      <option value="مسکونی بلندمرتبه">مسکونی بلندمرتبه</option>
                      <option value="کشاورزی">کشاورزی</option>
                    </select>
                  </div>
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
                    <label className="block text-slate-700 font-bold mb-1">نام کارفرما / مدیر انرژی *</label>
                    <input
                      type="text"
                      required
                      value={form.clientName}
                      onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                      placeholder="مثال: مهندس فرشید اکبری"
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">شماره تماس کارفرما *</label>
                    <input
                      type="text"
                      required
                      value={form.clientPhone}
                      onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
                      placeholder="مثال: 09121112233"
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                    />
                  </div>
                </div>
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
                      checked={form.referToFire}
                      onChange={e => setForm({ ...form, referToFire: e.target.checked })}
                      className="rounded text-[#13213c]"
                    />
                    <span>ارجاع همزمان به واحد مهندسی حریق</span>
                  </label>
                </div>
              </div>

              {/* بخش ۲: محور خدمات انرژی */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#13213c] text-xs border-b pb-1.5 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>۲. خدمات انرژی و شاخص‌های فنی</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">محور تخصصی خدمات انرژی</label>
                    <select
                      value={form.energyServiceType}
                      onChange={(e) => setForm({ ...form, energyServiceType: e.target.value as any })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c] bg-white"
                    >
                      <option value="ممیزی تفصیلی انرژی">ممیزی تفصیلی انرژی</option>
                      <option value="نیروگاه و پنل‌های خورشیدی (سولار)">نیروگاه و پنل‌های خورشیدی (سولار)</option>
                      <option value="استقرار سیستم مدیریت انرژی (ISO 50001)">استقرار سیستم مدیریت انرژی (ISO 50001)</option>
                      <option value="ترکیبی">ترکیبی (سولار + ممیزی + استاندارد)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">ظرفیت نیروگاه خورشیدی (کیلووات / مگاوات)</label>
                    <input
                      type="text"
                      value={form.solarCapacityKw}
                      onChange={(e) => setForm({ ...form, solarCapacityKw: e.target.value })}
                      placeholder="مثال: ۲۵۰ کیلووات سقفی On-Grid"
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">دیماند برق قراردادی یا مصرف ماهانه</label>
                    <input
                      type="text"
                      value={form.contractDemandKw}
                      onChange={(e) => setForm({ ...form, contractDemandKw: e.target.value })}
                      placeholder="مثال: ۱۲۰۰ کیلووات"
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">میانگین قبوض ماهانه انرژی (تومان)</label>
                    <input
                      type="text"
                      value={form.averageMonthlyBill}
                      onChange={(e) => setForm({ ...form, averageMonthlyBill: e.target.value })}
                      placeholder="مثال: ۱۵۰,۰۰۰,۰۰۰ تومان"
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                    />
                  </div>
                </div>
              </div>

              {/* بخش ۳: نقشه و نشانی یکپارچه */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#13213c] text-xs border-b pb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-600" />
                  <span>۳. نشانی یکپارچه مجتمع و نقشه (نشان، بلد، اسنپ)</span>
                </h4>
                <GoogleMapsLocationPicker
                  initialLocation={form.locationCoordinates}
                  onSelectLocation={(loc) => setForm(prev => ({ ...prev, locationCoordinates: loc }))}
                  addressValue={form.address}
                  onAddressChange={(addr) => setForm(prev => ({ ...prev, address: addr }))}
                  title="موقعیت مکانی و نشانی مجتمع صنعتی / تجاری"
                />
              </div>

              {/* بخش ۴: توضیحات کارشناس فروش با میکروفون */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="font-bold text-[#13213c] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>۴. توضیحات کارشناس فروش و وضعیت پیگیری</span>
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
                    placeholder="توضیحات و مذاکرات کارشناس فروش پیرامون بارهای مصرفی و برآورد فنی..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                  />
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
                  <span>ثبت پرونده انرژی</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
