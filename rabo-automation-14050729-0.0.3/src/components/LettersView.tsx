import React, { useState, useRef } from 'react';
import { ReceivedLetter, SentLetter, Project, Employee, LetterTemplate } from '../types';
import { generateRaboLetterNumber, getExactShamsiTimestamp, toFa } from '../utils/jalali';
import { generateWordDocument, LetterheadConfig } from '../utils/exportWord';
import { RichTextEditor } from './RichTextEditor';
import { VoiceInputButton } from './VoiceInputButton';
import { ShamsiDatePicker } from './ShamsiDatePicker';
import { RaboLogo } from './RaboLogo';
import { 
  Inbox, 
  Send, 
  FileText, 
  Sparkles, 
  Plus, 
  Trash2, 
  Download, 
  Clock, 
  ShieldAlert,
  Search,
  CheckCircle,
  FileCheck,
  Bell,
  Edit2,
  Eye,
  Printer,
  Paperclip,
  Lock,
  Upload,
  Settings,
  Copy,
  FolderOpen,
  X
} from 'lucide-react';
import { 
  notifyLetterDueDate, 
  checkDueLettersAndNotify, 
  isDueToday, 
  isDueDateReached 
} from '../utils/browserNotifications';

interface LettersViewProps {
  currentSubView: 'inbox' | 'outbox-create' | 'outbox-archive';
  currentUser: Employee;
  projectsList: Project[];
  setProjectsList?: React.Dispatch<React.SetStateAction<Project[]>>;
  personnelList: Employee[];
  letterTemplates: LetterTemplate[];
  receivedLetters: ReceivedLetter[];
  setReceivedLetters: React.Dispatch<React.SetStateAction<ReceivedLetter[]>>;
  sentLetters: SentLetter[];
  setSentLetters: React.Dispatch<React.SetStateAction<SentLetter[]>>;
  receiptMethods: string[];
  todayStr: string;
  todayYear: string;
  todayMonth: string;
  todayDay: string;
  setToastMessage: (msg: string) => void;
}

const LETTER_CATEGORIES = [
  'فنی و مهندسی',
  'مالی و قراردادها',
  'مکاتبات دولتی و سازمان آتش‌نشانی',
  'بازرگانی و فروش',
  'اداری و منابع انسانی'
];

