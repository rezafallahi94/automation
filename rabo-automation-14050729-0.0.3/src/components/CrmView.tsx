import React, { useState } from 'react';
import { 
  CrmLead, 
  Employee, 
  Project, 
  EnergyLeadItem, 
  ManagementSystemLeadItem, 
  ContactBookItem 
} from '../types';
import { 
  initialEnergyLeads, 
  initialManagementLeads, 
  initialContactBook 
} from '../data/initialData';
import { FireLeadsBank } from './crm/FireLeadsBank';
import { EnergyLeadsBank } from './crm/EnergyLeadsBank';
import { ManagementLeadsBank } from './crm/ManagementLeadsBank';
import { ContactsBookView } from './crm/ContactsBookView';
import { FollowUpsBank } from './crm/FollowUpsBank';
import { toFa, getExactShamsiTimestamp } from '../utils/jalali';
import { MapPin, BarChart3, Users, PhoneCall, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Share2 } from 'lucide-react';

interface CrmViewProps {
  currentSubView: 'leads' | 'due-today' | 'meetings' | 'leads-energy' | 'leads-management' | 'customers';
  currentUser: Employee;
  crmLeads: CrmLead[];
  setCrmLeads: React.Dispatch<React.SetStateAction<CrmLead[]>>;
  energyLeads?: EnergyLeadItem[];
  setEnergyLeads?: React.Dispatch<React.SetStateAction<EnergyLeadItem[]>>;
  managementLeads?: ManagementSystemLeadItem[];
  setManagementLeads?: React.Dispatch<React.SetStateAction<ManagementSystemLeadItem[]>>;
  contactsList?: ContactBookItem[];
  setContactsList?: React.Dispatch<React.SetStateAction<ContactBookItem[]>>;
  personnelList: Employee[];
  projectsList: Project[];
  setProjectsList: React.Dispatch<React.SetStateAction<Project[]>>;
  setPersonnelList: React.Dispatch<React.SetStateAction<Employee[]>>;
  todayStr: string;
  setToastMessage: (msg: string) => void;
  onInspectLocation?: (address: string) => void;
}

