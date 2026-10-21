import React, { useState } from 'react';
import { ContactBookItem, Employee, CrmLead } from '../../types';
import { 
  Users, 
  Phone, 
  Search, 
  Plus, 
  X, 
  Eye, 
  Building, 
  Tag, 
  Briefcase, 
  Calendar, 
  FileText,
  UserCheck,
  Share2
} from 'lucide-react';

interface ContactsBookViewProps {
  currentUser: Employee;
  contactsList: ContactBookItem[];
  setContactsList: React.Dispatch<React.SetStateAction<ContactBookItem[]>>;
  crmLeads: CrmLead[];
  todayStr: string;
  setToastMessage: (msg: string) => void;
}

export const ContactsBookView: React.FC<ContactsBookViewProps> = ({
  currentUser,
  contactsList,
  setContactsList,
  crmLeads,
  todayStr,
  setToastMessage
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedContact, setSelectedContact] = useState<ContactBookItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Contact form state
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    secondaryPhone: '',
    nationalId: '',
    projectType: 'مهندسی حریق' as ContactBookItem['projectType'],
    acquisitionChannel: 'معرفی همکاران و کارفرمایان قبلی',
    role: 'مالک و سازنده',
    company: '',
    associatedProjectsStr: '',
    notes: ''
  });

  // Extract all leads contacts and combine with registered contacts
  const relevantLeads = currentUser.isManager 
    ? crmLeads 
    : crmLeads.filter(l => 
        l.assignedExpertId === currentUser.id ||
        l.assignedExpertName === currentUser.name ||
        l.assignedMarketerName === currentUser.name ||
        l.assignedTo === currentUser.name ||
        l.managerId === currentUser.id ||
        l.followUps?.some(f => f.user === currentUser.name)
      );

  const allContacts: ContactBookItem[] = [
    ...(currentUser.isManager ? contactsList : contactsList.filter(c => c.fullName.includes(currentUser.name) || c.notes?.includes(currentUser.name))),
    // Add unique contacts from CRM Leads
    ...relevantLeads.map((l, index): ContactBookItem => ({
      id: `AUTO-${l.id}`,
      fullName: l.ownerName,
      phone: l.ownerPhone,
      secondaryPhone: l.secondaryPhone,
      nationalId: l.cadastralNo ? `پلاک ${l.cadastralNo}` : undefined,
      projectType: l.unit === 'انرژی' ? 'انرژی' : l.unit === 'سیستم مدیریت' ? 'سیستم مدیریت' : 'مهندسی حریق',
      acquisitionChannel: 'سامانه شهرسازی / بازاریابی میدانی',
      associatedProjects: [`پرونده ${l.urbanCode} (${l.address})`],
      role: l.contactRole || 'مالک و سازنده',
      company: l.ownerName.includes('شرکت') || l.ownerName.includes('مجتمع') ? l.ownerName : 'پروژه خصوصی',
      notes: l.salesExpertNotes,
      registeredDate: l.contactDate || todayStr
    }))
  ];

  // Remove duplicates by phone number
  const uniqueContacts = allContacts.filter((c, index, self) => 
    index === self.findIndex(t => t.phone.trim() === c.phone.trim() && c.phone.trim() !== '')
  );

  const filteredContacts = uniqueContacts.filter(c => {
    const q = searchQuery.trim().toLowerCase();
    const matchQuery = !q || 
      c.fullName.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.nationalId && c.nationalId.includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q)) ||
      c.associatedProjects.some(p => p.toLowerCase().includes(q));

    const matchType = filterType === 'all' || c.projectType.includes(filterType);
    return matchQuery && matchType;
  });

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.phone.trim()) {
      setToastMessage('نام و شماره تماس الزامی است.');
      return;
    }

    const newContact: ContactBookItem = {
      id: `CNT-${Date.now()}`,
      fullName: form.fullName,
      phone: form.phone,
      secondaryPhone: form.secondaryPhone,
      nationalId: form.nationalId,
      projectType: form.projectType,
      acquisitionChannel: form.acquisitionChannel,
      role: form.role,
      company: form.company,
      associatedProjects: form.associatedProjectsStr 
        ? form.associatedProjectsStr.split('،').map(s => s.trim()) 
        : ['پرونده جدید'],
      notes: form.notes,
      registeredDate: todayStr
    };

    setContactsList([newContact, ...contactsList]);
    setShowAddModal(false);
    setToastMessage(`مخاطب «${newContact.fullName}» در دفتر تلفن ثبت شد.`);
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-[#13213c]">دفتر تلفن جامع مخاطبان و مشتریان</h2>
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold px-2 py-0.5 rounded-full">
              {filteredContacts.length} مخاطب
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            بانک متمرکز شماره تماس، کد ملی، نوع پروژه (حریق، انرژی، مدیریت) و سوابق حضور در پروژه‌ها
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-[#13213c] hover:bg-[#1c3058] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>افزودن مخاطب جدید</span>
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
            placeholder="جستجو بر اساس نام، تلفن، کد ملی، شرکت یا پروژه..."
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
            همه حوزه‌ها
          </button>
          <button
            onClick={() => setFilterType('حریق')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterType === 'حریق' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            مهندسی حریق
          </button>
          <button
            onClick={() => setFilterType('انرژی')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterType === 'انرژی' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            انرژی و سولار
          </button>
          <button
            onClick={() => setFilterType('سیستم مدیریت')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterType === 'سیستم مدیریت' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            سیستم مدیریت ISO
          </button>
        </div>
      </div>

      {/* Row-based table display */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-[#13213c] text-white font-bold border-b border-slate-700">
                <th className="p-3.5 whitespace-nowrap">نام و نام خانوادگی</th>
                <th className="p-3.5 whitespace-nowrap">شماره تماس اصلی</th>
                <th className="p-3.5 whitespace-nowrap">کد ملی / شناسه</th>
                <th className="p-3.5 whitespace-nowrap">نوع پروژه</th>
                <th className="p-3.5 whitespace-nowrap">سمت و شرکت</th>
                <th className="p-3.5 whitespace-nowrap">نحوه آشنایی</th>
                <th className="p-3.5 whitespace-nowrap">پروژه‌های حضور داشته</th>
                <th className="p-3.5 whitespace-nowrap text-center">تماس / مشاهده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    مخاطبی یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className="hover:bg-amber-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-xs">{contact.fullName}</div>
                      <div className="text-[11px] text-slate-500">{contact.role}</div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-800">{contact.phone}</div>
                      {contact.secondaryPhone && (
                        <div className="text-[10px] text-slate-400 font-mono">{contact.secondaryPhone}</div>
                      )}
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-700 font-mono">
                      {contact.nationalId || '-'}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        contact.projectType === 'مهندسی حریق'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : contact.projectType === 'انرژی'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}>
                        {contact.projectType}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-700 font-medium">
                      {contact.company || 'شخصی'}
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-600 text-[11px]">
                      {contact.acquisitionChannel}
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <div className="truncate text-slate-700 font-medium text-[11px]">
                        {contact.associatedProjects.join('، ') || '-'}
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <a
                          href={`tel:${contact.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                          title="تماس تلفنی"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedContact(contact);
                          }}
                          className="bg-[#13213c] hover:bg-[#1d325a] text-white p-1.5 rounded-lg text-xs"
                          title="مشاهده پرونده مخاطب"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
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
      {selectedContact && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#13213c] text-white p-5 flex items-center justify-between border-b border-amber-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#13213c] flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{selectedContact.fullName}</h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {selectedContact.role} | {selectedContact.company || 'پروژه خصوصی'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContact(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                  <span className="text-slate-400 block text-[11px]">شماره تماس اصلی:</span>
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 font-mono text-base">{selectedContact.phone}</strong>
                    <a
                      href={`tel:${selectedContact.phone}`}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>تماس</span>
                    </a>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                  <span className="text-slate-400 block text-[11px]">کد ملی / شناسه شناسایی:</span>
                  <strong className="text-slate-900 font-mono text-base">{selectedContact.nationalId || 'ثبت‌نشده'}</strong>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Tag className="w-4 h-4 text-amber-600" />
                  <span>پروژه‌ها و پرونده‌های مرتبط</span>
                </h4>
                <div className="space-y-1.5">
                  {selectedContact.associatedProjects.map((p, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="font-semibold text-slate-800">{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <span className="text-slate-400 block text-[11px] mb-1">نوع حوزه و پروژه:</span>
                  <span className="bg-white border border-slate-300 font-bold px-3 py-1 rounded-lg text-slate-800">
                    {selectedContact.projectType}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <span className="text-slate-400 block text-[11px] mb-1">نحوه آشنایی با رابو:</span>
                  <strong className="text-slate-800">{selectedContact.acquisitionChannel}</strong>
                </div>
              </div>

              {selectedContact.notes && (
                <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl space-y-1.5">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-700" />
                    <span>توضیحات و سوابق مذاکرات:</span>
                  </span>
                  <p className="text-xs leading-relaxed text-amber-900">{selectedContact.notes}</p>
                </div>
              )}
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedContact(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#13213c] text-white p-5 flex items-center justify-between border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-[#13213c] flex items-center justify-center font-black">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">افزودن مخاطب جدید به دفتر تلفن</h3>
                  <p className="text-xs text-slate-300">ثبت اشخاص، شماره تماس، کد ملی، نوع پروژه و سوابق حضور در پروژه‌ها</p>
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

            <form onSubmit={handleCreateContact} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نام و نام خانوادگی *</label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="مثال: مهندس جمشید صادقی"
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">شماره تماس اصلی *</label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="مثال: 09121112233"
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">شماره دوم یا دفتر</label>
                  <input
                    type="text"
                    value={form.secondaryPhone}
                    onChange={(e) => setForm({ ...form, secondaryPhone: e.target.value })}
                    placeholder="مثال: 02122334455"
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">شماره ملی / شناسه</label>
                  <input
                    type="text"
                    value={form.nationalId}
                    onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                    placeholder="مثال: ۰۰۷۱۲۳۴۵۶۷"
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نوع پروژه یا حوزه همکاری</label>
                  <select
                    value={form.projectType}
                    onChange={(e) => setForm({ ...form, projectType: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c] bg-white"
                  >
                    <option value="مهندسی حریق">مهندسی حریق</option>
                    <option value="انرژی">انرژی و سولار</option>
                    <option value="سیستم مدیریت">سیستم مدیریت ISO</option>
                    <option value="چندگانه">چندگانه</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نقش / سمت</label>
                  <input
                    type="text"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder="مثال: مالک، سازنده، وکیل، مدیر پروژه"
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نام شرکت یا سازمان</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="مثال: شرکت توسعه سازه یا شخصی"
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نحوه آشنایی</label>
                  <input
                    type="text"
                    value={form.acquisitionChannel}
                    onChange={(e) => setForm({ ...form, acquisitionChannel: e.target.value })}
                    placeholder="مثال: معرفی مشتریان، نمایشگاه، وبسایت..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">در کدام پروژه‌ها حضور داشته؟</label>
                <input
                  type="text"
                  value={form.associatedProjectsStr}
                  onChange={(e) => setForm({ ...form, associatedProjectsStr: e.target.value })}
                  placeholder="نام پروژه‌ها را با ویرگول (،) جدا کنید..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">یادداشت‌ها</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
                />
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
                  <span>ثبت مخاطب</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
