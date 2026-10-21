import React, { useState } from 'react';
import { CrmLead, Employee } from '../../types';
import { 
  PhoneCall, 
  Calendar, 
  Clock, 
  Search, 
  Eye, 
  X, 
  CheckCircle, 
  Phone, 
  FileText,
  AlertCircle,
  Building2,
  CheckSquare,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react';
import { VoiceInputButton } from '../VoiceInputButton';
import { ShamsiDatePicker } from '../ShamsiDatePicker';
import { toFa } from '../../utils/jalali';

interface FollowUpsBankProps {
  currentUser: Employee;
  crmLeads: CrmLead[];
  setCrmLeads: React.Dispatch<React.SetStateAction<CrmLead[]>>;
  todayStr: string;
  setToastMessage: (msg: string) => void;
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
  onConvertToProject?: (lead: CrmLead) => void;
}

export const FollowUpsBank: React.FC<FollowUpsBankProps> = ({
  currentUser,
  crmLeads,
  setCrmLeads,
  todayStr,
  setToastMessage,
  onCrossRefer,
  onConvertToProject
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDue, setFilterDue] = useState<'today' | 'all' | 'hot'>('today');
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);

  // New follow up log state inside detail modal
  const [newLogNote, setNewLogNote] = useState('');
  const [newLogResult, setNewLogResult] = useState('');
  const [newNextDate, setNewNextDate] = useState(todayStr);

  // Modal: Create New Follow-up / Task
  const [showAddFollowUpModal, setShowAddFollowUpModal] = useState(false);
  const [newFollowUpForm, setNewFollowUpForm] = useState({
    urbanCode: '',
    ownerName: '',
    ownerPhone: '',
    assignedMarketerName: currentUser.name,
    taskSubject: '',
    nextFollowUpDate: todayStr,
    leadTemperature: 'گرم' as 'داغ' | 'گرم' | 'متوسط' | 'سرد',
    notes: ''
  });

  // Modal: Edit Existing Lead / Follow-up
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [editForm, setEditForm] = useState({
    ownerName: '',
    ownerPhone: '',
    nextFollowUpDate: todayStr,
    assignedMarketerName: '',
    leadTemperature: 'گرم' as 'داغ' | 'گرم' | 'متوسط' | 'سرد',
    salesExpertNotes: ''
  });

  const followUpLeads = crmLeads.filter(l => {
    if (l.status.includes('قرارداد')) return false;
    if (!currentUser.isManager) {
      return (
        l.assignedExpertId === currentUser.id ||
        l.assignedExpertName === currentUser.name ||
        l.assignedMarketerName === currentUser.name ||
        l.assignedTo === currentUser.name ||
        l.managerId === currentUser.id ||
        l.followUps?.some(f => f.user === currentUser.name)
      );
    }
    return true;
  });

  const filteredLeads = followUpLeads.filter(lead => {
    // Data isolation: non-managers only see follow-ups assigned to them
    if (!currentUser.isManager) {
      const isMyLead = 
        lead.assignedMarketerName === currentUser.name ||
        lead.assignedExpertName === currentUser.name ||
        lead.assignedExpertId === currentUser.id ||
        lead.assignedTo === currentUser.name ||
        lead.followUps?.some(f => f.user === currentUser.name);
      if (!isMyLead) return false;
    }

    const q = searchQuery.trim().toLowerCase();
    const matchQuery = !q || 
      lead.ownerName?.toLowerCase().includes(q) ||
      lead.urbanCode?.toLowerCase().includes(q) ||
      lead.ownerPhone?.includes(q) ||
      lead.assignedMarketerName?.toLowerCase().includes(q);

    let matchDue = true;
    if (filterDue === 'today') {
      matchDue = lead.nextFollowUpDate === todayStr;
    } else if (filterDue === 'hot') {
      matchDue = lead.leadTemperature === 'داغ';
    }

    return matchQuery && matchDue;
  });

  const handleSaveFollowUpLog = (lead: CrmLead) => {
    if (!newLogResult.trim() && !newLogNote.trim()) {
      setToastMessage('لطفاً نتیجه یا یادداشت پیگیری را وارد فرمایید.');
      return;
    }

    const newHistoryItem = {
      id: Date.now(),
      date: `${todayStr} - ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`,
      user: currentUser.name,
      note: newLogNote,
      result: newLogResult
    };

    const updated = crmLeads.map(l => {
      if (l.id === lead.id) {
        return {
          ...l,
          lastCallResult: newLogResult || l.lastCallResult,
          nextFollowUpDate: newNextDate,
          salesExpertNotes: newLogNote ? `${l.salesExpertNotes || ''}\n[${todayStr}]: ${newLogNote}` : l.salesExpertNotes,
          followUpHistory: [newHistoryItem, ...(l.followUpHistory || [])]
        };
      }
      return l;
    });

    setCrmLeads(updated);
    setSelectedLead(null);
    setNewLogNote('');
    setNewLogResult('');
    setToastMessage(`پیگیری برای پرونده ${lead.urbanCode} با موفقیت ثبت شد.`);
  };

  // Create brand new follow-up
  const handleCreateNewFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFollowUpForm.ownerName.trim()) {
      setToastMessage('لطفاً نام مخاطب یا کارفرما را وارد فرمایید.');
      return;
    }

    const code = newFollowUpForm.urbanCode.trim() || `CRM-FLW-${Math.floor(1000 + Math.random() * 9000)}`;
    const newLead: CrmLead = {
      id: `LEAD-${Date.now()}`,
      urbanCode: code,
      unit: 'مهندسی فروش و CRM',
      ownerName: newFollowUpForm.ownerName.trim(),
      ownerPhone: newFollowUpForm.ownerPhone.trim() || '09120000000',
      lawyerName: '-',
      lawyerPhone: '-',
      address: 'تهران',
      buildingUsage: 'مسکونی / تجاری',
      floorsAbove: '۵',
      floorsBelow: '۱',
      potentialServices: ['مشاوره و پیگیری فنی حریق'],
      constructionStage: 'پیگیری فروش و مشاوره مهندسی',
      salesOpportunities: {
        consulting: true,
        design: true,
        productSupply: false,
        execution: false,
        fireApproval: true
      },
      salesExpertNotes: newFollowUpForm.notes || newFollowUpForm.taskSubject,
      lastCallResult: newFollowUpForm.taskSubject || 'تعریف وظیفه پیگیری جدید',
      nextFollowUpDate: newFollowUpForm.nextFollowUpDate || todayStr,
      nextFollowUpTime: '11:00',
      leadTemperature: newFollowUpForm.leadTemperature,
      assignedMarketerId: currentUser.id,
      assignedMarketerName: newFollowUpForm.assignedMarketerName || currentUser.name,
      meetingInfo: {
        attendeeManagerId: currentUser.id,
        attendeeManagerName: currentUser.name,
        date: todayStr,
        time: '11:00',
        location: 'دفتر کارفرما'
      },
      status: 'در حال پیگیری و مذاکره',
      followUpHistory: [
        {
          id: Date.now(),
          date: todayStr,
          user: currentUser.name,
          note: newFollowUpForm.notes || 'تعریف وظیفه پیگیری در سامانه',
          result: newFollowUpForm.taskSubject || 'ثبت تسک پیگیری جدید'
        }
      ]
    };

    setCrmLeads([newLead, ...crmLeads]);
    setShowAddFollowUpModal(false);
    setNewFollowUpForm({
      urbanCode: '',
      ownerName: '',
      ownerPhone: '',
      assignedMarketerName: currentUser.name,
      taskSubject: '',
      nextFollowUpDate: todayStr,
      leadTemperature: 'گرم',
      notes: ''
    });
    setToastMessage(`پیگیری جدید با کد «${code}» برای ${newLead.ownerName} با موفقیت ایجاد گردید.`);
  };

  // Open Edit Modal
  const handleOpenEdit = (lead: CrmLead, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingLead(lead);
    setEditForm({
      ownerName: lead.ownerName || '',
      ownerPhone: lead.ownerPhone || '',
      nextFollowUpDate: lead.nextFollowUpDate || todayStr,
      assignedMarketerName: lead.assignedMarketerName || currentUser.name,
      leadTemperature: (lead.leadTemperature as any) || 'گرم',
      salesExpertNotes: lead.salesExpertNotes || ''
    });
  };

  // Save Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;

    const updated = crmLeads.map(l => {
      if (l.id === editingLead.id) {
        return {
          ...l,
          ownerName: editForm.ownerName.trim(),
          ownerPhone: editForm.ownerPhone.trim(),
          nextFollowUpDate: editForm.nextFollowUpDate,
          assignedMarketerName: editForm.assignedMarketerName,
          leadTemperature: editForm.leadTemperature,
          salesExpertNotes: editForm.salesExpertNotes
        };
      }
      return l;
    });

    setCrmLeads(updated);
    setEditingLead(null);
    setToastMessage(`اطلاعات پرونده ${editingLead.urbanCode} با موفقیت به‌روزرسانی شد.`);
  };

  // Delete Lead
  const handleDeleteLead = (id: string, urbanCode: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`آیا از حذف پرونده پیگیری با کد ${urbanCode} اطمینان دارید؟`)) return;
    setCrmLeads(crmLeads.filter(l => l.id !== id));
    setToastMessage(`پرونده ${urbanCode} با موفقیت حذف گردید.`);
    if (selectedLead?.id === id) setSelectedLead(null);
  };

  return (
    <div className="space-y-4">
      {/* Header bar - بدون زیرعنوان طبق دستور */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-black text-[#13213c]">بانک پیگیری‌ها و سررسیدهای روزانه</h2>
          <span className="bg-rose-100 text-rose-900 border border-rose-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
            {toFa(filteredLeads.length)} پیگیری
          </span>
        </div>

        {/* دکمه تعریف پیگیری / تسک جدید */}
        <button
          type="button"
          onClick={() => setShowAddFollowUpModal(true)}
          className="bg-[#800000] hover:bg-[#660000] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 self-start md:self-auto"
        >
          <Plus className="w-4 h-4 text-amber-300" />
          <span>تعریف پیگیری / تسک جدید</span>
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
            placeholder="جستجو بر اساس نام کارفرما، شماره پرونده، کارشناس..."
            className="w-full pl-3 pr-9 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-bold">
          <button
            onClick={() => setFilterDue('today')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterDue === 'today' ? 'bg-[#13213c] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            موعد امروز ({crmLeads.filter(l => l.nextFollowUpDate === todayStr).length})
          </button>
          <button
            onClick={() => setFilterDue('hot')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterDue === 'hot' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            🔥 داغ
          </button>
          <button
            onClick={() => setFilterDue('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterDue === 'all' ? 'bg-[#13213c] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            همه موارد ({followUpLeads.length})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3.5 whitespace-nowrap">کد پرونده</th>
                <th className="p-3.5 whitespace-nowrap">کارفرما / مخاطب</th>
                <th className="p-3.5 whitespace-nowrap">موعد پیگیری</th>
                <th className="p-3.5 whitespace-nowrap">سوابق تماس و پیگیری</th>
                <th className="p-3.5 whitespace-nowrap">کارشناس پیگیری</th>
                <th className="p-3.5 whitespace-nowrap">حرارت</th>
                <th className="p-3.5 whitespace-nowrap text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    موردی برای پیگیری با فیلتر انتخاب‌شده یافت نشد.
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
                      <span className="font-mono font-bold text-[#13213c] bg-slate-100 px-2.5 py-1 rounded-md">
                        {lead.urbanCode}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{lead.ownerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{lead.ownerPhone}</div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md font-bold text-[11px] ${
                        lead.nextFollowUpDate === todayStr
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {lead.nextFollowUpDate || 'تعیین نشده'}
                      </span>
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <div className="truncate text-slate-700 text-[11.5px]">
                        {lead.lastCallResult || lead.salesExpertNotes || '-'}
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-700 font-medium">
                      {lead.assignedMarketerName}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded text-[10.5px] font-black ${
                        lead.leadTemperature === 'داغ' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {lead.leadTemperature === 'داغ' ? '🔥 داغ' : '⚡ گرم'}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedLead(lead)}
                          className="inline-flex items-center gap-1 bg-[#13213c] hover:bg-[#1d325a] text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          title="مشاهده و ثبت گزارش پیگیری"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>مشاهده و ثبت</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(lead, e)}
                          className="p-1 rounded-lg text-slate-600 hover:text-[#13213c] hover:bg-slate-100 cursor-pointer transition-colors"
                          title="ویرایش مشخصات"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteLead(lead.id, lead.urbanCode, e)}
                          className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                          title="حذف پیگیری"
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

      {/* Modal: تعریف پیگیری / تسک جدید */}
      {showAddFollowUpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#13213c] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">تعریف تسک / اقدام پیگیری جدید</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddFollowUpModal(false)}
                className="text-white/70 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewFollowUp} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">کد پرونده / شناسه</label>
                  <input
                    type="text"
                    value={newFollowUpForm.urbanCode}
                    onChange={e => setNewFollowUpForm({ ...newFollowUpForm, urbanCode: e.target.value })}
                    placeholder="مثال: CRM-204 یا کد شهرسازی"
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نام کارفرما / مخاطب *</label>
                  <input
                    type="text"
                    required
                    value={newFollowUpForm.ownerName}
                    onChange={e => setNewFollowUpForm({ ...newFollowUpForm, ownerName: e.target.value })}
                    placeholder="نام کامل مالک یا نماینده"
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">شماره تماس مستقیم</label>
                  <input
                    type="text"
                    value={newFollowUpForm.ownerPhone}
                    onChange={e => setNewFollowUpForm({ ...newFollowUpForm, ownerPhone: e.target.value })}
                    placeholder="09121234567"
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">موعد پیگیری *</label>
                  <input
                    type="text"
                    required
                    value={newFollowUpForm.nextFollowUpDate}
                    onChange={e => setNewFollowUpForm({ ...newFollowUpForm, nextFollowUpDate: e.target.value })}
                    placeholder="۱۴۰۵/۰۷/۱۰"
                    className="w-full p-2.5 border border-amber-300 bg-amber-50/50 rounded-lg outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">مسئول پیگیری</label>
                  <input
                    type="text"
                    value={newFollowUpForm.assignedMarketerName}
                    onChange={e => setNewFollowUpForm({ ...newFollowUpForm, assignedMarketerName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">میزان تمایل (حرارت)</label>
                  <select
                    value={newFollowUpForm.leadTemperature}
                    onChange={e => setNewFollowUpForm({ ...newFollowUpForm, leadTemperature: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none bg-white font-bold"
                  >
                    <option value="داغ">🔥 داغ (تصمیم‌گیری فوری)</option>
                    <option value="گرم">⚡ گرم (مذاکره فعال)</option>
                    <option value="متوسط">متوسط</option>
                    <option value="سرد">سرد</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">موضوع و دستور پیگیری</label>
                <input
                  type="text"
                  value={newFollowUpForm.taskSubject}
                  onChange={e => setNewFollowUpForm({ ...newFollowUpForm, taskSubject: e.target.value })}
                  placeholder="مثال: تماس جهت هماهنگی جلسه حضوری و ارائه پروپوزال اعلام و اطفا"
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">توضیحات تکمیلی</label>
                <textarea
                  rows={2}
                  value={newFollowUpForm.notes}
                  onChange={e => setNewFollowUpForm({ ...newFollowUpForm, notes: e.target.value })}
                  placeholder="نکات مهم مربوط به پرونده کارفرما..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddFollowUpModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#800000] hover:bg-[#660000] text-white font-bold cursor-pointer shadow-xs"
                >
                  ثبت پیگیری در کارتابل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: ویرایش مشخصات پیگیری */}
      {editingLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#13213c] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">ویرایش مشخصات پرونده {editingLead.urbanCode}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingLead(null)}
                className="text-white/70 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">نام کارفرما / مخاطب *</label>
                <input
                  type="text"
                  required
                  value={editForm.ownerName}
                  onChange={e => setEditForm({ ...editForm, ownerName: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">شماره تماس</label>
                  <input
                    type="text"
                    value={editForm.ownerPhone}
                    onChange={e => setEditForm({ ...editForm, ownerPhone: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">موعد پیگیری بعدی</label>
                  <input
                    type="text"
                    value={editForm.nextFollowUpDate}
                    onChange={e => setEditForm({ ...editForm, nextFollowUpDate: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">مسئول پیگیری</label>
                  <input
                    type="text"
                    value={editForm.assignedMarketerName}
                    onChange={e => setEditForm({ ...editForm, assignedMarketerName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">درجه حرارت</label>
                  <select
                    value={editForm.leadTemperature}
                    onChange={e => setEditForm({ ...editForm, leadTemperature: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none bg-white font-bold"
                  >
                    <option value="داغ">🔥 داغ</option>
                    <option value="گرم">⚡ گرم</option>
                    <option value="متوسط">متوسط</option>
                    <option value="سرد">سرد</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">یادداشت‌های کارشناس</label>
                <textarea
                  rows={3}
                  value={editForm.salesExpertNotes}
                  onChange={e => setEditForm({ ...editForm, salesExpertNotes: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#13213c] hover:bg-[#1f345c] text-white font-bold cursor-pointer shadow-xs"
                >
                  ذخیره تغییرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Large Detail & FollowUp Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#13213c] text-white p-5 flex items-center justify-between border-b border-amber-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#13213c] flex items-center justify-center font-bold">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    پیگیری پرونده: {selectedLead.urbanCode} ({selectedLead.ownerName})
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    کارشناس فروش: {selectedLead.assignedMarketerName} | موعد پیگیری: {selectedLead.nextFollowUpDate}
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

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 block text-[11px]">مخاطب اصلی:</span>
                  <strong className="text-slate-800 text-sm">{selectedLead.ownerName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">تلفن تماس:</span>
                  <a href={`tel:${selectedLead.ownerPhone}`} className="text-blue-600 font-mono font-bold flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" />
                    <span>{selectedLead.ownerPhone}</span>
                  </a>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">مرحله ساختمانی:</span>
                  <strong className="text-slate-800">{selectedLead.constructionStage || 'اسکلت'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">کاربری ملک:</span>
                  <strong className="text-slate-800">{selectedLead.buildingUsage || 'مسکونی'}</strong>
                </div>
              </div>

              {/* Form: Add Follow Up Log */}
              <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#13213c] text-xs flex items-center gap-1.5">
                    <PhoneCall className="w-4 h-4 text-amber-600" />
                    <span>ثبت گزارش تماس یا مذاکره جدید با کارفرما</span>
                  </h4>
                  <VoiceInputButton
                    onTranscript={(text) => {
                      setNewLogNote(prev => prev ? `${prev} ${text}` : text);
                    }}
                    buttonText="ثبت صوتی شرح مکالمه"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">نتیجه کلی تماس / مذاکره *</label>
                    <input
                      type="text"
                      value={newLogResult}
                      onChange={(e) => setNewLogResult(e.target.value)}
                      placeholder="مثال: توافق بر سر قیمت و ارسال پیش‌نویس قرارداد"
                      className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c] bg-white text-xs"
                    />
                  </div>

                  <div>
                    <ShamsiDatePicker
                      label="تاریخ پیگیری بعدی"
                      value={newNextDate}
                      onChange={(val) => setNewNextDate(val)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">شرح تفصیلی مکالمه و توافقات</label>
                  <textarea
                    rows={2}
                    value={newLogNote}
                    onChange={(e) => setNewLogNote(e.target.value)}
                    placeholder="نکات مهم، درخواست‌های فنی، تخفیف مورد نظر، یا موعد ارسال پیش‌فاکتور..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c] bg-white text-xs leading-relaxed"
                  />
                </div>

                {/* ارجاع همزمان بین‌واحدی */}
                {onCrossRefer && (
                  <div className="pt-2 border-t border-amber-200/70 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-700">ارجاع همزمان آنی به سایر واحدها:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onCrossRefer({
                          sourceDept: selectedLead.unit || 'مهندسی حریق',
                          targetDepts: ['management'],
                          ownerName: selectedLead.ownerName,
                          gender: selectedLead.gender,
                          phone: selectedLead.ownerPhone,
                          address: selectedLead.address,
                          notes: newLogNote || selectedLead.salesExpertNotes || 'ارجاع از بانک پیگیری',
                          marketerName: selectedLead.assignedMarketerName || currentUser.name
                        })}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-[11px] font-bold cursor-pointer"
                      >
                        ارجاع همزمان به واحد سیستم مدیریت
                      </button>
                      <button
                        type="button"
                        onClick={() => onCrossRefer({
                          sourceDept: selectedLead.unit || 'مهندسی حریق',
                          targetDepts: ['energy'],
                          ownerName: selectedLead.ownerName,
                          gender: selectedLead.gender,
                          phone: selectedLead.ownerPhone,
                          address: selectedLead.address,
                          notes: newLogNote || selectedLead.salesExpertNotes || 'ارجاع از بانک پیگیری',
                          marketerName: selectedLead.assignedMarketerName || currentUser.name
                        })}
                        className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 text-[11px] font-bold cursor-pointer"
                      >
                        ارجاع همزمان به واحد انرژی
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleSaveFollowUpLog(selectedLead)}
                    className="bg-[#13213c] hover:bg-[#1f345c] text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <CheckCircle className="w-4 h-4 text-amber-400" />
                    <span>ثبت قطعی در سوابق تماس و پیگیری</span>
                  </button>
                </div>
              </div>

              {/* Follow Up History Timeline */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>سوابق تماس و پیگیری ({toFa(selectedLead.followUpHistory?.length || 0)} مورد)</span>
                </h4>

                {(!selectedLead.followUpHistory || selectedLead.followUpHistory.length === 0) ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400">
                    هنوز سابقه‌ای برای این پرونده ثبت نشده است.
                  </div>
                ) : (
                  <div className="space-y-2.5 border-r-2 border-slate-200 pr-3 mr-2">
                    {selectedLead.followUpHistory.map((item, idx) => (
                      <div key={item.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-[#13213c] text-amber-400 flex items-center justify-center text-[10px] font-black">
                              {toFa(idx + 1)}
                            </span>
                            {item.user}
                          </span>
                          <span className="text-slate-500 text-[10.5px]">{toFa(item.date)}</span>
                        </div>
                        {item.result && (
                          <div className="font-bold text-[#13213c] text-xs mt-1">
                            «{item.result}»
                          </div>
                        )}
                        {item.note && (
                          <p className="text-slate-600 text-[11.5px] leading-relaxed pt-1 border-t border-slate-200/60 mt-1">
                            {item.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedLead)}
                  className="text-xs text-[#13213c] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>ویرایش اطلاعات پرونده</span>
                </button>

                {onConvertToProject && !selectedLead.status.includes('قرارداد') && (
                  <button
                    type="button"
                    onClick={() => {
                      onConvertToProject(selectedLead);
                      setCrmLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status: 'منتج به قرارداد (تبدیل به پروژه)' } : l));
                      setSelectedLead(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>تبدیل به پروژه جاری</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