export const CrmView: React.FC<CrmViewProps> = ({
  currentSubView,
  currentUser,
  crmLeads,
  setCrmLeads,
  energyLeads: propEnergyLeads,
  setEnergyLeads: propSetEnergyLeads,
  managementLeads: propManagementLeads,
  setManagementLeads: propSetManagementLeads,
  contactsList: propContactsList,
  setContactsList: propSetContactsList,
  personnelList,
  projectsList,
  setProjectsList,
  setPersonnelList,
  todayStr,
  setToastMessage,
  onInspectLocation
}) => {
  const [localEnergyLeads, setLocalEnergyLeads] = useState<EnergyLeadItem[]>(initialEnergyLeads);
  const [localManagementLeads, setLocalManagementLeads] = useState<ManagementSystemLeadItem[]>(initialManagementLeads);
  const [localContactsList, setLocalContactsList] = useState<ContactBookItem[]>(initialContactBook);

  const energyLeads = propEnergyLeads ?? localEnergyLeads;
  const setEnergyLeads = propSetEnergyLeads ?? setLocalEnergyLeads;
  const managementLeads = propManagementLeads ?? localManagementLeads;
  const setManagementLeads = propSetManagementLeads ?? setLocalManagementLeads;
  const contactsList = propContactsList ?? localContactsList;
  const setContactsList = propSetContactsList ?? setLocalContactsList;

  const [showManagerAnalytics, setShowManagerAnalytics] = useState<boolean>(false);

  // Real-Time Multi-Department Cross-Referral Engine
  const handleCrossReferLead = (payload: {
    sourceDept: string;
    targetDepts: ('fire' | 'energy' | 'management')[];
    ownerName: string;
    gender?: 'آقا' | 'خانم';
    phone: string;
    companyOrFacilityName?: string;
    address: string;
    notes: string;
    marketerName: string;
  }) => {
    const referredNames: string[] = [];

    if (payload.targetDepts.includes('energy')) {
      const newEnergy: EnergyLeadItem = {
        id: `ENG-REF-${Date.now()}`,
        code: `EN-${Math.floor(1000 + Math.random() * 9000)}`,
        facilityName: payload.companyOrFacilityName || `مجتمع ${payload.ownerName}`,
        facilityType: 'تجاری - اداری',
        gender: payload.gender || 'آقا',
        clientName: payload.ownerName,
        clientPhone: payload.phone,
        energyServiceType: 'ترکیبی',
        address: payload.address || 'تهران',
        assignedExpertId: currentUser.id,
        assignedExpertName: payload.marketerName || currentUser.name,
        leadTemperature: 'داغ',
        status: 'شناسایی اولیه (ارجاع بین‌واحدی)',
        salesExpertNotes: `[ارجاع خودکار از واحد ${payload.sourceDept}] ${payload.notes}`,
        lastCallResult: `ارجاع شده از واحد ${payload.sourceDept} در تاریخ ${todayStr}`,
        nextFollowUpDate: todayStr,
        createdAt: getExactShamsiTimestamp(),
        referredFromDept: payload.sourceDept,
        followUps: [
          {
            id: Date.now(),
            date: getExactShamsiTimestamp(),
            user: currentUser.name,
            note: `ثبت خودکار از طریق ارجاع همزمان واحد ${payload.sourceDept} - ${payload.notes}`,
            nextDate: todayStr
          }
        ]
      };
      setEnergyLeads(prev => [newEnergy, ...prev]);
      referredNames.push('واحد انرژی');
    }

    if (payload.targetDepts.includes('management')) {
      const newIso: ManagementSystemLeadItem = {
        id: `ISO-REF-${Date.now()}`,
        code: `ISO-${Math.floor(1000 + Math.random() * 9000)}`,
        companyName: payload.companyOrFacilityName || `مجموعه ${payload.ownerName}`,
        industryField: 'ساختمانی و مهندسی',
        gender: payload.gender || 'آقا',
        contactPerson: payload.ownerName,
        contactPhone: payload.phone,
        requestedStandards: ['ISO 9001:2015 (مدیریت کیفیت)', 'ISO 45001:2018 (ایمنی و بهداشت شغلی)'],
        serviceScope: 'مشاوره و استقرار کامل',
        address: payload.address || 'تهران',
        assignedExpertId: currentUser.id,
        assignedExpertName: payload.marketerName || currentUser.name,
        leadTemperature: 'داغ',
        status: 'ارزیابی اولیه (ارجاع بین‌واحدی)',
        salesExpertNotes: `[ارجاع خودکار از واحد ${payload.sourceDept}] ${payload.notes}`,
        lastCallResult: `ارجاع شده از واحد ${payload.sourceDept} در تاریخ ${todayStr}`,
        nextFollowUpDate: todayStr,
        createdAt: getExactShamsiTimestamp(),
        referredFromDept: payload.sourceDept,
        followUps: [
          {
            id: Date.now() + 1,
            date: getExactShamsiTimestamp(),
            user: currentUser.name,
            note: `ثبت خودکار از طریق ارجاع همزمان واحد ${payload.sourceDept} - ${payload.notes}`,
            nextDate: todayStr
          }
        ]
      };
      setManagementLeads(prev => [newIso, ...prev]);
      referredNames.push('واحد سیستم مدیریت (ISO)');
    }

    if (payload.targetDepts.includes('fire')) {
      const newFire: CrmLead = {
        id: `CRM-REF-${Date.now()}`,
        urbanCode: `F-${Math.floor(10000 + Math.random() * 90000)}`,
        gender: payload.gender || 'آقا',
        ownerName: payload.ownerName,
        ownerPhone: payload.phone,
        buildingUsage: 'تجاری - اداری',
        floorsAbove: 5,
        floorsBelow: 2,
        address: payload.address || 'تهران',
        unit: 'مهندسی حریق',
        status: 'ثبت اولیه (ارجاع بین‌واحدی)',
        assignedTo: payload.marketerName || currentUser.name,
        assignedMarketerName: payload.marketerName || currentUser.name,
        assignedExpertId: currentUser.id,
        assignedExpertName: currentUser.name,
        leadTemperature: 'داغ',
        salesExpertNotes: `[ارجاع خودکار از واحد ${payload.sourceDept}] ${payload.notes}`,
        lastCallResult: `ارجاع شده از واحد ${payload.sourceDept}`,
        nextFollowUpDate: todayStr,
        contactDate: todayStr,
        referredFromDept: payload.sourceDept,
        followUps: [
          {
            id: Date.now() + 2,
            date: getExactShamsiTimestamp(),
            user: currentUser.name,
            note: `ثبت خودکار از طریق ارجاع همزمان واحد ${payload.sourceDept} - ${payload.notes}`
          }
        ]
      };
      setCrmLeads(prev => [newFire, ...prev]);
      referredNames.push('واحد مهندسی حریق');
    }

    if (referredNames.length > 0) {
      setToastMessage(`پرونده «${payload.ownerName}» به صورت آنی به کارتابل ${referredNames.join(' و ')} ارجاع و همگام‌سازی شد.`);
    }
  };

  // Compute Marketer Performance & Rejection Analytics for Senior Managers
  const allCombinedLeads = [
    ...crmLeads.map(l => ({
      marketer: l.assignedMarketerName || l.assignedExpertName || 'کارشناس فروش',
      callsCount: (l.followUps?.length || 0) + (l.lastCallResult ? 1 : 0),
      isConverted: l.status.includes('قرارداد') || Boolean(l.convertedToProjectId),
      isRejected: l.status.includes('عدم') || l.status.includes('بایگانی') || Boolean(l.rejectionReason),
      rejectionReason: l.rejectionReason || (l.status.includes('عدم') ? 'قیمت بالاتر از رقبا' : ''),
      isHot: l.leadTemperature === 'داغ'
    })),
    ...energyLeads.map(l => ({
      marketer: l.assignedExpertName || 'کارشناس فروش',
      callsCount: (l.followUps?.length || 0) + (l.lastCallResult ? 1 : 0),
      isConverted: l.status.includes('قرارداد'),
      isRejected: l.status.includes('عدم') || Boolean(l.rejectionReason),
      rejectionReason: l.rejectionReason || '',
      isHot: l.leadTemperature === 'داغ'
    })),
    ...managementLeads.map(l => ({
      marketer: l.assignedExpertName || 'کارشناس فروش',
      callsCount: (l.followUps?.length || 0) + (l.lastCallResult ? 1 : 0),
      isConverted: l.status.includes('قرارداد'),
      isRejected: l.status.includes('عدم') || Boolean(l.rejectionReason),
      rejectionReason: l.rejectionReason || '',
      isHot: l.leadTemperature === 'داغ'
    }))
  ];

  const marketerStatsMap: Record<string, { totalLeads: number; totalCalls: number; converted: number; hot: number; rejected: number }> = {};
  personnelList.forEach(p => {
    if (p.unit?.includes('فروش') || p.unit?.includes('بازاریابی') || p.isManager) {
      marketerStatsMap[p.name] = { totalLeads: 0, totalCalls: 0, converted: 0, hot: 0, rejected: 0 };
    }
  });

  const rejectionReasonsCount: Record<string, number> = {
    'قیمت بالاتر از رقبا': 0,
    'توقف یا تعلیق پروژه ساختمانی': 0,
    'همکاری با مشاور قبلی': 0,
    'عدم نیاز فعلی به خدمات مهندسی': 0,
    'عدم پاسخگویی یا انصراف کارفرما': 0
  };

  allCombinedLeads.forEach(item => {
    if (!marketerStatsMap[item.marketer]) {
      marketerStatsMap[item.marketer] = { totalLeads: 0, totalCalls: 0, converted: 0, hot: 0, rejected: 0 };
    }
    marketerStatsMap[item.marketer].totalLeads += 1;
    marketerStatsMap[item.marketer].totalCalls += item.callsCount;
    if (item.isConverted) marketerStatsMap[item.marketer].converted += 1;
    if (item.isHot) marketerStatsMap[item.marketer].hot += 1;
    if (item.isRejected) {
      marketerStatsMap[item.marketer].rejected += 1;
      const rKey = item.rejectionReason && rejectionReasonsCount[item.rejectionReason] !== undefined
        ? item.rejectionReason
        : 'قیمت بالاتر از رقبا';
      rejectionReasonsCount[rKey] = (rejectionReasonsCount[rKey] || 0) + 1;
    }
  });

  const renderManagerAnalyticsBanner = () => {
    if (!currentUser.isManager) return null;
    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden mb-4">
        <div
          onClick={() => setShowManagerAnalytics(!showManagerAnalytics)}
          className="bg-gradient-to-l from-[#13213c] to-[#1e345e] text-white px-5 py-3.5 flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-xs sm:text-sm font-black">
                گزارش تحلیلی عملکرد بازاریابان، نرخ تبدیل به قرارداد و تحلیل دلایل عدم همکاری (ویژه مدیران ارشد)
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                پایش لحظه‌ای تعداد تماس‌های ثبت‌شده، پرونده‌های داغ، قراردادهای منعقدشده و علل رد پیشنهاد در کل دپارتمان‌ها
              </p>
            </div>
          </div>
          <button type="button" className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl text-xs font-bold">
            <span>{showManagerAnalytics ? 'بستن گزارش تحلیلی' : 'مشاهده آمار تحلیلی'}</span>
            {showManagerAnalytics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showManagerAnalytics && (
          <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs bg-slate-50/50">
            {/* جدول عملکرد بازاریابان */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4">
              <h4 className="font-black text-[#13213c] mb-3 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-600" />
                <span>جدول کارکرد کارشناسان فروش و نرخ تبدیل به قرارداد</span>
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2.5">نام کارشناس / مدیر فروش</th>
                      <th className="p-2.5 text-center">کل پرونده‌ها</th>
                      <th className="p-2.5 text-center">تعداد تماس و پیگیری</th>
                      <th className="p-2.5 text-center">پرونده داغ</th>
                      <th className="p-2.5 text-center">تبدیل به پروژه</th>
                      <th className="p-2.5 text-center">نرخ موفقیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(marketerStatsMap).map(([name, st]) => {
                      const rate = st.totalLeads > 0 ? Math.round((st.converted / st.totalLeads) * 100) : 0;
                      return (
                        <tr key={name} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-800">{name}</td>
                          <td className="p-2.5 text-center font-bold">{toFa(st.totalLeads)}</td>
                          <td className="p-2.5 text-center text-blue-700 font-bold">{toFa(st.totalCalls)} تماس</td>
                          <td className="p-2.5 text-center text-rose-700 font-bold">{toFa(st.hot)}</td>
                          <td className="p-2.5 text-center text-emerald-700 font-black">{toFa(st.converted)}</td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                              ٪{toFa(rate)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* نمودار دلایل عدم همکاری */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h4 className="font-black text-[#800000] mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>تحلیل دلایل عدم همکاری و رد پیشنهاد کارفرمایان</span>
              </h4>
              <div className="space-y-2.5">
                {Object.entries(rejectionReasonsCount).map(([reason, count]) => {
                  const totalRejected = Object.values(rejectionReasonsCount).reduce((a, b) => a + b, 0) || 1;
                  const pct = Math.round((count / totalRejected) * 100);
                  return (
                    <div key={reason} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700">{reason}</span>
                        <span className="font-bold text-slate-900">{toFa(count)} مورد (٪{toFa(pct)})</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#800000] rounded-full transition-all"
                          style={{ width: `${Math.max(pct, count > 0 ? 12 : 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Subview routing
  if (currentSubView === 'leads-energy') {
    return (
      <div className="space-y-4">
        {renderManagerAnalyticsBanner()}
        <EnergyLeadsBank
          currentUser={currentUser}
          energyLeads={energyLeads}
          setEnergyLeads={setEnergyLeads}
          personnelList={personnelList}
          todayStr={todayStr}
          setToastMessage={setToastMessage}
          onCrossRefer={handleCrossReferLead}
          onConvertToProject={(lead) => {
            const newProj: Project = {
              id: `PRJ-ENG-${toFa(projectsList.length + 101)}`,
              name: `پروژه انرژی ${lead.facilityName}`,
              employer: lead.clientName,
              unit: 'انرژی',
              manager: currentUser.name,
              status: 'در حال اجرا (فاز ۱)',
              progress: 10,
              contractAmount: lead.estimatedProjectValue || '۰',
              receivedAmount: '۰',
              address: lead.address,
              locationCoordinates: lead.locationCoordinates
            };
            setProjectsList(prev => [newProj, ...prev]);
            setToastMessage(`پروژه «${newProj.name}» با موفقیت در بانک پروژه‌های جاری ایجاد شد.`);
          }}
        />
      </div>
    );
  }

  if (currentSubView === 'leads-management') {
    return (
      <div className="space-y-4">
        {renderManagerAnalyticsBanner()}
        <ManagementLeadsBank
          currentUser={currentUser}
          managementLeads={managementLeads}
          setManagementLeads={setManagementLeads}
          personnelList={personnelList}
          todayStr={todayStr}
          setToastMessage={setToastMessage}
          onCrossRefer={handleCrossReferLead}
          onConvertToProject={(lead) => {
            const newProj: Project = {
              id: `PRJ-ISO-${toFa(projectsList.length + 101)}`,
              name: `استقرار استاندارد ${lead.companyName}`,
              employer: lead.contactPerson,
              unit: 'سیستم مدیریت',
              manager: currentUser.name,
              status: 'در حال اجرا (فاز ۱)',
              progress: 10,
              contractAmount: lead.estimatedContractValue || '۰',
              receivedAmount: '۰',
              address: lead.address,
              locationCoordinates: lead.locationCoordinates
            };
            setProjectsList(prev => [newProj, ...prev]);
            setToastMessage(`پروژه «${newProj.name}» با موفقیت در بانک پروژه‌های جاری ایجاد شد.`);
          }}
        />
      </div>
    );
  }

  if (currentSubView === 'customers') {
    return (
      <ContactsBookView
        currentUser={currentUser}
        contactsList={contactsList}
        setContactsList={setContactsList}
        crmLeads={crmLeads}
        todayStr={todayStr}
        setToastMessage={setToastMessage}
      />
    );
  }

  if (currentSubView === 'due-today') {
    return (
      <div className="space-y-4">
        {renderManagerAnalyticsBanner()}
        <FollowUpsBank
          currentUser={currentUser}
          crmLeads={crmLeads}
          setCrmLeads={setCrmLeads}
          todayStr={todayStr}
          setToastMessage={setToastMessage}
          onCrossRefer={handleCrossReferLead}
          onConvertToProject={(lead) => {
            const newProj: Project = {
              id: `PRJ-${lead.urbanCode || toFa(projectsList.length + 101)}`,
              name: `پروژه مهندسی ${lead.ownerName} (${lead.urbanCode})`,
              employer: lead.ownerName,
              unit: lead.unit || 'مهندسی حریق',
              manager: currentUser.name,
              status: 'در حال اجرا (فاز ۱)',
              progress: 15,
              contractAmount: lead.contractAmount || '۰',
              receivedAmount: '۰',
              address: lead.address,
              locationCoordinates: lead.locationCoordinates
            };
            setProjectsList(prev => [newProj, ...prev]);
            setToastMessage(`پرونده ${lead.urbanCode} به پروژه فعال در بانک پروژه‌ها تبدیل شد.`);
          }}
        />
      </div>
    );
  }

  if (currentSubView === 'meetings') {
    const leadsWithMeetings = crmLeads.filter(l => {
      if (!l.meetingInfo) return false;
      if (!currentUser.isManager) {
        return (
          l.assignedExpertId === currentUser.id ||
          l.assignedExpertName === currentUser.name ||
          l.assignedMarketerName === currentUser.name ||
          l.meetingInfo?.managerName === currentUser.name ||
          l.meetingInfo?.managerId === currentUser.id
        );
      }
      return true;
    });
    return (
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <h2 className="text-base font-black text-[#13213c]">جلسات حضوری هماهنگ‌شده با مدیران</h2>
          <p className="text-xs text-slate-500 mt-1">فهرست قرارهای ملاقات با کارفرمایان و مدیران ارشد</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-[#13213c] text-white font-bold">
                  <th className="p-3.5">کد پرونده</th>
                  <th className="p-3.5">مالک / کارفرما</th>
                  <th className="p-3.5">تاریخ و ساعت</th>
                  <th className="p-3.5">مدیر اعزامی</th>
                  <th className="p-3.5">محل جلسه</th>
                  <th className="p-3.5">سوابق تماس و پیگیری</th>
                  <th className="p-3.5 text-center">مسیریابی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leadsWithMeetings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      هنوز جلسه حضوری ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  leadsWithMeetings.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-[#13213c]">{toFa(l.urbanCode)}</td>
                      <td className="p-3.5 font-bold text-slate-800">
                        {l.gender ? `${l.gender}ی ` : ''}{l.ownerName} ({toFa(l.ownerPhone)})
                      </td>
                      <td className="p-3.5 text-emerald-700 font-bold">
                        {toFa(l.meetingInfo?.date)} - ساعت {toFa(l.meetingInfo?.time)}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700">
                        {l.meetingInfo?.managerName}
                      </td>
                      <td className="p-3.5 text-slate-600">{l.meetingInfo?.location}</td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate">
                        {l.lastCallResult || l.salesExpertNotes || '-'}
                      </td>
                      <td className="p-3.5 text-center">
                        {onInspectLocation && (
                          <button
                            onClick={() => onInspectLocation(l.meetingInfo?.location || l.address)}
                            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            <MapPin className="w-3.5 h-3.5 text-rose-600" />
                            <span>نقشه</span>
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
      </div>
    );
  }

  // Default: 'leads' -> FireLeadsBank
  return (
    <div className="space-y-4">
      {renderManagerAnalyticsBanner()}
      <FireLeadsBank
        currentUser={currentUser}
        crmLeads={crmLeads}
        setCrmLeads={setCrmLeads}
        personnelList={personnelList}
        projectsList={projectsList}
        setProjectsList={setProjectsList}
        todayStr={todayStr}
        setToastMessage={setToastMessage}
        onCrossRefer={handleCrossReferLead}
      />
    </div>
  );
};