export const LettersView: React.FC<LettersViewProps> = ({
  currentSubView,
  currentUser,
  projectsList,
  setProjectsList,
  personnelList,
  letterTemplates,
  receivedLetters,
  setReceivedLetters,
  sentLetters,
  setSentLetters,
  receiptMethods,
  todayStr,
  todayYear,
  todayMonth,
  todayDay,
  setToastMessage
}) => {
  // === Filter state for Inbox ===
  const [inboxFilterSender, setInboxFilterSender] = useState('');
  const [inboxFilterSubject, setInboxFilterSubject] = useState('');
  const [inboxFilterProject, setInboxFilterProject] = useState('all');
  const [inboxFilterAssignee, setInboxFilterAssignee] = useState('all');
  const [inboxFilterDate, setInboxFilterDate] = useState('');

  // === Filter state for Outbox Archive ===
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [archiveCategoryFilter, setArchiveCategoryFilter] = useState('all');
  const [archiveStatusFilter, setArchiveStatusFilter] = useState('all');

  // === Clone from Past Letters state ===
  const [cloneSearchQuery, setCloneSearchQuery] = useState('');
  const [showCloneDropdown, setShowCloneDropdown] = useState(false);

  // === Quick Inline Project Creation ===
  const [showQuickProjectAdd, setShowQuickProjectAdd] = useState(false);
  const [quickProjectName, setQuickProjectName] = useState('');
  const [quickProjectEmployer, setQuickProjectEmployer] = useState('');

  // === Modal for new / edit incoming letter ===
  const [showAddInboxModal, setShowAddInboxModal] = useState(false);
  const [editingInboxLetter, setEditingInboxLetter] = useState<ReceivedLetter | null>(null);

  // === Inbox Form State ===
  const [inboxForm, setInboxForm] = useState({
    senderOrg: '',
    subject: '',
    receiptMethod: receiptMethods[0] || 'پیک موتوری',
    unit: 'مهندسی حریق',
    projectId: projectsList[0]?.id || '',
    assignedManager: 'EMP-01',
    assignedExpert: personnelList[1]?.id || 'EMP-02',
    description: '',
    issueDate: `${todayYear}/${todayMonth}/${todayDay}`,
    dueDate: `${todayYear}/${todayMonth}/${todayDay}`
  });
  const [inboxScanFileName, setInboxScanFileName] = useState<string>('');
  const [inboxScanDataUrl, setInboxScanDataUrl] = useState<string>('');
  const [inboxAttachFileName, setInboxAttachFileName] = useState<string>('');
  const [inboxAttachDataUrl, setInboxAttachDataUrl] = useState<string>('');

  // === Preview modal for attached file/scan ===
  const [previewAttachmentModal, setPreviewAttachmentModal] = useState<{
    letterId: string;
    subject: string;
    fileName: string;
    dataUrl?: string;
    type: 'scan' | 'attach';
  } | null>(null);

  // === Workflow / Timeline Detail Modal ===
  const [viewLetterDetail, setViewLetterDetail] = useState<ReceivedLetter | null>(null);
  const [paraphText, setParaphText] = useState('');

  // === Official Letterhead & Stamp Settings (Senior Manager Only) ===
  const [letterheadConfig, setLetterheadConfig] = useState<LetterheadConfig>({
    companyName: 'شرکت مهندسی رهنمون کیفیت رابو (سهامی خاص)',
    slogan: 'مشاوره، طراحی، تامین، اجرا و اخذ تاییدیه رسمی آتش‌نشانی و ایمنی معماری',
    regNo: '۴۸۲۹۱۰',
    economicCode: '۴۱۱۵۶۷۸۹۳۲۱',
    phone: '۰۲۱-۸۸۲۲۳۳۴۴',
    address: 'تهران، میرداماد، میدان مادر، خیابان وزیری‌پور، پلاک ۱۲، واحد ۴'
  });
  const [showLetterheadSettingsModal, setShowLetterheadSettingsModal] = useState(false);
  const [companyStampBase64, setCompanyStampBase64] = useState<string>('');
  const [applyStampOnLetter, setApplyStampOnLetter] = useState(false);

  // === Outbox Form State ===
  const [outboxForm, setOutboxForm] = useState({
    customLetterNo: '',
    issueDate: `${todayYear}/${todayMonth}/${todayDay}`,
    recipientOrg: '',
    recipientPerson: '',
    subject: '',
    category: 'فنی و مهندسی',
    hasAttachment: 'ندارد',
    attachmentTitle: '',
    attachmentFileName: '',
    attachmentDataUrl: '',
    unit: 'مهندسی حریق',
    projectId: projectsList[0]?.id || '',
    customProjectName: '',
    creatorId: currentUser.id,
    approverId: personnelList.find(p => p.isManager)?.id || 'EMP-01',
    signerId: personnelList.find(p => p.isManager)?.id || 'EMP-01',
    bodyText: '',
    bodyHtml: '',
    hasPriceTable: false,
    priceItems: [
      { id: 1, service: 'تهیه نقشه از بیلت معماری و جانمایی تجهیزات', fee: '۲,۹۳۱,۰۰۰,۰۰۰' },
      { id: 2, service: 'طراحی و تهیه نقشه سامانه اعلام و اطفا حریق', fee: '۱,۱۱۸,۵۰۰,۰۰۰' }
    ],
    priceConditions: '- مبلغ فوق به صورت خالص بوده و شامل کسورات قانونی بیمه، مالیات و ... نمی‌گردد.',
    transcripts: [
      { id: 1, name: 'جناب آقای بیضاوی', position: 'مدیر کل محترم امور فنی و پشتیبانی', reason: 'جهت استحضار و صدور دستور اقدام' }
    ]
  });

  // Outbox full edit modal
  const [editingSentLetter, setEditingSentLetter] = useState<SentLetter | null>(null);
  // Outbox A4 print preview modal
  const [previewSentLetterModal, setPreviewSentLetterModal] = useState<SentLetter | null>(null);

  const [aiStyle, setAiStyle] = useState<'pricing' | 'formal' | 'technical'>('pricing');

  // Dispatch Receipt Modal
  const [dispatchModalLetter, setDispatchModalLetter] = useState<SentLetter | null>(null);
  const [dispatchInfo, setDispatchInfo] = useState({
    method: 'پیک موتوری',
    deliveredTo: '',
    trackingCode: '',
    signedScanName: '',
    signedScanDataUrl: '',
    receiptScanName: '',
    receiptScanDataUrl: ''
  });

  // Quota check: max 3 open letters per user/manager
  const openLettersCount = sentLetters.filter(
    l => (l.creatorId === currentUser.id || currentUser.isManager) && l.status !== 'ارسال و تحویل شده'
  ).length;

  // Helper date validator: checks if dateA < dateB
  const isDateEarlier = (earlierStr: string, laterStr: string): boolean => {
    const cleanE = earlierStr.replace(/[^\d۰-۹]/g, '');
    const cleanL = laterStr.replace(/[^\d۰-۹]/g, '');
    return cleanE < cleanL;
  };

  // Filtered inbox list with strict isolation for non-managers
  const filteredInboxLetters = receivedLetters.filter(letter => {
    if (!currentUser.isManager) {
      const isMyLetter = 
        letter.expertId === currentUser.id ||
        letter.expertName === currentUser.name ||
        letter.managerId === currentUser.id ||
        letter.timeline?.some(t => t.user?.includes(currentUser.name));
      if (!isMyLetter) return false;
    }

    if (inboxFilterSender && !letter.senderOrg.toLowerCase().includes(inboxFilterSender.toLowerCase())) {
      return false;
    }
    if (inboxFilterSubject && !letter.subject.toLowerCase().includes(inboxFilterSubject.toLowerCase())) {
      return false;
    }
    if (inboxFilterProject !== 'all' && letter.projectId !== inboxFilterProject) {
      return false;
    }
    if (inboxFilterAssignee !== 'all' && letter.expertId !== inboxFilterAssignee && letter.managerId !== inboxFilterAssignee) {
      return false;
    }
    if (inboxFilterDate && !letter.issueDate.includes(inboxFilterDate) && !(letter.dueDate && letter.dueDate.includes(inboxFilterDate))) {
      return false;
    }
    return true;
  });

  // Filtered outbox archive list with isolation + search + category filter
  const displayedSentLetters = sentLetters.filter(letter => {
    if (!currentUser.isManager) {
      const isMyLetter = 
        letter.creatorId === currentUser.id || 
        letter.creatorName === currentUser.name ||
        letter.signerName === currentUser.name ||
        letter.approverName === currentUser.name;
      if (!isMyLetter) return false;
    }
    if (archiveCategoryFilter !== 'all' && (letter.category || 'فنی و مهندسی') !== archiveCategoryFilter) {
      return false;
    }
    if (archiveStatusFilter !== 'all' && letter.status !== archiveStatusFilter) {
      return false;
    }
    if (archiveSearchQuery.trim()) {
      const q = archiveSearchQuery.trim().toLowerCase();
      const matchId = letter.id.toLowerCase().includes(q);
      const matchSubject = letter.subject.toLowerCase().includes(q);
      const matchOrg = letter.recipientOrg.toLowerCase().includes(q);
      const matchProj = (letter.projectName || '').toLowerCase().includes(q);
      if (!matchId && !matchSubject && !matchOrg && !matchProj) return false;
    }
    return true;
  });

  // Past letters matching clone search query
  const cloneCandidates = sentLetters.filter(l => {
    if (!cloneSearchQuery.trim()) return true;
    const q = cloneSearchQuery.trim().toLowerCase();
    return (
      l.id.toLowerCase().includes(q) ||
      l.subject.toLowerCase().includes(q) ||
      l.recipientOrg.toLowerCase().includes(q)
    );
  });

  // Clone from a past letter into outboxForm
  const handleCloneFromLetter = (past: SentLetter) => {
    const matchedSigner = personnelList.find(p => p.name === past.signerName);
    setOutboxForm(prev => ({
      ...prev,
      recipientOrg: past.recipientOrg,
      recipientPerson: past.recipientPerson || '',
      subject: `${past.subject}`,
      category: past.category || 'فنی و مهندسی',
      hasAttachment: past.hasAttachment && past.hasAttachment !== 'ندارد' ? 'دارد' : 'ندارد',
      attachmentTitle: past.hasAttachment !== 'ندارد' ? past.hasAttachment : '',
      unit: past.unit || 'مهندسی حریق',
      projectId: past.projectId || prev.projectId,
      signerId: matchedSigner?.id || prev.signerId,
      bodyText: past.bodyText || '',
      bodyHtml: past.bodyHtml || past.bodyText || '',
      hasPriceTable: Boolean(past.hasPriceTable),
      priceItems: past.priceItems?.length ? past.priceItems : prev.priceItems,
      priceConditions: past.priceConditions || prev.priceConditions,
      transcripts: past.transcripts?.length ? past.transcripts : prev.transcripts
    }));
    setShowCloneDropdown(false);
    setToastMessage(`مندرجات نامه شماره ${past.id} با موفقیت در فرم نامه جدید کپی شد.`);
  };

  // Quick inline project creation
  const handleCreateQuickProject = () => {
    if (!quickProjectName.trim()) {
      setToastMessage('لطفاً عنوان پروژه جدید را وارد نمایید.');
      return;
    }
    const newProjId = `PRJ-${todayYear}-${toFa(projectsList.length + 101)}`;
    const newProj: Project = {
      id: newProjId,
      name: quickProjectName.trim(),
      employer: quickProjectEmployer.trim() || outboxForm.recipientOrg || 'کارفرمای محترم',
      unit: outboxForm.unit,
      manager: currentUser.name,
      status: 'در حال اجرا (فاز ۱)',
      progress: 10,
      contractAmount: '۰',
      receivedAmount: '۰'
    };
    if (setProjectsList) {
      setProjectsList(prev => [newProj, ...prev]);
    }
    setOutboxForm(prev => ({ ...prev, projectId: newProjId, customProjectName: newProj.name }));
    setInboxForm(prev => ({ ...prev, projectId: newProjId }));
    setQuickProjectName('');
    setQuickProjectEmployer('');
    setShowQuickProjectAdd(false);
    setToastMessage(`پروژه جدید «${newProj.name}» با کد ${newProjId} ثبت و انتخاب شد.`);
  };

  // Open Add modal
  const handleOpenAddInboxModal = () => {
    setEditingInboxLetter(null);
    setInboxForm({
      senderOrg: '',
      subject: '',
      receiptMethod: receiptMethods[0] || 'پیک موتوری',
      unit: 'مهندسی حریق',
      projectId: projectsList[0]?.id || '',
      assignedManager: personnelList.find(p => p.isManager)?.id || 'EMP-01',
      assignedExpert: personnelList[1]?.id || 'EMP-02',
      description: '',
      issueDate: `${todayYear}/${todayMonth}/${todayDay}`,
      dueDate: `${todayYear}/${todayMonth}/${todayDay}`
    });
    setInboxScanFileName('');
    setInboxScanDataUrl('');
    setInboxAttachFileName('');
    setInboxAttachDataUrl('');
    setShowAddInboxModal(true);
  };

  // Open Edit modal for inbox letter
  const handleOpenEditInboxModal = (letter: ReceivedLetter) => {
    setEditingInboxLetter(letter);
    setInboxForm({
      senderOrg: letter.senderOrg,
      subject: letter.subject,
      receiptMethod: letter.receiptMethod || 'پیک موتوری',
      unit: letter.unit || 'مهندسی حریق',
      projectId: letter.projectId || '',
      assignedManager: letter.managerId || 'EMP-01',
      assignedExpert: letter.expertId || '',
      description: letter.description || '',
      issueDate: letter.issueDate || `${todayYear}/${todayMonth}/${todayDay}`,
      dueDate: letter.dueDate || letter.issueDate || `${todayYear}/${todayMonth}/${todayDay}`
    });
    setInboxScanFileName(letter.scanFileName || '');
    setInboxScanDataUrl((letter as any).scanDataUrl || '');
    setInboxAttachFileName(letter.attachmentFileName || '');
    setInboxAttachDataUrl((letter as any).attachmentDataUrl || '');
    setShowAddInboxModal(true);
  };

  // Delete inbox letter
  const handleDeleteInboxLetter = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`آیا از حذف نامه وارده با شناسه ${id} از کارتابل اطمینان دارید؟`)) return;
    setReceivedLetters(receivedLetters.filter(l => l.id !== id));
    setToastMessage(`نامه ${id} با موفقیت از کارتابل حذف شد.`);
    if (viewLetterDetail?.id === id) {
      setViewLetterDetail(null);
    }
  };

  // Save (Create or Update) Inbox Letter
  const handleSaveInboxLetter = (e: React.FormEvent) => {
    e.preventDefault();

    if (inboxForm.dueDate && inboxForm.issueDate) {
      if (isDateEarlier(inboxForm.dueDate, inboxForm.issueDate)) {
        setToastMessage('خطا: موعد سررسید اقدام نمی‌تواند قبل از تاریخ صدور نامه باشد.');
        return;
      }
    }

    if (!editingInboxLetter && !inboxScanFileName && !inboxScanDataUrl) {
      setToastMessage('خطا: بارگذاری اسکن اصل نامه وارده الزامی است!');
      return;
    }

    const matchedProject = projectsList.find(p => p.id === inboxForm.projectId);
    const matchedManager = personnelList.find(p => p.id === inboxForm.assignedManager);
    const matchedExpert = personnelList.find(p => p.id === inboxForm.assignedExpert);

    const scanName = inboxScanFileName || 'اسکن_اصل_نامه.pdf';
    const attachName = inboxAttachFileName || null;

    if (editingInboxLetter) {
      const updated: ReceivedLetter = {
        ...editingInboxLetter,
        senderOrg: inboxForm.senderOrg,
        subject: inboxForm.subject,
        receiptMethod: inboxForm.receiptMethod,
        issueDate: inboxForm.issueDate,
        dueDate: inboxForm.dueDate,
        unit: inboxForm.unit,
        projectId: inboxForm.projectId,
        projectName: matchedProject?.name || editingInboxLetter.projectName,
        managerId: inboxForm.assignedManager,
        managerName: matchedManager?.name || editingInboxLetter.managerName,
        expertId: inboxForm.assignedExpert,
        expertName: matchedExpert?.name || editingInboxLetter.expertName,
        description: inboxForm.description,
        scanFileName: scanName,
        attachmentFileName: attachName,
        ...(inboxScanDataUrl ? { scanDataUrl: inboxScanDataUrl } : {}),
        ...(inboxAttachDataUrl ? { attachmentDataUrl: inboxAttachDataUrl } : {})
      } as ReceivedLetter;
      setReceivedLetters(receivedLetters.map(l => l.id === updated.id ? updated : l));
      setToastMessage(`اطلاعات نامه ${updated.id} با موفقیت ویرایش گردید.`);
    } else {
      const newId = `RABO-IN-${todayYear}-${toFa(Math.floor(1000 + Math.random() * 9000))}`;
      const newL: ReceivedLetter = {
        id: newId,
        senderOrg: inboxForm.senderOrg,
        subject: inboxForm.subject,
        receiptMethod: inboxForm.receiptMethod,
        issueDate: inboxForm.issueDate,
        dueDate: inboxForm.dueDate,
        registeredAt: getExactShamsiTimestamp(),
        unit: inboxForm.unit,
        projectId: inboxForm.projectId,
        projectName: matchedProject?.name || '',
        managerId: inboxForm.assignedManager,
        managerName: matchedManager?.name || '',
        expertId: inboxForm.assignedExpert,
        expertName: matchedExpert?.name || '',
        scanFileName: scanName,
        attachmentFileName: attachName,
        description: inboxForm.description,
        ...(inboxScanDataUrl ? { scanDataUrl: inboxScanDataUrl } : {}),
        ...(inboxAttachDataUrl ? { attachmentDataUrl: inboxAttachDataUrl } : {}),
        timeline: [
          {
            id: 1,
            title: 'ثبت نامه وارده در دبیرخانه رابو',
            user: currentUser.name,
            time: getExactShamsiTimestamp(),
            note: inboxForm.description || 'ثبت اولیه نامه و اختصاص شماره اندیکاتور'
          },
          {
            id: 2,
            title: `ارجاع مدیریتی به کارشناس مسئول (${matchedExpert?.name || 'کارشناس'})`,
            user: matchedManager?.name || currentUser.name,
            time: getExactShamsiTimestamp(),
            note: `موعد سررسید اقدام: ${inboxForm.dueDate}`
          }
        ]
      } as ReceivedLetter;

      if (isDueDateReached(inboxForm.dueDate, todayStr) || inboxForm.dueDate === todayStr) {
        notifyLetterDueDate({
          letterId: newId,
          subject: newL.subject,
          senderOrg: newL.senderOrg,
          dueDate: newL.dueDate || todayStr,
          isUrgent: true
        });
      }

      setReceivedLetters([newL, ...receivedLetters]);
      setToastMessage(`نامه وارده جدید با شماره اندیکاتور ${newId} با موفقیت ثبت و ارجاع شد.`);
    }

    setShowAddInboxModal(false);
  };

  // Add Paraph to letter
  const handleAddParaph = () => {
    if (!paraphText.trim() || !viewLetterDetail) return;
    const newEntry = {
      id: Date.now(),
      title: 'دستور و یادداشت مدیریتی',
      user: currentUser.name,
      note: paraphText.trim(),
      time: getExactShamsiTimestamp()
    };
    const updated = receivedLetters.map(l => {
      if (l.id === viewLetterDetail.id) {
        const item = { ...l, timeline: [...l.timeline, newEntry] };
        setViewLetterDetail(item);
        return item;
      }
      return l;
    });
    setReceivedLetters(updated);
    setParaphText('');
    setToastMessage('دستور مدیریتی در پرونده نامه ثبت شد.');
  };

  // Print Official Single-Page A4 Sent Letter
  const handlePrintOfficialLetter = (letter: SentLetter) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const bodyContent = letter.bodyHtml || (letter.bodyText || '').replace(/\n/g, '<br/>');
    const stampHtml = (currentUser.isManager && applyStampOnLetter && companyStampBase64)
      ? `<img src="${companyStampBase64}" alt="مهر رسمی رابو" style="max-height: 75px; margin-top: 6px; display: block; margin-right: auto; margin-left: auto;" />`
      : '';

    const priceTableHtml = letter.hasPriceTable && letter.priceItems?.length ? `
      <div style="margin: 14px 0;">
        <div style="font-weight: bold; font-size: 10pt; color: #13213c; margin-bottom: 6px;">جدول برآورد حق‌الزحمه و شرح خدمات مهندسی:</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
          <thead>
            <tr style="background-color: #13213c; color: #ffffff;">
              <th style="border: 1px solid #cbd5e1; padding: 6px; width: 8%; text-align: center;">ردیف</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">شرح خدمات مهندسی</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px; width: 28%; text-align: center;">مبلغ (ریال)</th>
            </tr>
          </thead>
          <tbody>
            ${letter.priceItems.map((it, idx) => `
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${toFa(idx + 1)}</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px;">${it.service}</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold;">${toFa(it.fee)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${letter.priceConditions ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 4px;">${letter.priceConditions}</div>` : ''}
      </div>
    ` : '';

    const transcriptsHtml = letter.transcripts?.length ? `
      <div style="margin-top: 14px; border-top: 1px dashed #cbd5e1; padding-top: 8px; font-size: 8.5pt; color: #334155;">
        <strong>رونوشت:</strong>
        <ul style="margin: 4px 0 0 0; padding-right: 16px;">
          ${letter.transcripts.map(t => `<li>${t.name} (${t.position}) - ${t.reason}</li>`).join('')}
        </ul>
      </div>
    ` : '';

    const htmlDoc = `
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>نامه رسمی ${letter.id} - ${letterheadConfig.companyName}</title>
        <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet" type="text/css" />
        <style>
          @page { size: A4 portrait; margin: 0; }
          * { box-sizing: border-box; font-family: 'IRANSans', 'IRANSansX', 'Vazirmatn', Tahoma, sans-serif; }
          body { margin: 0; padding: 0; background: #fff; color: #0f172a; direction: rtl; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .a4-page {
            width: 210mm;
            height: 296mm;
            padding: 14mm 18mm 12mm 18mm;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            overflow: hidden;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px double #13213c;
            padding-bottom: 10px;
            margin-bottom: 16px;
          }
          .brand-col { display: flex; align-items: center; gap: 12px; }
          .brand-badge {
            width: 48px; height: 48px; border-radius: 10px; background: #13213c; color: #f59e0b;
            display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16pt;
            border: 2px solid #800000;
          }
          .company-title { font-size: 13.5pt; font-weight: 900; color: #13213c; margin: 0; }
          .company-slogan { font-size: 8.5pt; color: #475569; margin-top: 3px; }
          .meta-box {
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            border-radius: 8px;
            padding: 7px 12px;
            min-width: 175px;
            font-size: 9pt;
            line-height: 1.75;
          }
          .recipient-box { margin-bottom: 14px; font-size: 10.5pt; line-height: 1.8; }
          .subject-banner {
            background: #f1f5f9;
            border-right: 4px solid #800000;
            padding: 7px 12px;
            font-weight: bold;
            font-size: 10.5pt;
            color: #13213c;
            margin-bottom: 16px;
          }
          .body-content {
            font-size: 10.5pt;
            line-height: 2;
            text-align: justify;
            color: #1e293b;
            flex: 1;
          }
          .sign-section {
            margin-top: 20px;
            display: flex;
            justify-content: flex-end;
            padding-left: 30px;
          }
          .sign-box { text-align: center; min-width: 190px; font-size: 10pt; }
          .footer {
            border-top: 2px solid #13213c;
            padding-top: 8px;
            margin-top: 14px;
            display: flex;
            justify-content: space-between;
            font-size: 8pt;
            color: #475569;
          }
        </style>
      </head>
      <body>
        <div class="a4-page">
          <div>
            <div class="header">
              <div class="brand-col">
                <div class="brand-badge">R</div>
                <div>
                  <h1 class="company-title">${letterheadConfig.companyName}</h1>
                  <div class="company-slogan">${letterheadConfig.slogan}</div>
                </div>
              </div>
              <div class="meta-box">
                <div><strong>شماره نامه:</strong> ${toFa(letter.id)}</div>
                <div><strong>تاریخ صدور:</strong> ${toFa(letter.date)}</div>
                <div><strong>پیوست:</strong> ${toFa(letter.hasAttachment || 'ندارد')}</div>
              </div>
            </div>

            <div class="recipient-box">
              <div><strong>به: ${letter.recipientOrg}</strong></div>
              ${letter.recipientPerson ? `<div><strong>جهت استحضار: ${letter.recipientPerson}</strong></div>` : ''}
            </div>

            <div class="subject-banner">
              موضوع: ${letter.subject} ${letter.projectName ? `(${letter.projectName})` : ''}
            </div>

            <div class="body-content">
              <div style="margin-bottom: 8px; font-weight: bold;">با سلام و احترام؛</div>
              <div>${bodyContent}</div>
              ${priceTableHtml}
            </div>
          </div>

          <div>
            <div class="sign-section">
              <div class="sign-box">
                <div style="font-weight: bold; color: #13213c;">با تجدید احترام</div>
                <div style="font-weight: 900; color: #0f172a; margin-top: 4px;">${letter.signerName}</div>
                <div style="font-size: 8.5pt; color: #475569;">مدیریت ارشد شرکت مهندسی رابو</div>
                ${stampHtml}
              </div>
            </div>

            ${transcriptsHtml}

            <div class="footer">
              <div><strong>نشانی:</strong> ${toFa(letterheadConfig.address)}</div>
              <div><strong>تلفن:</strong> ${toFa(letterheadConfig.phone)} | <strong>ثبت:</strong> ${toFa(letterheadConfig.regNo)}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlDoc);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  };

  // Print Referral Workflow Sheet
  const handlePrintWorkflow = (letter: ReceivedLetter) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>گردش کار نامه ${letter.id}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'IRANSans', Tahoma, sans-serif; direction: rtl; margin: 0; padding: 15px; color: #1e293b; }
          .header-box { border-bottom: 2px solid #13213c; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .logo-area { font-size: 16pt; font-weight: bold; color: #13213c; }
          .meta-info { font-size: 9.5pt; line-height: 1.8; text-align: left; }
          .title-banner { background-color: #f1f5f9; padding: 10px; border-radius: 6px; font-weight: bold; font-size: 11pt; color: #13213c; margin-bottom: 20px; text-align: center; }
          .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt; }
          .grid-table td, .grid-table th { border: 1px solid #cbd5e1; padding: 8px 12px; }
          .grid-table th { background-color: #f8fafc; text-align: right; width: 22%; font-weight: bold; color: #334155; }
          .timeline-section { margin-top: 25px; }
          .step-card { border: 1px solid #e2e8f0; border-right: 4px solid #13213c; padding: 10px 14px; margin-bottom: 12px; border-radius: 4px; background: #fff; }
          .step-header { display: flex; justify-content: space-between; font-size: 9.5pt; color: #64748b; margin-bottom: 5px; }
          .step-title { font-weight: bold; font-size: 10.5pt; color: #0f172a; }
          .step-note { margin-top: 6px; font-size: 9.5pt; color: #334155; line-height: 1.6; }
          .stamp-box { margin-top: 40px; display: flex; justify-content: space-around; text-align: center; font-size: 10pt; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="logo-area">
            شرکت مهندسی رهنمون کیفیت رابو<br>
            <span style="font-size: 9pt; color: #64748b; font-weight: normal;">سامانه یکپارچه اتوماسیون سازمانی و دبیرخانه</span>
          </div>
          <div class="meta-info">
            <strong>شناسه اندیکاتور:</strong> ${toFa(letter.id)}<br>
            <strong>تاریخ صدور:</strong> ${toFa(letter.issueDate)}<br>
            <strong>موعد سررسید اقدام:</strong> ${toFa(letter.dueDate || '-')}<br>
            <strong>تاریخ چاپ برگه:</strong> ${toFa(todayStr)}
          </div>
        </div>

        <div class="title-banner">
          برگه رسمی گردش کار، پاراف‌ها و زنجیره ارجاعات اداری نامه وارده
        </div>

        <table class="grid-table">
          <tr>
            <th>سازمان فرستنده:</th>
            <td>${letter.senderOrg}</td>
            <th>روش دریافت:</th>
            <td>${letter.receiptMethod}</td>
          </tr>
          <tr>
            <th>موضوع نامه:</th>
            <td colspan="3">${letter.subject}</td>
          </tr>
          <tr>
            <th>پروژه مرتبط:</th>
            <td>${letter.projectName || 'عمومی'}</td>
            <th>واحد مهندسی:</th>
            <td>${letter.unit}</td>
          </tr>
          <tr>
            <th>مدیر ارجاع‌دهنده:</th>
            <td>${letter.managerName}</td>
            <th>کارشناس اقدام‌کننده:</th>
            <td>${letter.expertName}</td>
          </tr>
          <tr>
            <th>پیوست و اسکن:</th>
            <td>${letter.scanFileName || 'اصل نامه اسکن شده'}</td>
            <th>سایر ضمائم:</th>
            <td>${letter.attachmentFileName || 'ندارد'}</td>
          </tr>
        </table>

        <div class="timeline-section">
          <h4 style="margin-bottom: 12px; color: #13213c; font-size: 11pt;">مسیر گردش کار و دستورات پاراف‌شده:</h4>
          ${letter.timeline.map((step, index) => `
            <div class="step-card">
              <div class="step-header">
                <span>اقدام‌کننده: <strong>${step.user}</strong></span>
                <span>زمان ثبت: ${toFa(step.time)}</span>
              </div>
              <div class="step-title">${toFa(index + 1)}. ${step.title}</div>
              ${step.note ? `<div class="step-note">« ${step.note} »</div>` : ''}
            </div>
          `).join('')}
        </div>

        <div class="stamp-box">
          <div>
            <strong>دبیرخانه و بایگانی رابو</strong><br><br><br>
            محل مهر و امضا
          </div>
          <div>
            <strong>مدیر دپارتمان مهندسی</strong><br><br><br>
            ${letter.managerName}
          </div>
          <div>
            <strong>کارشناس مسئول پرونده</strong><br><br><br>
            ${letter.expertName}
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
    }, 300);
  };

  // AI Rewrite
  const handleAIRewrite = () => {
    const subj = outboxForm.subject || 'موضوع مطروحه';
    let rewritten = '';
    if (aiStyle === 'pricing') {
      rewritten = `با احترام، پیرو هماهنگی‌های به‌عمل‌آمده در خصوص ${subj}، برآورد مالی و شرح خدمات تفصیلی شرکت مهندسی رابو به پیوست ایفاد می‌گردد. خواهشمند است پس از بررسی، دستورات مقتضی جهت انعقاد قرارداد صادر فرمایید.`;
    } else if (aiStyle === 'technical') {
      rewritten = `با احترام، پیرو بازدید میدانی کارشناسان فنی شرکت مهندسی رابو از محل پروژه در تاریخ ${todayStr}، گزارش فنی مربوط به ${subj} به همراه چک‌لیست استانداردهای سازمان آتش‌نشانی جهت استحضار و رفع نقص اعلام می‌گردد.`;
    } else {
      rewritten = `با سلام و احترام، در راستای توافقات فی‌مابین و پیگیری‌های به‌عمل‌آمده پیرامون ${subj}، مراتب جهت استحضار عالی و صدور دستور اقدام مقتضی به حضور ارسال می‌گردد. پیشاپیش از بذل توجه جنابعالی کمال امتنان را دارد.`;
    }
    setOutboxForm(prev => ({ ...prev, bodyText: rewritten, bodyHtml: `<p>${rewritten}</p>` }));
    setToastMessage('متن نامه با ادبیات رسمی اداری رابو بازنویسی شد.');
  };

  // Apply letter template
  const applyTemplate = (tmpId: string) => {
    const tmp = letterTemplates.find(t => t.id === tmpId);
    if (tmp) {
      setOutboxForm(prev => ({
        ...prev,
        subject: tmp.subject,
        bodyText: tmp.text,
        bodyHtml: `<p>${tmp.text}</p>`
      }));
    }
  };

  // Save new outbox letter & generate doc
  const handleSaveOutboxLetter = (isDraft = false, printImmediately = false) => {
    if (openLettersCount >= 3 && !isDraft) {
      setToastMessage('سقف ۳ نامه باز تکمیل است. تا زمان ثبت رسید و اسکن نهایی در بایگانی، امکان صدور شماره نامه جدید مسدود است.');
      return;
    }
    if (!outboxForm.recipientOrg || !outboxForm.subject || !outboxForm.unit) {
      setToastMessage('لطفاً سازمان مقصد، موضوع و واحد صادرکننده را تکمیل فرمایید.');
      return;
    }

    const selectedProj = projectsList.find(p => p.id === outboxForm.projectId);
    const creator = personnelList.find(p => p.id === outboxForm.creatorId);
    const approver = personnelList.find(p => p.id === outboxForm.approverId);
    const signer = personnelList.find(p => p.id === outboxForm.signerId);
    const nextSeq = sentLetters.length + 15;
    const letterId = outboxForm.customLetterNo.trim() || generateRaboLetterNumber(nextSeq, todayYear, todayMonth);

    const newLetter: SentLetter = {
      id: letterId,
      recipientOrg: outboxForm.recipientOrg,
      recipientPerson: outboxForm.recipientPerson,
      subject: outboxForm.subject,
      date: outboxForm.issueDate || `${todayYear}/${todayMonth}/${todayDay}`,
      hasAttachment: outboxForm.hasAttachment === 'دارد' ? (outboxForm.attachmentTitle || 'دارد') : 'ندارد',
      category: outboxForm.category || 'فنی و مهندسی',
      attachmentFileName: outboxForm.attachmentFileName || undefined,
      attachmentDataUrl: outboxForm.attachmentDataUrl || undefined,
      unit: outboxForm.unit,
      projectId: outboxForm.projectId,
      projectName: selectedProj ? selectedProj.name : (outboxForm.customProjectName || 'عمومی'),
      creatorName: creator ? creator.name : currentUser.name,
      creatorId: outboxForm.creatorId,
      approverName: approver ? approver.name : 'مدیر ارشد',
      signerName: signer ? signer.name : 'مدیریت ارشد',
      status: isDraft ? 'پیش‌نویس' : 'صادر شده / منتظر ارسال',
      bodyText: outboxForm.bodyText || outboxForm.bodyHtml.replace(/<[^>]+>/g, ''),
      bodyHtml: outboxForm.bodyHtml || `<p>${outboxForm.bodyText}</p>`,
      hasPriceTable: outboxForm.hasPriceTable,
      priceItems: outboxForm.priceItems,
      priceConditions: outboxForm.priceConditions,
      transcripts: outboxForm.transcripts,
      createdAt: getExactShamsiTimestamp()
    };

    setSentLetters([newLetter, ...sentLetters]);

    if (printImmediately) {
      handlePrintOfficialLetter(newLetter);
      setToastMessage(`نامه رسمی ${letterId} صادر و صفحه چاپ A4 آماده گردید.`);
    } else if (!isDraft) {
      const configToUse: LetterheadConfig = {
        ...letterheadConfig,
        stampImageBase64: (currentUser.isManager && applyStampOnLetter && companyStampBase64) ? companyStampBase64 : undefined
      };
      generateWordDocument(newLetter, configToUse);
      setToastMessage(`نامه با شماره ${letterId} صادر و فایل رسمی Word دریافت شد.`);
    } else {
      setToastMessage(`پیش‌نویس نامه با شناسه ${letterId} در بایگانی ذخیره گردید.`);
    }

    setOutboxForm(prev => ({
      ...prev,
      customLetterNo: '',
      recipientOrg: '',
      recipientPerson: '',
      subject: '',
      bodyText: '',
      bodyHtml: '',
      attachmentFileName: '',
      attachmentDataUrl: ''
    }));
  };

  // Save edited sent letter in archive
  const handleSaveEditedSentLetter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSentLetter) return;
    const selectedProj = projectsList.find(p => p.id === editingSentLetter.projectId);
    const updated: SentLetter = {
      ...editingSentLetter,
      projectName: selectedProj ? selectedProj.name : editingSentLetter.projectName
    };
    setSentLetters(prev => prev.map(l => l.id === updated.id || l.createdAt === updated.createdAt ? updated : l));
    setEditingSentLetter(null);
    setToastMessage(`تمامی مشخصات و متن نامه صادره «${updated.id}» با موفقیت بروزرسانی و در سرور ذخیره شد.`);
  };

  // Delete sent letter from archive
  const handleDeleteSentLetter = (id: string) => {
    if (!window.confirm(`آیا از حذف نامه صادره شماره ${id} اطمینان دارید؟`)) return;
    setSentLetters(sentLetters.filter(l => l.id !== id));
    setToastMessage(`نامه ${id} از بایگانی نامه‌های صادره حذف شد.`);
  };

  // Save dispatch receipt
  const handleSaveDispatchReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchModalLetter) return;
    const updated: SentLetter = {
      ...dispatchModalLetter,
      status: 'ارسال و تحویل شده',
      dispatchMethod: dispatchInfo.method,
      deliveredTo: dispatchInfo.deliveredTo || 'تحویل دبیرخانه مقصد گردید',
      trackingCode: dispatchInfo.trackingCode || 'ثبت دبیرخانه شد',
      deliveryReceiptCode: dispatchInfo.trackingCode || 'ثبت دبیرخانه شد',
      signedLetterScan: dispatchInfo.signedScanName || dispatchModalLetter.signedLetterScan,
      deliveryReceiptScan: dispatchInfo.receiptScanName || dispatchModalLetter.deliveryReceiptScan,
      ...(dispatchInfo.signedScanDataUrl ? { attachmentDataUrl: dispatchInfo.signedScanDataUrl, attachmentFileName: dispatchInfo.signedScanName } : {})
    };
    setSentLetters(sentLetters.map(l => l.id === updated.id ? updated : l));
    setDispatchModalLetter(null);
    setToastMessage('رسید تحویل ثبت شد و سهمیه صدور نامه شما آزاد گردید.');
  };

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* 1. INBOX VIEW (Incoming Letters - Cartable at the top) */}
      {/* ============================================================== */}
      {currentSubView === 'inbox' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#13213c] flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-amber-600" />
                  <span>کارتابل نامه‌ها و مکاتبات وارده به شرکت رابو</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  پایش خودکار موعد سررسید، مدیریت ضمائم و اسکن‌ها، گردش کار و دستورات ارجاعی
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const items = checkDueLettersAndNotify(receivedLetters, todayStr, { force: true });
                    if (items.length > 0) {
                      setToastMessage(`اعلان مرورگری برای ${toFa(items.length)} نامه دارای موعد اقدام ارسال گردید.`);
                    } else {
                      setToastMessage('هیچ نامه‌ای با موعد سررسید سپری‌شده یا امروز یافت نشد.');
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-[#800000] border border-rose-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  title="پایش و ارسال نوتیفیکیشن مرورگر برای نامه‌های دارای سررسید"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>اعلان سررسیدها</span>
                </button>

                {/* دکمه ثبت نامه ورودی جدید (بدون علامت + تکراری) */}
                <button
                  type="button"
                  onClick={handleOpenAddInboxModal}
                  className="flex items-center gap-1.5 bg-[#800000] hover:bg-[#660000] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-amber-300" />
                  <span>ثبت نامه ورودی جدید</span>
                </button>
              </div>
            </div>

            {/* نوار جستجو و فیلتر پیشرفته نامه‌های وارده */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/90 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">سازمان فرستنده</label>
                <input
                  type="text"
                  value={inboxFilterSender}
                  onChange={e => setInboxFilterSender(e.target.value)}
                  placeholder="مثال: آتش‌نشانی، شهرداری..."
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">موضوع نامه</label>
                <input
                  type="text"
                  value={inboxFilterSubject}
                  onChange={e => setInboxFilterSubject(e.target.value)}
                  placeholder="جستجو در موضوع..."
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">پروژه مرتبط</label>
                <select
                  value={inboxFilterProject}
                  onChange={e => setInboxFilterProject(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white text-xs"
                >
                  <option value="all">همه پروژه‌ها</option>
                  {projectsList.map(p => (
                    <option key={p.id} value={p.id}>[{p.id}] {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">کارشناس / مسئول</label>
                <select
                  value={inboxFilterAssignee}
                  onChange={e => setInboxFilterAssignee(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white text-xs"
                >
                  <option value="all">همه کارشناسان</option>
                  {personnelList.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600">تاریخ صدور / اقدام</label>
                  {inboxFilterDate && (
                    <button
                      type="button"
                      onClick={() => setInboxFilterDate('')}
                      className="text-[10px] text-rose-600 font-bold cursor-pointer"
                    >
                      پاک‌سازی
                    </button>
                  )}
                </div>
                <ShamsiDatePicker
                  value={inboxFilterDate}
                  onChange={val => setInboxFilterDate(val)}
                  placeholder="انتخاب تاریخ از تقویم..."
                />
              </div>
            </div>

            {/* جدول نامه‌های دریافتی */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3">اندیکاتور</th>
                    <th className="p-3">فرستنده</th>
                    <th className="p-3">موضوع نامه</th>
                    <th className="p-3">پروژه مرتبط</th>
                    <th className="p-3">تاریخ صدور</th>
                    <th className="p-3">موعد سررسید اقدام</th>
                    <th className="p-3">کارشناس مسئول</th>
                    <th className="p-3 text-center">ضمائم و اسکن</th>
                    <th className="p-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInboxLetters.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        نامه‌ای در این بخش یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredInboxLetters.map(letter => {
                      const targetDue = letter.dueDate || letter.issueDate;
                      const dueToday = targetDue ? isDueToday(targetDue, todayStr) : false;
                      const reached = targetDue ? isDueDateReached(targetDue, todayStr) : false;
                      const hasAttachments = Boolean(letter.scanFileName || letter.attachmentFileName);

                      return (
                        <tr key={letter.id} className={`hover:bg-slate-50 transition-colors ${dueToday ? 'bg-rose-50/40' : ''}`}>
                          <td className="p-3 font-bold text-slate-900">{toFa(letter.id)}</td>
                          <td className="p-3 font-semibold text-slate-800">{letter.senderOrg}</td>
                          <td className="p-3 text-slate-700 max-w-xs truncate">{letter.subject}</td>
                          <td className="p-3 text-slate-600">{letter.projectName || 'عمومی'}</td>
                          <td className="p-3 text-slate-600">{toFa(letter.issueDate)}</td>
                          <td className="p-3">
                            {dueToday ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 font-black text-[11px] animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                                سررسید امروز ({toFa(letter.dueDate)})
                              </span>
                            ) : reached ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 font-bold text-[11px]">
                                مهلت سپری‌شده ({toFa(letter.dueDate)})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                                {toFa(letter.dueDate || letter.issueDate)}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600">{letter.expertName}</td>
                          <td className="p-3 text-center">
                            {hasAttachments ? (
                              <button
                                type="button"
                                onClick={() => setPreviewAttachmentModal({
                                  letterId: letter.id,
                                  subject: letter.subject,
                                  fileName: letter.scanFileName || letter.attachmentFileName || 'فایل_پیوست',
                                  dataUrl: (letter as any).scanDataUrl || (letter as any).attachmentDataUrl || '',
                                  type: 'scan'
                                })}
                                className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors"
                                title="مشاهده پیش‌نمایش و دریافت اسکن اصل نامه"
                              >
                                <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                                <span>مشاهده فایل</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">ندارد</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewLetterDetail(letter)}
                                className="bg-[#13213c] hover:bg-[#1d325a] text-white px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all"
                                title="مشاهده تاریخچه گردش کار و ثبت دستورات"
                              >
                                گردش کار
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditInboxModal(letter)}
                                className="p-1 rounded-md text-slate-600 hover:text-[#13213c] hover:bg-slate-100 cursor-pointer transition-colors"
                                title="ویرایش اطلاعات نامه"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleDeleteInboxLetter(letter.id, e)}
                                className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                                title="حذف نامه از کارتابل"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. OUTBOX CREATE (صدور نامه اداری و سربرگ رسمی A4) */}
      {/* ============================================================== */}
      {currentSubView === 'outbox-create' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-[#13213c] flex items-center gap-2">
                  <Send className="w-4 h-4 text-amber-600" />
                  <span>فرم تنظیم و صدور نامه رسمی در سربرگ استاندارد رابو (A4)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  شماره نامه خودکار دبیرخانه: <strong className="text-amber-700">{toFa(outboxForm.customLetterNo || generateRaboLetterNumber(sentLetters.length + 15, todayYear, todayMonth))}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* دکمه کپی از نامه‌های پیشین */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCloneDropdown(!showCloneDropdown)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-lg text-xs font-bold transition-all cursor-pointer border border-indigo-200"
                  >
                    <Copy className="w-3.5 h-3.5 text-indigo-700" />
                    <span>کپی از نامه‌های پیشین</span>
                  </button>

                  {showCloneDropdown && (
                    <div className="absolute left-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-40 p-3 space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <span className="text-[11px] font-bold text-slate-700">جستجو در نامه‌های صادره پیشین</span>
                        <button type="button" onClick={() => setShowCloneDropdown(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={cloneSearchQuery}
                        onChange={e => setCloneSearchQuery(e.target.value)}
                        placeholder="شماره نامه، موضوع یا مخاطب..."
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none"
                      />
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {cloneCandidates.length === 0 ? (
                          <div className="p-3 text-center text-[11px] text-slate-400">نامه‌ای یافت نشد.</div>
                        ) : (
                          cloneCandidates.slice(0, 8).map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleCloneFromLetter(item)}
                              className="w-full text-right p-2 hover:bg-slate-50 rounded-lg transition-colors block cursor-pointer"
                            >
                              <div className="flex items-center justify-between text-[11px] font-bold text-[#13213c]">
                                <span>{toFa(item.id)}</span>
                                <span className="text-slate-400">{toFa(item.date)}</span>
                              </div>
                              <div className="text-xs text-slate-700 truncate font-medium mt-0.5">{item.subject}</div>
                              <div className="text-[10px] text-slate-500 truncate">مخاطب: {item.recipientOrg}</div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {currentUser.isManager && (
                  <button
                    type="button"
                    onClick={() => setShowLetterheadSettingsModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer border border-slate-300"
                    title="سفارشی‌سازی فرمت سربرگ، مهر و امضای رسمی شرکت"
                  >
                    <Settings className="w-3.5 h-3.5 text-amber-600" />
                    <span>تنظیمات سربرگ و مهر رسمی</span>
                  </button>
                )}

                {openLettersCount >= 3 ? (
                  <div className="flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>سقف ۳ نامه باز تکمیل است</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">
                    سهمیه صدور: <span className="font-bold text-emerald-600">{toFa(3 - openLettersCount)} نامه فعال</span>
                  </div>
                )}
              </div>
            </div>

            {/* Letter template selection */}
            <div className="bg-amber-50/50 border border-amber-200/60 p-3.5 rounded-xl">
              <label className="block text-xs font-bold text-amber-950 mb-1.5">
                استفاده سریع از الگوهای رسمی رابو:
              </label>
              <div className="flex flex-wrap gap-2">
                {letterTemplates.map(tmp => (
                  <button
                    key={tmp.id}
                    type="button"
                    onClick={() => applyTemplate(tmp.id)}
                    className="bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer shadow-xs"
                  >
                    {tmp.title}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={e => { e.preventDefault(); handleSaveOutboxLetter(false, false); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">سازمان مخاطب *</label>
                  <input
                    type="text"
                    required
                    value={outboxForm.recipientOrg}
                    onChange={e => setOutboxForm({ ...outboxForm, recipientOrg: e.target.value })}
                    placeholder="مثال: سازمان آتش‌نشانی و خدمات ایمنی تهران"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نام و سمت مخاطب</label>
                  <input
                    type="text"
                    value={outboxForm.recipientPerson}
                    onChange={e => setOutboxForm({ ...outboxForm, recipientPerson: e.target.value })}
                    placeholder="مثال: جناب آقای مهندس احمدی - معاونت پیشگیری"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">موضوع نامه *</label>
                  <input
                    type="text"
                    required
                    value={outboxForm.subject}
                    onChange={e => setOutboxForm({ ...outboxForm, subject: e.target.value })}
                    placeholder="مثال: ارسال نقشه‌های فاز ۲ اعلام و اطفاء حریق"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <ShamsiDatePicker
                    label="تاریخ صدور نامه *"
                    value={outboxForm.issueDate}
                    onChange={val => setOutboxForm({ ...outboxForm, issueDate: val })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">دسته‌بندی آرشیو *</label>
                  <select
                    value={outboxForm.category}
                    onChange={e => setOutboxForm({ ...outboxForm, category: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                  >
                    {LETTER_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">پروژه مرتبط *</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickProjectAdd(!showQuickProjectAdd)}
                      className="text-[11px] font-bold text-[#13213c] hover:text-amber-700 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      <span>تعریف پروژه جدید</span>
                    </button>
                  </div>
                  <select
                    value={outboxForm.projectId}
                    onChange={e => setOutboxForm({ ...outboxForm, projectId: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                  >
                    <option value="">عمومی / بدون پروژه</option>
                    {projectsList.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">امضاکننده مجاز رابو *</label>
                  <select
                    value={outboxForm.signerId}
                    onChange={e => setOutboxForm({ ...outboxForm, signerId: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-bold bg-white"
                  >
                    {personnelList.filter(p => p.isManager).map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وضعیت پیوست و فایل ضمیمه</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={outboxForm.hasAttachment}
                      onChange={e => setOutboxForm({ ...outboxForm, hasAttachment: e.target.value })}
                      className="w-28 text-xs p-2.5 border border-slate-300 rounded-lg outline-none bg-white"
                    >
                      <option value="ندارد">ندارد</option>
                      <option value="دارد">دارد</option>
                    </select>
                    <label className="flex-1 flex items-center justify-center gap-1.5 p-2.5 border border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer text-[11px] font-bold text-slate-700 truncate">
                      <Upload className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">{outboxForm.attachmentFileName || 'آپلود ضمیمه'}</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const reader = new FileReader();
                            reader.onload = ev => {
                              setOutboxForm(prev => ({
                                ...prev,
                                hasAttachment: 'دارد',
                                attachmentFileName: f.name,
                                attachmentDataUrl: (ev.target?.result as string) || ''
                              }));
                            };
                            reader.readAsDataURL(f);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* پنل تعریف سریع پروژه جدید (Inline) */}
              {showQuickProjectAdd && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-end gap-3 animate-in fade-in">
                  <div className="flex-1 w-full">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان پروژه جدید *</label>
                    <input
                      type="text"
                      value={quickProjectName}
                      onChange={e => setQuickProjectName(e.target.value)}
                      placeholder="مثال: برج مسکونی و تجاری پارسیان"
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none"
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">نام کارفرما</label>
                    <input
                      type="text"
                      value={quickProjectEmployer}
                      onChange={e => setQuickProjectEmployer(e.target.value)}
                      placeholder="مثال: جناب آقای مهندس رضایی"
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCreateQuickProject}
                      className="bg-[#13213c] hover:bg-[#1f345c] text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      ثبت و انتخاب پروژه
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQuickProjectAdd(false)}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              )}

              {/* بخش امنیت مهر و امضای رسمی - فقط مدیران ارشد */}
              {currentUser.isManager && (
                <div className="bg-amber-50/70 border border-amber-300 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-700" />
                    <div>
                      <strong className="text-amber-950 block">امنیت مهر و امضای رسمی شرکت رابو (ویژه مدیران ارشد):</strong>
                      <span className="text-slate-600">
                        {companyStampBase64 ? 'مهر رسمی سازمانی در سیستم بارگذاری شده است.' : 'تصویر مهر هنوز بارگذاری نشده (از تنظیمات سربرگ اقدام کنید).'}
                      </span>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-[#13213c]">
                    <input
                      type="checkbox"
                      checked={applyStampOnLetter}
                      onChange={e => setApplyStampOnLetter(e.target.checked)}
                      disabled={!companyStampBase64}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>درج خودکار مهر و امضای دیجیتال در خروجی رسمی</span>
                  </label>
                </div>
              )}

              {/* ویرایشگر متن غنی (RichTextEditor) همراه با تایپ صوتی */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">متن اصلی نامه رسمی (با قابلیت جدول، فونت و تایپ صوتی) *</label>
                  <button
                    type="button"
                    onClick={handleAIRewrite}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    <span>تولید متن رسمی اداری</span>
                  </button>
                </div>

                <RichTextEditor
                  value={outboxForm.bodyHtml || outboxForm.bodyText}
                  onChange={html => setOutboxForm(prev => ({
                    ...prev,
                    bodyHtml: html,
                    bodyText: html.replace(/<[^>]+>/g, ' ').trim()
                  }))}
                  placeholder="متن نامه رسمی را بنویسید، جدول درج کنید یا از دکمه تایپ صوتی استفاده نمایید..."
                  minHeight="220px"
                />
              </div>

              {/* جدول مالی و برآورد قیمت (اختیاری) */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={outboxForm.hasPriceTable}
                      onChange={e => setOutboxForm({ ...outboxForm, hasPriceTable: e.target.checked })}
                      className="rounded text-amber-600"
                    />
                    <span>افزودن جدول برآورد هزینه و حق‌الزحمه خدمات مهندسی در نامه</span>
                  </label>
                </div>

                {outboxForm.hasPriceTable && (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-2">
                      {outboxForm.priceItems.map((item, idx) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                          <span className="col-span-1 text-center font-bold text-slate-500">{toFa(idx + 1)}</span>
                          <input
                            type="text"
                            value={item.service}
                            onChange={e => {
                              const newItems = [...outboxForm.priceItems];
                              newItems[idx].service = e.target.value;
                              setOutboxForm({ ...outboxForm, priceItems: newItems });
                            }}
                            placeholder="شرح خدمت مهندسی"
                            className="col-span-7 p-2 border border-slate-300 rounded-lg bg-white"
                          />
                          <input
                            type="text"
                            value={item.fee}
                            onChange={e => {
                              const newItems = [...outboxForm.priceItems];
                              newItems[idx].fee = e.target.value;
                              setOutboxForm({ ...outboxForm, priceItems: newItems });
                            }}
                            placeholder="مبلغ (ریال / تومان)"
                            className="col-span-3 p-2 border border-slate-300 rounded-lg bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setOutboxForm({
                                ...outboxForm,
                                priceItems: outboxForm.priceItems.filter((_, i) => i !== idx)
                              });
                            }}
                            className="col-span-1 text-rose-500 hover:text-rose-700 text-center cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setOutboxForm({
                          ...outboxForm,
                          priceItems: [
                            ...outboxForm.priceItems,
                            { id: Date.now(), service: '', fee: '' }
                          ]
                        });
                      }}
                      className="text-xs text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>افزودن ردیف هزینه جدید</span>
                    </button>
                  </div>
                )}
              </div>

              {/* دکمه‌های ثبت، چاپ A4 و دانلود Word */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => handleSaveOutboxLetter(true, false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  ذخیره به عنوان پیش‌نویس
                </button>
                <button
                  type="button"
                  disabled={openLettersCount >= 3}
                  onClick={() => handleSaveOutboxLetter(false, true)}
                  className="bg-[#13213c] hover:bg-[#1f345c] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>صدور و چاپ رسمی سربرگ A4 / PDF</span>
                </button>
                <button
                  type="submit"
                  disabled={openLettersCount >= 3}
                  className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                    openLettersCount >= 3
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-[#800000] hover:bg-[#660000] text-white'
                  }`}
                >
                  <Download className="w-4 h-4 text-amber-300" />
                  <span>صدور رسمی و دانلود فایل Word</span>
                </button>
              </div>
            </form>
          </div>

          {/* پیش‌نمایش زنده سربرگ استاندارد A4 شرکت مهندسی رابو */}
          <div className="bg-slate-200/70 border border-slate-300 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between max-w-[210mm] mx-auto mb-3">
              <span className="text-xs font-black text-[#13213c] flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-amber-600" />
                پیش‌نمایش زنده سربرگ رسمی A4 شرکت رابو (استاندارد یک‌صفحه‌ای)
              </span>
              <span className="text-[11px] text-slate-600 font-bold">فرمت استاندارد ۲۱۰×۲۹۷ میلی‌متر با فونت IRANSans</span>
            </div>

            <div className="bg-white shadow-xl border border-slate-300 rounded-lg max-w-[210mm] min-h-[260mm] mx-auto p-8 sm:p-10 flex flex-col justify-between text-slate-900">
              <div>
                {/* سربرگ بالا */}
                <div className="flex items-center justify-between border-b-4 border-double border-[#13213c] pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    <RaboLogo size="md" variant="icon" textColor="dark" />
                    <div>
                      <h2 className="text-base font-black text-[#13213c]">{letterheadConfig.companyName}</h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">{letterheadConfig.slogan}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[11px] space-y-1 min-w-[165px]">
                    <div><strong>شماره:</strong> {toFa(outboxForm.customLetterNo || generateRaboLetterNumber(sentLetters.length + 15, todayYear, todayMonth))}</div>
                    <div><strong>تاریخ:</strong> {toFa(outboxForm.issueDate)}</div>
                    <div><strong>پیوست:</strong> {toFa(outboxForm.hasAttachment)}</div>
                  </div>
                </div>

                {/* مخاطب و موضوع */}
                <div className="space-y-1 text-xs mb-4">
                  <div className="font-black text-slate-900">به: {outboxForm.recipientOrg || '....................................................'}</div>
                  {outboxForm.recipientPerson && (
                    <div className="font-bold text-slate-700">جهت استحضار: {outboxForm.recipientPerson}</div>
                  )}
                </div>

                <div className="bg-slate-100 border-r-4 border-[#800000] p-2.5 text-xs font-black text-[#13213c] mb-5">
                  موضوع: {outboxForm.subject || '....................................................'}
                </div>

                {/* متن نامه */}
                <div
                  className="text-xs leading-8 text-justify text-slate-800 min-h-[120px]"
                  dangerouslySetInnerHTML={{
                    __html: outboxForm.bodyHtml || (outboxForm.bodyText ? `<p>${outboxForm.bodyText}</p>` : '<p class="text-slate-400">متن نامه در این قسمت درج می‌گردد...</p>')
                  }}
                />
              </div>

              {/* امضا و فوتر پایین صفحه */}
              <div className="pt-8">
                <div className="flex justify-end pl-8 mb-6">
                  <div className="text-center min-w-[180px] text-xs">
                    <div className="font-bold text-[#13213c]">با تجدید احترام</div>
                    <div className="font-black text-slate-900 mt-1">
                      {personnelList.find(p => p.id === outboxForm.signerId)?.name || 'مدیریت ارشد رابو'}
                    </div>
                    <div className="text-[11px] text-slate-500">مدیریت ارشد شرکت مهندسی رابو</div>
                  </div>
                </div>

                <div className="border-t-2 border-[#13213c] pt-2.5 flex flex-wrap items-center justify-between text-[10px] text-slate-500">
                  <div><strong>نشانی دفتر مرکزی:</strong> {toFa(letterheadConfig.address)}</div>
                  <div><strong>تلفن:</strong> {toFa(letterheadConfig.phone)} | <strong>شماره ثبت:</strong> {toFa(letterheadConfig.regNo)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. OUTBOX ARCHIVE (بایگانی جامع، ویرایش کامل و رهگیری نامه‌های صادره) */}
      {/* ============================================================== */}
      {currentSubView === 'outbox-archive' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-[#13213c] flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-emerald-600" />
                <span>آرشیو و بایگانی جامع نامه‌های صادره، ویرایش کامل و رسید تحویل</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ویرایش کلیه فیلدهای نامه‌های صادره، دسته‌بندی موضوعی، پیوست‌ها و کد رهگیری دبیرخانه
              </p>
            </div>

            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
              مجموع نامه‌های صادره: {toFa(displayedSentLetters.length)} فقره
            </span>
          </div>

          {/* نوار فیلتر و جستجوی بایگانی */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={archiveSearchQuery}
                onChange={e => setArchiveSearchQuery(e.target.value)}
                placeholder="جستجو بر اساس شماره نامه، موضوع، مخاطب یا پروژه..."
                className="w-full pr-8 pl-3 py-2 border border-slate-300 rounded-lg bg-white outline-none"
              />
            </div>

            <div>
              <select
                value={archiveCategoryFilter}
                onChange={e => setArchiveCategoryFilter(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none"
              >
                <option value="all">همه دسته‌بندی‌های آرشیو</option>
                {LETTER_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={archiveStatusFilter}
                onChange={e => setArchiveStatusFilter(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none"
              >
                <option value="all">همه وضعیت‌های ارسال</option>
                <option value="صادر شده / منتظر ارسال">صادر شده / منتظر ارسال</option>
                <option value="ارسال و تحویل شده">ارسال و تحویل شده</option>
                <option value="پیش‌نویس">پیش‌نویس</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">شماره نامه</th>
                  <th className="p-3">دسته‌بندی</th>
                  <th className="p-3">سازمان مقصد</th>
                  <th className="p-3">موضوع و پروژه</th>
                  <th className="p-3">تاریخ صدور</th>
                  <th className="p-3">امضاکننده</th>
                  <th className="p-3">وضعیت و کد رهگیری</th>
                  <th className="p-3 text-center">پیوست</th>
                  <th className="p-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedSentLetters.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      هیچ نامه‌ای در این دسته‌بندی یافت نشد.
                    </td>
                  </tr>
                ) : (
                  displayedSentLetters.map(letter => {
                    const isDelivered = letter.status === 'ارسال و تحویل شده';
                    return (
                      <tr key={letter.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{toFa(letter.id)}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10.5px] font-bold">
                            {letter.category || 'فنی و مهندسی'}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">
                          <div>{letter.recipientOrg}</div>
                          {letter.recipientPerson && (
                            <div className="text-[10.5px] text-slate-500">{letter.recipientPerson}</div>
                          )}
                        </td>
                        <td className="p-3 text-slate-700 max-w-xs">
                          <div className="font-bold truncate">{letter.subject}</div>
                          <div className="text-[10.5px] text-slate-500">{letter.projectName || 'عمومی'}</div>
                        </td>
                        <td className="p-3 text-slate-600">{toFa(letter.date)}</td>
                        <td className="p-3 text-slate-700 font-medium">{letter.signerName}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold inline-block ${
                            isDelivered
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-900 border border-amber-200'
                          }`}>
                            {letter.status}
                          </span>
                          {(letter.trackingCode || letter.deliveryReceiptCode) && (
                            <div className="text-[10px] text-slate-500 mt-1">
                              رهگیری: {toFa(letter.trackingCode || letter.deliveryReceiptCode)}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {letter.attachmentFileName || letter.attachmentDataUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewAttachmentModal({
                                letterId: letter.id,
                                subject: letter.subject,
                                fileName: letter.attachmentFileName || 'پیوست_نامه.pdf',
                                dataUrl: letter.attachmentDataUrl,
                                type: 'attach'
                              })}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10.5px] font-bold cursor-pointer"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span>مشاهده</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">{letter.hasAttachment || 'ندارد'}</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* ویرایش کامل نامه صادره */}
                            <button
                              type="button"
                              onClick={() => setEditingSentLetter({ ...letter })}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer flex items-center gap-1 transition-colors"
                              title="ویرایش کامل مشخصات و متن نامه صادره"
                            >
                              <Edit2 className="w-3 h-3 text-amber-700" />
                              <span>ویرایش</span>
                            </button>

                            {/* چاپ رسمی A4 */}
                            <button
                              type="button"
                              onClick={() => handlePrintOfficialLetter(letter)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer flex items-center gap-1 transition-colors"
                              title="چاپ رسمی A4 با سربرگ رابو"
                            >
                              <Printer className="w-3 h-3 text-slate-700" />
                              <span>چاپ A4</span>
                            </button>

                            {/* دانلود فایل رسمی Word */}
                            <button
                              type="button"
                              onClick={() => {
                                const configToUse: LetterheadConfig = {
                                  ...letterheadConfig,
                                  stampImageBase64: (currentUser.isManager && applyStampOnLetter && companyStampBase64) ? companyStampBase64 : undefined
                                };
                                generateWordDocument(letter, configToUse);
                                setToastMessage(`فایل Word نامه ${letter.id} دریافت شد.`);
                              }}
                              className="bg-[#13213c] hover:bg-[#1f345c] text-white px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                              title="دریافت فایل Word نامه"
                            >
                              Word
                            </button>

                            {/* ثبت رسید تحویل */}
                            <button
                              type="button"
                              onClick={() => {
                                setDispatchModalLetter(letter);
                                setDispatchInfo({
                                  method: letter.dispatchMethod || 'پیک موتوری',
                                  deliveredTo: letter.deliveredTo || '',
                                  trackingCode: letter.trackingCode || letter.deliveryReceiptCode || '',
                                  signedScanName: letter.signedLetterScan || '',
                                  signedScanDataUrl: letter.attachmentDataUrl || '',
                                  receiptScanName: letter.deliveryReceiptScan || '',
                                  receiptScanDataUrl: ''
                                });
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              {isDelivered ? 'بروزرسانی رسید' : 'ثبت رسید'}
                            </button>

                            {/* حذف نامه */}
                            <button
                              type="button"
                              onClick={() => handleDeleteSentLetter(letter.id)}
                              className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                              title="حذف از بایگانی"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* ============================================================== */}
      {/* MODAL: ویرایش کامل نامه صادره (Full Edit Sent Letter Modal) */}
      {/* ============================================================== */}
      {editingSentLetter && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
            <div className="bg-[#13213c] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">
                  ویرایش کامل مشخصات، تاریخ، مخاطب، پیوست و متن نامه صادره ({toFa(editingSentLetter.id)})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSentLetter(null)}
                className="text-white/70 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedSentLetter} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">شماره نامه صادره *</label>
                  <input
                    type="text"
                    required
                    value={editingSentLetter.id}
                    onChange={e => setEditingSentLetter({ ...editingSentLetter, id: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none bg-white font-bold"
                  />
                </div>

                <div>
                  <ShamsiDatePicker
                    label="تاریخ صدور نامه *"
                    value={editingSentLetter.date}
                    onChange={val => setEditingSentLetter({ ...editingSentLetter, date: val })}
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">فرستنده / تنظیم‌کننده</label>
                  <input
                    type="text"
                    value={editingSentLetter.creatorName}
                    onChange={e => setEditingSentLetter({ ...editingSentLetter, creatorName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">دسته‌بندی آرشیو *</label>
                  <select
                    value={editingSentLetter.category || 'فنی و مهندسی'}
                    onChange={e => setEditingSentLetter({ ...editingSentLetter, category: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    {LETTER_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">سازمان مخاطب (گیرنده) *</label>
                  <input
                    type="text"
                    required
                    value={editingSentLetter.recipientOrg}
                    onChange={e => setEditingSentLetter({ ...editingSentLetter, recipientOrg: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">شخص / سمت مخاطب</label>
                  <input
                    type="text"
                    value={editingSentLetter.recipientPerson || ''}
                    onChange={e => setEditingSentLetter({ ...editingSentLetter, recipientPerson: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none bg-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">موضوع نامه *</label>
                  <input
                    type="text"
                    required
                    value={editingSentLetter.subject}
                    onChange={e => setEditingSentLetter({ ...editingSentLetter, subject: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">پروژه مرتبط</label>
                  <select
                    value={editingSentLetter.projectId}
                    onChange={e => setEditingSentLetter({ ...editingSentLetter, projectId: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="">عمومی</option>
                    {projectsList.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">امضاکننده مجاز</label>
                  <input
                    type="text"
                    value={editingSentLetter.signerName}
                    onChange={e => setEditingSentLetter({ ...editingSentLetter, signerName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">وضعیت پیوست</label>
                  <input
                    type="text"
                    value={editingSentLetter.hasAttachment}
                    onChange={e => setEditingSentLetter({ ...editingSentLetter, hasAttachment: e.target.value })}
                    placeholder="ندارد / دارد"
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">بارگذاری پیوست / اسکن امضاشده</label>
                  <label className="flex items-center justify-center gap-1.5 p-2.5 border border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer text-[11px] font-bold text-slate-700 truncate">
                    <Upload className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">{editingSentLetter.attachmentFileName || 'انتخاب فایل پیوست'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const reader = new FileReader();
                          reader.onload = ev => {
                            setEditingSentLetter({
                              ...editingSentLetter,
                              hasAttachment: 'دارد',
                              attachmentFileName: f.name,
                              attachmentDataUrl: (ev.target?.result as string) || ''
                            });
                          };
                          reader.readAsDataURL(f);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">متن کامل نامه صادره *</label>
                <RichTextEditor
                  value={editingSentLetter.bodyHtml || editingSentLetter.bodyText}
                  onChange={html => setEditingSentLetter({
                    ...editingSentLetter,
                    bodyHtml: html,
                    bodyText: html.replace(/<[^>]+>/g, ' ').trim()
                  })}
                  minHeight="200px"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingSentLetter(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#800000] hover:bg-[#660000] text-white font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4 text-amber-300" />
                  <span>ذخیره قطعی تغییرات در آرشیو</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ثبت / ویرایش نامه ورودی جدید */}
      {/* ============================================================== */}
      {showAddInboxModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            <div className="bg-[#13213c] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Inbox className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">
                  {editingInboxLetter ? `ویرایش نامه وارده ${toFa(editingInboxLetter.id)}` : 'ثبت نامه دریافتی جدید در اتوماسیون رابو'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddInboxModal(false)}
                className="text-white/70 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInboxLetter} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">سازمان فرستنده *</label>
                  <input
                    type="text"
                    required
                    value={inboxForm.senderOrg}
                    onChange={e => setInboxForm({ ...inboxForm, senderOrg: e.target.value })}
                    placeholder="مثال: سازمان آتش‌نشانی تهران"
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">موضوع نامه *</label>
                  <input
                    type="text"
                    required
                    value={inboxForm.subject}
                    onChange={e => setInboxForm({ ...inboxForm, subject: e.target.value })}
                    placeholder="عنوان ابلاغیه یا مکاتبه"
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                  />
                </div>

                <div>
                  <ShamsiDatePicker
                    label="تاریخ صدور نامه *"
                    value={inboxForm.issueDate}
                    onChange={val => setInboxForm({ ...inboxForm, issueDate: val })}
                  />
                </div>

                <div>
                  <ShamsiDatePicker
                    label="موعد سررسید اقدام *"
                    value={inboxForm.dueDate}
                    onChange={val => setInboxForm({ ...inboxForm, dueDate: val })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">روش دریافت</label>
                  <select
                    value={inboxForm.receiptMethod}
                    onChange={e => setInboxForm({ ...inboxForm, receiptMethod: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    {receiptMethods.map((m, idx) => (
                      <option key={idx} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">واحد مهندسی رابو *</label>
                  <select
                    value={inboxForm.unit}
                    onChange={e => setInboxForm({ ...inboxForm, unit: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="مهندسی حریق">مهندسی حریق</option>
                    <option value="سیستم مدیریت">سیستم مدیریت</option>
                    <option value="انرژی">انرژی</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">پروژه مرتبط *</label>
                  <select
                    value={inboxForm.projectId}
                    onChange={e => setInboxForm({ ...inboxForm, projectId: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="">عمومی</option>
                    {projectsList.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">کارشناس مسئول پرونده *</label>
                  <select
                    value={inboxForm.assignedExpert}
                    onChange={e => setInboxForm({ ...inboxForm, assignedExpert: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none bg-white font-bold"
                  >
                    {personnelList.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* فایل‌ها با ذخیره دائمی Base64 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[#800000] font-black mb-1">
                    بارگذاری اسکن اصل نامه وارده * (الزامی)
                  </label>
                  <div className="border-2 border-dashed border-amber-300 bg-white rounded-xl p-3 text-center hover:bg-amber-50/30 transition-colors">
                    <input
                      type="file"
                      id="scan-upload"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setInboxScanFileName(file.name);
                          const reader = new FileReader();
                          reader.onload = ev => setInboxScanDataUrl((ev.target?.result as string) || '');
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <label htmlFor="scan-upload" className="cursor-pointer flex flex-col items-center gap-1 text-slate-600">
                      <Upload className="w-5 h-5 text-amber-600" />
                      <span className="text-xs font-bold text-[#13213c]">
                        {inboxScanFileName || 'انتخاب فایل اسکن نامه (PDF / تصویر)'}
                      </span>
                      <span className="text-[10px] text-slate-400">ذخیره دائمی در سرور مرکزی</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    فایل ضمائم و نقشه‌های همراه (اختیاری)
                  </label>
                  <div className="border-2 border-dashed border-slate-300 bg-white rounded-xl p-3 text-center hover:bg-slate-50 transition-colors">
                    <input
                      type="file"
                      id="attach-upload"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setInboxAttachFileName(file.name);
                          const reader = new FileReader();
                          reader.onload = ev => setInboxAttachDataUrl((ev.target?.result as string) || '');
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <label htmlFor="attach-upload" className="cursor-pointer flex flex-col items-center gap-1 text-slate-600">
                      <Paperclip className="w-5 h-5 text-slate-500" />
                      <span className="text-xs font-medium text-slate-700">
                        {inboxAttachFileName || 'انتخاب فایل ضمائم (اختیاری)'}
                      </span>
                      <span className="text-[10px] text-slate-400">DWG, PDF, ZIP</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold">دستورات و توضیحات اولیه دبیرخانه</label>
                  <VoiceInputButton
                    onTranscript={text => setInboxForm(prev => ({ ...prev, description: (prev.description ? prev.description + ' ' : '') + text }))}
                  />
                </div>
                <textarea
                  rows={3}
                  value={inboxForm.description}
                  onChange={e => setInboxForm({ ...inboxForm, description: e.target.value })}
                  placeholder="خلاصه مفاد نامه، مهلت پاسخگویی، موارد نقص فنی اعلام‌شده و دستور ارجاع..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddInboxModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#800000] hover:bg-[#660000] text-white font-bold cursor-pointer shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <FileCheck className="w-4 h-4 text-amber-300" />
                  <span>{editingInboxLetter ? 'ذخیره تغییرات نامه' : 'ثبت و ارجاع قطعی نامه'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: پیش‌نمایش و دانلود اسکن اصل نامه یا ضمیمه */}
      {/* ============================================================== */}
      {previewAttachmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#13213c] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">
                  اسکن و ضمائم نامه: {toFa(previewAttachmentModal.letterId)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachmentModal(null)}
                className="text-white/70 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 text-center space-y-4 text-xs">
              {previewAttachmentModal.dataUrl && previewAttachmentModal.dataUrl.startsWith('data:image') ? (
                <img
                  src={previewAttachmentModal.dataUrl}
                  alt={previewAttachmentModal.fileName}
                  className="max-h-64 mx-auto rounded-xl border border-slate-200 object-contain"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
                  <FileText className="w-8 h-8" />
                </div>
              )}

              <div>
                <strong className="text-sm font-black text-slate-900 block">
                  {previewAttachmentModal.fileName}
                </strong>
                <p className="text-slate-500 mt-1">
                  موضوع نامه: {previewAttachmentModal.subject}
                </p>
                <span className="inline-block mt-2 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-3 py-1 rounded-full">
                  سند معتبر ثبت‌شده در دبیرخانه الکترونیک شرکت رابو
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (previewAttachmentModal.dataUrl && previewAttachmentModal.dataUrl.startsWith('data:')) {
                      const a = document.createElement('a');
                      a.href = previewAttachmentModal.dataUrl;
                      a.download = previewAttachmentModal.fileName;
                      a.click();
                    } else {
                      const blob = new Blob([`سند رسمی دبیرخانه رابو - نامه شماره ${previewAttachmentModal.letterId}`], { type: 'application/pdf' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = previewAttachmentModal.fileName;
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                    setToastMessage(`فایل ${previewAttachmentModal.fileName} با موفقیت دریافت شد.`);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer flex items-center gap-2 transition-all shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>دانلود مستقیم فایل پیوست</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewAttachmentModal(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: مشاهده گردش کار، پاراف‌ها و چاپ فرم گردش کار */}
      {/* ============================================================== */}
      {viewLetterDetail && (
        <div className="fixed inset-0 bg-[#13213c]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-[#13213c]">
                  پرونده گردش کار نامه {toFa(viewLetterDetail.id)}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintWorkflow(viewLetterDetail)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#13213c] hover:bg-[#1f345c] text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>چاپ / خروجی PDF گردش کار</span>
                </button>

                <button
                  onClick={() => setViewLetterDetail(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div><strong>فرستنده:</strong> {viewLetterDetail.senderOrg}</div>
                <div><strong>موضوع:</strong> {viewLetterDetail.subject}</div>
                <div><strong>تاریخ صدور:</strong> {toFa(viewLetterDetail.issueDate)}</div>
                <div><strong>موعد سررسید اقدام:</strong> <span className="font-bold text-[#800000]">{toFa(viewLetterDetail.dueDate || viewLetterDetail.issueDate)}</span></div>
                <div><strong>کارشناس مربوطه:</strong> {viewLetterDetail.expertName}</div>
                <div><strong>پروژه:</strong> {viewLetterDetail.projectName || 'عمومی'}</div>
                <div><strong>روش دریافت:</strong> {viewLetterDetail.receiptMethod}</div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>تاریخچه کامل گردش کار و زنجیره دستورات</span>
                </h4>
                <div className="space-y-2 border-r-2 border-slate-200 pr-3 mr-1">
                  {viewLetterDetail.timeline.map((item, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="text-[11px] text-slate-500 font-medium">
                        {toFa(item.time)} - <strong className="text-slate-800">{item.user}</strong>
                      </div>
                      <div className={`p-2.5 rounded-lg mt-1 ${
                        item.note ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <div className="font-bold">{item.title}</div>
                        {item.note && <div className="mt-1 text-[11.5px] leading-relaxed">« {item.note} »</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {currentUser.isManager && (
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#800000]">
                      ثبت دستور جدید / پاراف ارجاعی به کارشناس
                    </label>
                    <VoiceInputButton
                      onTranscript={t => setParaphText(prev => (prev ? prev + ' ' : '') + t)}
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={paraphText}
                    onChange={e => setParaphText(e.target.value)}
                    placeholder="دستور اقدام، مهلت رسیدگی، یا نکات فنی را بنویسید..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={handleAddParaph}
                      className="bg-[#800000] hover:bg-[#660000] text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs"
                    >
                      ثبت و ابلاغ دستور
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: تنظیمات سربرگ رسمی و بارگذاری مهر شرکت (فقط مدیران ارشد) */}
      {/* ============================================================== */}
      {showLetterheadSettingsModal && currentUser.isManager && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#13213c] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">سفارشی‌سازی سربرگ رسمی و مهر دیجیتال رابو</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLetterheadSettingsModal(false)}
                className="text-white/70 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">نام رسمی شرکت در سربرگ</label>
                <input
                  type="text"
                  value={letterheadConfig.companyName}
                  onChange={e => setLetterheadConfig({ ...letterheadConfig, companyName: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">شعار سازمانی و حوزه فعالیت</label>
                <input
                  type="text"
                  value={letterheadConfig.slogan}
                  onChange={e => setLetterheadConfig({ ...letterheadConfig, slogan: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">شماره ثبت رسمی</label>
                  <input
                    type="text"
                    value={letterheadConfig.regNo}
                    onChange={e => setLetterheadConfig({ ...letterheadConfig, regNo: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">شناسه ملی / کد اقتصادی</label>
                  <input
                    type="text"
                    value={letterheadConfig.economicCode}
                    onChange={e => setLetterheadConfig({ ...letterheadConfig, economicCode: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تلفن‌های تماس شرکت</label>
                  <input
                    type="text"
                    value={letterheadConfig.phone}
                    onChange={e => setLetterheadConfig({ ...letterheadConfig, phone: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نشانی دفتر مرکزی</label>
                  <input
                    type="text"
                    value={letterheadConfig.address}
                    onChange={e => setLetterheadConfig({ ...letterheadConfig, address: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-800" />
                  <strong className="text-amber-950">بارگذاری فایل تصویر مهر و امضای رسمی (فقط مدیریت):</strong>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="file"
                    id="stamp-file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = ev => {
                          const base64 = ev.target?.result as string;
                          setCompanyStampBase64(base64);
                          setToastMessage('تصویر مهر و امضای رسمی بارگذاری گردید.');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="stamp-file"
                    className="bg-[#13213c] hover:bg-[#1f345c] text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                  >
                    انتخاب فایل تصویر مهر (PNG بدون پس‌زمینه)
                  </label>

                  {companyStampBase64 && (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      <span>مهر آماده است</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLetterheadSettingsModal(false)}
                  className="px-5 py-2 rounded-lg bg-[#13213c] text-white font-bold cursor-pointer"
                >
                  ذخیره و تایید تنظیمات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Dispatch Receipt Registration */}
      {dispatchModalLetter && (
        <div className="fixed inset-0 bg-[#13213c]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-[#13213c]">
                ثبت رسید تحویل و اسکن نامه ({toFa(dispatchModalLetter.id)})
              </h3>
              <button
                onClick={() => setDispatchModalLetter(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDispatchReceipt} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">روش ارسال</label>
                <select
                  value={dispatchInfo.method}
                  onChange={e => setDispatchInfo({ ...dispatchInfo, method: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none bg-white"
                >
                  {receiptMethods.map((m, idx) => (
                    <option key={idx} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تحویل‌گیرنده در مقصد *</label>
                <input
                  type="text"
                  required
                  value={dispatchInfo.deliveredTo}
                  onChange={e => setDispatchInfo({ ...dispatchInfo, deliveredTo: e.target.value })}
                  placeholder="مثال: دبیرخانه مرکزی سازمان - آقای مرادی"
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">شماره ثبت دبیرخانه مقصد یا کد رهگیری پستی</label>
                <input
                  type="text"
                  value={dispatchInfo.trackingCode}
                  onChange={e => setDispatchInfo({ ...dispatchInfo, trackingCode: e.target.value })}
                  placeholder="مثال: شماره ثبت دبیرخانه ۹۸۲۱۰"
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">بارگذاری اسکن رسید تحویل / نامه ممهور</label>
                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-emerald-300 rounded-xl bg-emerald-50/40 hover:bg-emerald-50 cursor-pointer font-bold text-emerald-900">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>{dispatchInfo.signedScanName || 'انتخاب تصویر رسید تحویل (PDF / عکس)'}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const reader = new FileReader();
                        reader.onload = ev => {
                          setDispatchInfo(prev => ({
                            ...prev,
                            signedScanName: f.name,
                            signedScanDataUrl: (ev.target?.result as string) || ''
                          }));
                        };
                        reader.readAsDataURL(f);
                      }
                    }}
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDispatchModalLetter(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-bold cursor-pointer transition-all shadow-sm"
                >
                  تأیید تحویل و آزادسازی سهمیه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
