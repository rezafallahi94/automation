import React, { useState } from 'react';
import { Employee, Project, ProjectTaskItem } from '../types';
import { 
  CheckSquare, 
  MessageSquare, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  Send, 
  Paperclip, 
  CheckCircle, 
  AlertCircle, 
  Layers, 
  FolderKanban,
  Smile,
  ShieldCheck,
  Zap,
  Award,
  Bell,
  Users,
  Radio,
  Share2,
  Upload,
  ArrowRight,
  ArrowLeft,
  FileText,
  Download,
  Trash2,
  Edit2,
  Eye,
  Check,
  CornerDownLeft,
  MoreVertical,
  Hash
} from 'lucide-react';
import { VoiceInputButton } from './VoiceInputButton';
import { notifyTaskAssigned } from '../utils/browserNotifications';
import { ShamsiDatePicker } from './ShamsiDatePicker';
import { getTodayShamsi, getExactShamsiTimestamp } from '../utils/jalali';

// نوع پیام در پیام‌رسان تلگرام‌گونه رابو
export interface ChatMessage {
  id: string;
  senderId?: string;
  senderName: string;
  senderRole: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  chatId: string; // شناسه کانال، گروه یا چت خصوصی دو کاربره
  attachmentName?: string;
  isMyMessage?: boolean;
}

export interface ChatChannel {
  id: string;
  name: string;
  type: 'channel' | 'group' | 'direct';
  desc?: string;
  avatar?: string;
  membersCount?: number;
  userId?: string; // در صورت چت مستقیم دو کاربره
  unreadCount?: number;
}

export interface TaskReferralStep {
  id: string;
  fromUser: string;
  toUser: string;
  date: string;
  actionNote: string;
  attachmentName?: string;
}

export interface EnhancedTaskItem extends ProjectTaskItem {
  projectId?: string;
  projectName?: string;
  priority?: 'فوری' | 'بالا' | 'عادی';
  attachments?: Array<{ id: string; name: string; date: string }>;
  referralChain?: TaskReferralStep[];
}

interface TasksCollaborationViewProps {
  currentUser: Employee;
  personnelList: Employee[];
  projectsList: Project[];
  todayStr: string;
  setToastMessage: (msg: string) => void;
  tasksList?: EnhancedTaskItem[];
  setTasksList?: React.Dispatch<React.SetStateAction<EnhancedTaskItem[]>>;
  messages?: ChatMessage[];
  setMessages?: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  initialTab?: 'tasks' | 'chat';
}

// لیست ایموجی‌های پرکاربرد
const COMMON_EMOJIS = [
  '👍', '👏', '✅', '🔥', '📋', '🏗️', '🏢', '⚡', '💼', '🤝',
  '🎉', '⚠️', '❤️', '💡', '📌', '🚀', '✍️', '🔍', '😀', '🙏'
];

export const TasksCollaborationView: React.FC<TasksCollaborationViewProps> = ({
  currentUser,
  personnelList,
  projectsList,
  todayStr,
  setToastMessage,
  tasksList: propTasksList,
  setTasksList: propSetTasksList,
  messages: propMessages,
  setMessages: propSetMessages,
  initialTab = 'tasks'
}) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'chat'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // ==================== TASK MANAGEMENT STATE ====================
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');
  const [taskProjectFilter, setTaskProjectFilter] = useState<string>('all');
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>('');

  const [internalTasksList, setInternalTasksList] = useState<EnhancedTaskItem[]>([]);
  const tasksList = propTasksList ?? internalTasksList;
  const setTasksList = propSetTasksList ?? setInternalTasksList;

  // Modal 1: تعریف وظیفه جدید
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    projectId: projectsList[0]?.id || '',
    assigneeName: personnelList[0]?.name || '',
    dueDate: todayStr,
    priority: 'عادی' as 'فوری' | 'بالا' | 'عادی',
    notes: ''
  });
  const [newTaskFile, setNewTaskFile] = useState<File | null>(null);

  // Modal 2: اقدام و ارجاع به نفر جدید
  const [referralModalTask, setReferralModalTask] = useState<EnhancedTaskItem | null>(null);
  const [referralTargetUser, setReferralTargetUser] = useState(personnelList[1]?.name || '');
  const [referralActionNote, setReferralActionNote] = useState('');
  const [referralFile, setReferralFile] = useState<File | null>(null);

  // Modal 3: مشاهده کامل جزئیات و زنجیره ارجاع
  const [viewDetailTask, setViewDetailTask] = useState<EnhancedTaskItem | null>(null);

  // ==================== MINI TELEGRAM CHAT STATE ====================
  const [activeChatTab, setActiveChatTab] = useState<'all' | 'direct' | 'group' | 'channel'>('all');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string>('general');
  const [messageInput, setMessageInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Modals for creating groups / channels / finding users
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([currentUser.name]);

  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');

  // لیست کانال‌ها و گفتگوها
  const [channels, setChannels] = useState<ChatChannel[]>([
    { id: 'general', name: 'اطلاعیه‌ها و هماهنگی عمومی', type: 'channel', desc: 'پیام‌های عمومی مدیریت و بخشنامه‌ها', membersCount: personnelList.length },
    { id: 'fire', name: 'کارگروه تخصصی مهندسی حریق', type: 'group', desc: 'پرونده‌های شهرسازی، نقشه‌ها و تاییدیه آتش‌نشانی', membersCount: 5 },
    { id: 'energy', name: 'کارگروه ممیزی و احداث نیروگاه خورشیدی', type: 'group', desc: 'ممیزی انرژی صنایع و سامانه‌های تجدیدپذیر', membersCount: 4 },
    { id: 'mgmt', name: 'کارگروه سیستم‌های مدیریت ISO', type: 'group', desc: 'استقرار ایزو و مشاوره‌های کنترل کیفیت', membersCount: 3 },
    { 
      id: `direct-${personnelList[1]?.id || 'EMP-02'}`, 
      name: personnelList[1]?.name || 'آقای صادقی', 
      type: 'direct', 
      desc: personnelList[1]?.role || 'کارشناس ارشد فروش',
      avatar: personnelList[1]?.avatar,
      userId: personnelList[1]?.id
    },
    { 
      id: `direct-${personnelList[2]?.id || 'EMP-05'}`, 
      name: personnelList[2]?.name || 'مهندس کاظمی', 
      type: 'direct', 
      desc: personnelList[2]?.role || 'مهندس ناظر ارشد حریق',
      avatar: personnelList[2]?.avatar,
      userId: personnelList[2]?.id
    }
  ]);

  // پیام‌ها
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([]);
  const messages = propMessages ?? internalMessages;
  const setMessages = propSetMessages ?? setInternalMessages;

  // ==================== HANDLERS: TASKS ====================
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) return;

    const matchedProj = projectsList.find(p => p.id === newTaskForm.projectId);
    const newAttachments = newTaskFile ? [{
      id: `att-${Date.now()}`,
      name: newTaskFile.name,
      date: todayStr
    }] : [];

    const created: EnhancedTaskItem = {
      id: `TSK-${Date.now().toString().slice(-4)}`,
      title: newTaskForm.title,
      assigneeName: newTaskForm.assigneeName,
      dueDate: newTaskForm.dueDate,
      status: 'در حال انجام',
      priority: newTaskForm.priority,
      projectId: newTaskForm.projectId,
      projectName: matchedProj?.name || 'پروژه عمومی',
      notes: newTaskForm.notes,
      attachments: newAttachments,
      referralChain: [
        {
          id: `ref-${Date.now()}`,
          fromUser: `${currentUser.name} (${currentUser.role})`,
          toUser: newTaskForm.assigneeName,
          date: getExactShamsiTimestamp(),
          actionNote: newTaskForm.notes || 'تعریف وظیفه اولیه در سامانه',
          attachmentName: newTaskFile ? newTaskFile.name : undefined
        }
      ]
    };

    setTasksList([created, ...tasksList]);
    setShowAddTaskModal(false);

    // ارسال نوتیفیکیشن مرورگری برای تعریف وظیفه
    notifyTaskAssigned({
      taskTitle: created.title,
      assigneeName: created.assigneeName,
      projectName: created.projectName,
      dueDate: created.dueDate,
      priority: created.priority
    });

    setNewTaskForm({
      title: '',
      projectId: projectsList[0]?.id || '',
      assigneeName: personnelList[0]?.name || '',
      dueDate: todayStr,
      priority: 'عادی',
      notes: ''
    });
    setNewTaskFile(null);
    setToastMessage(`وظیفه جدید با موفقیت برای «${created.assigneeName}» ثبت و ابلاغ شد.`);
  };

  // ویرایش وظیفه
  const [editingTask, setEditingTask] = useState<EnhancedTaskItem | null>(null);
  const [editTaskForm, setEditTaskForm] = useState({
    title: '',
    assigneeName: '',
    dueDate: todayStr,
    priority: 'عادی' as 'فوری' | 'بالا' | 'عادی',
    notes: ''
  });

  // ثبت اقدام و ارجاع وظیفه به همکار بعدی
  const handleExecuteReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralModalTask) return;
    if (!referralActionNote.trim()) {
      setToastMessage('لطفاً شرح اقدام یا دستور ارجاع را بنویسید.');
      return;
    }

    const newStep: TaskReferralStep = {
      id: `ref-${Date.now()}`,
      fromUser: `${currentUser.name} (${currentUser.role})`,
      toUser: referralTargetUser,
      date: getExactShamsiTimestamp(),
      actionNote: referralActionNote.trim(),
      attachmentName: referralFile ? referralFile.name : undefined
    };

    const existingChain = referralModalTask.referralChain || (referralModalTask as any).referralHistory || [];
    const updatedChain: TaskReferralStep[] = [...existingChain, newStep];

    const updatedAttachments = referralFile ? [
      ...(referralModalTask.attachments || []),
      {
        id: `att-${Date.now()}`,
        name: referralFile.name,
        date: todayStr
      }
    ] : (referralModalTask.attachments || []);

    const updatedTask: EnhancedTaskItem = {
      ...referralModalTask,
      assigneeName: referralTargetUser,
      status: 'در حال انجام',
      referralChain: updatedChain,
      referralHistory: updatedChain,
      attachments: updatedAttachments
    } as any;

    setTasksList(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));

    // ارسال نوتیفیکیشن مرورگر برای نفر جدید
    notifyTaskAssigned({
      taskTitle: updatedTask.title,
      assigneeName: referralTargetUser,
      projectName: updatedTask.projectName,
      dueDate: updatedTask.dueDate,
      priority: updatedTask.priority
    });

    setReferralModalTask(null);
    setReferralActionNote('');
    setReferralFile(null);
    setToastMessage(`اقدام ثبت و وظیفه با موفقیت به «${referralTargetUser}» ابلاغ گردید.`);
  };

  const handleDeleteTask = (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('آیا از حذف این وظیفه اطمینان دارید؟')) return;
    setTasksList(prev => prev.filter(t => t.id !== taskId));
    setToastMessage('وظیفه با موفقیت حذف گردید.');
    if (viewDetailTask?.id === taskId) setViewDetailTask(null);
  };

  const handleOpenEditTask = (task: EnhancedTaskItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTask(task);
    setEditTaskForm({
      title: task.title,
      assigneeName: task.assigneeName,
      dueDate: task.dueDate || todayStr,
      priority: task.priority || 'عادی',
      notes: task.notes || ''
    });
  };

  const handleSaveEditTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    const updated: EnhancedTaskItem = {
      ...editingTask,
      title: editTaskForm.title.trim(),
      assigneeName: editTaskForm.assigneeName,
      dueDate: editTaskForm.dueDate,
      priority: editTaskForm.priority,
      notes: editTaskForm.notes
    };
    setTasksList(prev => prev.map(t => t.id === updated.id ? updated : t));
    setEditingTask(null);
    setToastMessage(`وظیفه «${updated.title}» با موفقیت ویرایش شد.`);
  };

  const handleToggleTaskStatus = (taskId: string) => {
    setTasksList(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextStatus = t.status === 'انجام شده' ? 'در حال انجام' : 'انجام شده';
        return { ...t, status: nextStatus as any };
      }
      return t;
    }));
  };

  // ==================== HANDLERS: TELEGRAM CHAT ====================
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() && !attachedFile) return;

    const newMsg: ChatMessage = {
      id: `MSG-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderAvatar: currentUser.avatar,
      content: messageInput.trim(),
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      chatId: selectedChatId,
      attachmentName: attachedFile ? attachedFile.name : undefined,
      isMyMessage: true
    };

    setMessages([...messages, newMsg]);
    setMessageInput('');
    setAttachedFile(null);
    setShowEmojiPicker(false);
  };

  const handleStartDirectChat = (user: Employee) => {
    const directId = `direct-${user.id}`;
    const exists = channels.find(c => c.id === directId);
    if (!exists) {
      const newChannel: ChatChannel = {
        id: directId,
        name: user.name,
        type: 'direct',
        desc: user.role,
        avatar: user.avatar,
        userId: user.id
      };
      setChannels([newChannel, ...channels]);
    }
    setSelectedChatId(directId);
    setShowNewChatModal(false);
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const newGroup: ChatChannel = {
      id: `group-${Date.now()}`,
      name: newGroupName.trim(),
      type: 'group',
      desc: newGroupDesc.trim() || 'گروه هماهنگی تیمی',
      membersCount: newGroupMembers.length
    };

    setChannels([newGroup, ...channels]);
    setSelectedChatId(newGroup.id);
    setShowNewGroupModal(false);
    setNewGroupName('');
    setNewGroupDesc('');
    setToastMessage(`گروه «${newGroup.name}» با موفقیت ایجاد شد.`);
  };

  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const newChan: ChatChannel = {
      id: `channel-${Date.now()}`,
      name: newChannelName.trim(),
      type: 'channel',
      desc: newChannelDesc.trim() || 'کانال اطلاع‌رسانی رسمی رابو',
      membersCount: personnelList.length
    };

    setChannels([newChan, ...channels]);
    setSelectedChatId(newChan.id);
    setShowNewChannelModal(false);
    setNewChannelName('');
    setNewChannelDesc('');
    setToastMessage(`کانال «${newChan.name}» ایجاد شد.`);
  };

  // Filter tasks with data isolation for non-managers
  const filteredTasks = tasksList.filter(t => {
    // Data isolation: non-managers only see tasks assigned to them or in their referral chain
    if (!currentUser.isManager) {
      const isAssigned = 
        t.assigneeId === currentUser.id ||
        t.assigneeName === currentUser.name ||
        t.referralChain?.some(r => r.toUser.includes(currentUser.name) || r.fromUser.includes(currentUser.name));
      if (!isAssigned) return false;
    }

    if (taskStatusFilter !== 'all' && t.status !== taskStatusFilter) return false;
    if (taskProjectFilter !== 'all' && t.projectId !== taskProjectFilter) return false;
    if (taskSearchQuery.trim()) {
      const q = taskSearchQuery.trim().toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchUser = t.assigneeName.toLowerCase().includes(q);
      const matchProj = t.projectName?.toLowerCase().includes(q);
      if (!matchTitle && !matchUser && !matchProj) return false;
    }
    return true;
  });

  // Filter channels
  const filteredChannels = channels.filter(c => {
    if (activeChatTab !== 'all' && c.type !== activeChatTab) return false;
    if (chatSearchQuery.trim()) {
      const q = chatSearchQuery.trim().toLowerCase();
      return c.name.toLowerCase().includes(q) || c.desc?.toLowerCase().includes(q);
    }
    return true;
  });

  const activeChat = channels.find(c => c.id === selectedChatId) || channels[0];
  const activeMessages = messages.filter(m => m.chatId === selectedChatId);

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar with Mode Switch */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#13213c] text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
            {activeTab === 'tasks' ? <CheckSquare className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base font-black text-[#13213c]">
              {activeTab === 'tasks' ? 'کارتابل وظایف و چرخه ارجاع اقدامات تیمی' : 'پیام‌رسان درون‌سازمانی رابو (رابوگرام)'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === 'tasks' 
                ? 'تعریف وظایف، زنجیره اقدام و ارجاع نفر به نفر، بارگذاری اسناد و اعلان مرورگر'
                : 'گفتگوی مستقیم با پرسنل، ایجاد گروه‌ها و کانال‌های سازمانی با پشتیبانی از ایموجی و فایل'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl self-start sm:self-auto text-xs font-bold">
          {(currentUser.isManager || currentUser.permissions?.tasks_board) && (
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-white text-[#13213c] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-amber-600" />
              <span>وظایف و ارجاعات ({filteredTasks.length})</span>
            </button>
          )}

          {(currentUser.isManager || currentUser.permissions?.tasks_chat) && (
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-[#13213c] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span>پیام‌رسان تیمی</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. TAB A: TASKS & REFERRAL CHAIN VIEW */}
      {/* ============================================================== */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Action & Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowAddTaskModal(true)}
                className="bg-[#800000] hover:bg-[#660000] text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>تعریف وظیفه و اقدام جدید</span>
              </button>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTaskStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                    taskStatusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  همه ({tasksList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskStatusFilter('در حال انجام')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                    taskStatusFilter === 'در حال انجام' ? 'bg-amber-100 text-amber-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  در حال انجام
                </button>
                <button
                  type="button"
                  onClick={() => setTaskStatusFilter('انجام شده')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                    taskStatusFilter === 'انجام شده' ? 'bg-emerald-100 text-emerald-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  تکمیل‌شده
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <select
                value={taskProjectFilter}
                onChange={e => setTaskProjectFilter(e.target.value)}
                className="p-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-700 outline-none w-full sm:w-48"
              >
                <option value="all">همه پروژه‌ها</option>
                {projectsList.map(p => (
                  <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
                ))}
              </select>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={taskSearchQuery}
                  onChange={e => setTaskSearchQuery(e.target.value)}
                  placeholder="جستجوی تسک، مسئول..."
                  className="w-full pl-2.5 pr-8 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                />
              </div>
            </div>
          </div>

          {/* Tasks Table with Referral Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="p-3.5 w-12 text-center">وضعیت</th>
                    <th className="p-3.5">کد و عنوان وظیفه</th>
                    <th className="p-3.5">پروژه مرتبط</th>
                    <th className="p-3.5">مسئول فعلی اقدام</th>
                    <th className="p-3.5">مهلت تحویل</th>
                    <th className="p-3.5">اولویت</th>
                    <th className="p-3.5 text-center">مدارک و زنجیره ارجاع</th>
                    <th className="p-3.5 text-center">عملیات و ارجاع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400">
                        هیچ وظیفه‌ای مطابق فیلتر یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map(task => {
                      const chainLength = task.referralChain?.length || 1;
                      const hasAttachments = (task.attachments?.length || 0) > 0;

                      return (
                        <tr 
                          key={task.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            task.status === 'انجام شده' ? 'bg-slate-50/50 opacity-75' : ''
                          }`}
                        >
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={task.status === 'انجام شده'}
                              onChange={() => handleToggleTaskStatus(task.id)}
                              className="w-4 h-4 rounded text-[#800000] accent-[#800000] cursor-pointer"
                            />
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span className="font-mono text-[11px] text-amber-700 font-bold">{task.id}</span>
                              <span className={task.status === 'انجام شده' ? 'line-through text-slate-400' : ''}>
                                {task.title}
                              </span>
                            </div>
                            {task.notes && (
                              <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 max-w-xs">
                                {task.notes}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className="text-[11.5px] text-[#13213c] font-medium block truncate max-w-[180px]">
                              {task.projectName || '-'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center text-[10px] font-bold">
                                {task.assigneeName.slice(0, 1)}
                              </div>
                              <span className="font-semibold text-slate-800">{task.assigneeName}</span>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-slate-600">
                            {task.dueDate}
                          </td>
                          <td className="p-3.5">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              task.priority === 'فوری'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : task.priority === 'بالا'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {task.priority || 'عادی'}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => setViewDetailTask(task)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium cursor-pointer transition-colors"
                            >
                              <span>{chainLength} مرحله ارجاع</span>
                              {hasAttachments && (
                                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                              )}
                            </button>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* دکمه اقدام و ارجاع به نفر جدید */}
                              <button
                                type="button"
                                onClick={() => {
                                  setReferralModalTask(task);
                                  setReferralTargetUser(personnelList.find(p => p.name !== task.assigneeName)?.name || personnelList[0]?.name || '');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] cursor-pointer flex items-center gap-1 transition-all"
                                title="اقدام بر روی این وظیفه و ارجاع به کارشناس بعدی"
                              >
                                <CornerDownLeft className="w-3.5 h-3.5" />
                                <span>ارجاع به همکار</span>
                              </button>

                              {/* ارسال دستی اعلان مرورگر */}
                              <button
                                type="button"
                                onClick={() => {
                                  notifyTaskAssigned({
                                    taskTitle: task.title,
                                    assigneeName: task.assigneeName,
                                    projectName: task.projectName,
                                    dueDate: task.dueDate,
                                    priority: task.priority
                                  });
                                  setToastMessage(`اعلان مرورگری برای ${task.assigneeName} ارسال شد.`);
                                }}
                                className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer"
                                title="ارسال نوتیفیکیشن مرورگر"
                              >
                                <Bell className="w-3.5 h-3.5" />
                              </button>

                              {/* ویرایش تسک */}
                              <button
                                type="button"
                                onClick={(e) => handleOpenEditTask(task, e)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-[#13213c] hover:bg-slate-100 cursor-pointer transition-colors"
                                title="ویرایش وظیفه"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* حذف تسک */}
                              <button
                                type="button"
                                onClick={(e) => handleDeleteTask(task.id, e)}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                                title="حذف وظیفه"
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
      {/* 3. TAB B: MINI TELEGRAM CHAT VIEW (رابوگرام) */}
      {/* ============================================================== */}
      {activeTab === 'chat' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-4 min-h-[580px]">
          {/* سمت راست: لیست کانال‌ها، گروه‌ها و چت‌های خصوصی */}
          <div className="md:col-span-1 border-l border-slate-200 flex flex-col bg-slate-50/50">
            {/* Header Toolbar */}
            <div className="p-3 border-b border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-[#13213c] flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  <span>گفتگوهای سازمانی</span>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowNewChatModal(true)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title="گفتگوی مستقیم با کاربر جدید"
                  >
                    <User className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewGroupModal(true)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title="ایجاد گروه جدید"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewChannelModal(true)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title="ایجاد کانال جدید"
                  >
                    <Radio className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={chatSearchQuery}
                  onChange={e => setChatSearchQuery(e.target.value)}
                  placeholder="جستجوی کاربر یا گروه..."
                  className="w-full pl-2.5 pr-8 py-1.5 text-xs bg-slate-100 border border-transparent rounded-lg outline-none focus:bg-white focus:border-slate-300"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 text-[11px] font-bold overflow-x-auto pt-1">
                <button
                  type="button"
                  onClick={() => setActiveChatTab('all')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer ${
                    activeChatTab === 'all' ? 'bg-[#13213c] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  همه
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChatTab('direct')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer ${
                    activeChatTab === 'direct' ? 'bg-[#13213c] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  کاربران
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChatTab('group')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer ${
                    activeChatTab === 'group' ? 'bg-[#13213c] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  گروه‌ها
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChatTab('channel')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer ${
                    activeChatTab === 'channel' ? 'bg-[#13213c] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  کانال‌ها
                </button>
              </div>
            </div>

            {/* Chat List */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {filteredChannels.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  موردی یافت نشد.
                </div>
              ) : (
                filteredChannels.map(ch => {
                  const isSelected = selectedChatId === ch.id;
                  const isDirect = ch.type === 'direct';
                  const isChannel = ch.type === 'channel';

                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setSelectedChatId(ch.id)}
                      className={`w-full p-3 text-right flex items-center gap-2.5 transition-colors cursor-pointer ${
                        isSelected ? 'bg-amber-50/80 border-r-4 border-amber-500' : 'hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="relative shrink-0">
                        {ch.avatar ? (
                          <img src={ch.avatar} alt={ch.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                        ) : (
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs ${
                            isChannel ? 'bg-indigo-600' : isDirect ? 'bg-emerald-600' : 'bg-[#13213c]'
                          }`}>
                            {isChannel ? <Radio className="w-5 h-5" /> : isDirect ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                          </div>
                        )}
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 left-0" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-xs font-bold text-slate-900 truncate">
                            {ch.name}
                          </strong>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {ch.desc}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* سمت چپ: پنجره چت فعال (Active Chat Window) */}
          <div className="md:col-span-3 flex flex-col justify-between h-[580px] bg-slate-50/30">
            {/* هدر چت روم */}
            <div className="p-3.5 border-b border-slate-200 bg-white flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#13213c] text-white flex items-center justify-center font-bold text-xs">
                  {activeChat.type === 'channel' ? <Radio className="w-4 h-4" /> : activeChat.type === 'direct' ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#13213c] flex items-center gap-1.5">
                    <span>{activeChat.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({activeChat.desc})</span>
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-700 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>آنلاین و متصل به شبکه ابری رابو</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400">
                اتوماسیون رابوگرام
              </div>
            </div>

            {/* لیست پیام‌ها */}
            <div className="p-4 overflow-y-auto space-y-3.5 flex-1 bg-gradient-to-b from-slate-50/50 to-white">
              {activeMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
                  <MessageSquare className="w-10 h-10 text-slate-300" />
                  <span>هنوز پیامی در این گفتگو ارسال نشده است. اولین پیام را ارسال کنید.</span>
                </div>
              ) : (
                activeMessages.map(msg => {
                  const isMe = msg.senderName === currentUser.name || msg.isMyMessage;

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
                    >
                      <img
                        src={msg.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                        alt={msg.senderName}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0 mt-1"
                      />

                      <div className={`p-3 rounded-2xl max-w-md shadow-2xs space-y-1.5 text-xs ${
                        isMe
                          ? 'bg-[#13213c] text-white rounded-tr-xs'
                          : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                      }`}>
                        <div className="flex items-center justify-between gap-3 text-[11px] pb-1 border-b border-white/10">
                          <strong className={isMe ? 'text-amber-400 font-bold' : 'text-[#800000] font-black'}>
                            {msg.senderName}
                          </strong>
                          <span className={`text-[10px] font-mono ${isMe ? 'text-slate-300' : 'text-slate-400'}`}>
                            {msg.timestamp}
                          </span>
                        </div>

                        <p className="leading-relaxed text-justify whitespace-pre-wrap">
                          {msg.content}
                        </p>

                        {msg.attachmentName && (
                          <div className={`mt-2 p-2 rounded-xl flex items-center justify-between gap-2 text-[11px] font-bold ${
                            isMe ? 'bg-white/10 text-amber-300' : 'bg-slate-100 text-blue-700'
                          }`}>
                            <div className="flex items-center gap-1.5 truncate">
                              <Paperclip className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{msg.attachmentName}</span>
                            </div>
                            <Download className="w-3.5 h-3.5 shrink-0 cursor-pointer" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* جعبه ارسال پیام همراه با ایموجی، ضمیمه فایل و صوت */}
            <div className="p-3 border-t border-slate-200 bg-white relative">
              {/* Emoji Picker Popup */}
              {showEmojiPicker && (
                <div className="absolute bottom-full right-3 mb-2 p-2.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 grid grid-cols-10 gap-1 animate-in fade-in zoom-in-95 duration-100">
                  {COMMON_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setMessageInput(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-lg cursor-pointer transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* File Attachment preview pill */}
              {attachedFile && (
                <div className="mb-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-amber-700" />
                    <span>فایل ضمیمه: {attachedFile.name}</span>
                  </span>
                  <button type="button" onClick={() => setAttachedFile(null)} className="text-slate-400 hover:text-slate-700">✕</button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                {/* دکمه انتخاب ایموجی */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(prev => !prev)}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
                  title="انتخاب ایموجی"
                >
                  <Smile className="w-5 h-5 text-amber-600" />
                </button>

                {/* دکمه الصاق فایل */}
                <input
                  type="file"
                  id="chat-attach-file"
                  className="hidden"
                  onChange={e => setAttachedFile(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="chat-attach-file"
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
                  title="الصاق فایل یا سند"
                >
                  <Paperclip className="w-5 h-5 text-slate-600" />
                </label>

                {/* تایپ صوتی */}
                <VoiceInputButton
                  onTranscript={txt => setMessageInput(prev => prev ? `${prev} ${txt}` : txt)}
                  buttonText=""
                />

                <input
                  type="text"
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  placeholder="پیام خود را بنویسید (یا از میکروفون صوتی استفاده کنید)..."
                  className="flex-1 p-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#13213c] bg-slate-50"
                />

                <button
                  type="submit"
                  className="bg-[#800000] hover:bg-[#660000] text-white p-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">ارسال</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. MODALS */}
      {/* ============================================================== */}

      {/* MODAL 1: تعریف وظیفه جدید (کادر جادارتر و فیلد آپلود مدرک) */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#13213c] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">تعریف وظیفه و اقدام جدید در سامانه رابو</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTaskModal(false)}
                className="text-white/70 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">عنوان اقدام / تسک *</label>
                <input
                  type="text"
                  required
                  value={newTaskForm.title}
                  onChange={e => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  placeholder="مثال: تست نهایی هیدرواستاتیک رایزر پروژه نگین"
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#13213c] text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">پروژه مرتبط</label>
                  <select
                    value={newTaskForm.projectId}
                    onChange={e => setNewTaskForm({ ...newTaskForm, projectId: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none bg-white font-medium"
                  >
                    {projectsList.map(p => (
                      <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-bold">کارشناس مسئول (نفر اول اقدام) *</label>
                    <button
                      type="button"
                      onClick={() => setNewTaskForm({ ...newTaskForm, assigneeName: currentUser.name })}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                    >
                      ارجاع به من ({currentUser.name})
                    </button>
                  </div>
                  <select
                    value={newTaskForm.assigneeName}
                    onChange={e => setNewTaskForm({ ...newTaskForm, assigneeName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none bg-white font-medium"
                  >
                    {personnelList.map(p => (
                      <option key={p.id} value={p.name}>{p.name} ({p.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <ShamsiDatePicker
                  label="مهلت اقدام و تحویل (سررسید) *"
                  value={newTaskForm.dueDate}
                  onChange={(val) => setNewTaskForm({ ...newTaskForm, dueDate: val })}
                />

                <div>
                  <label className="block text-slate-700 font-bold mb-1">سطح اولویت</label>
                  <select
                    value={newTaskForm.priority}
                    onChange={e => setNewTaskForm({ ...newTaskForm, priority: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none bg-white font-medium"
                  >
                    <option value="عادی">عادی</option>
                    <option value="بالا">بالا</option>
                    <option value="فوری">فوری (بحرانی)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">شرح جزئیات و دستورالعمل اجرایی</label>
                <textarea
                  rows={2}
                  value={newTaskForm.notes}
                  onChange={e => setNewTaskForm({ ...newTaskForm, notes: e.target.value })}
                  placeholder="دستورات دقیق فنی، منابع استاندارد و الزامات..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              {/* آپلود مدرک / فایل ضمیمه */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  پیوست مدارک و نقشه‌ها (PDF، DWG، تصویر)
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 text-center hover:bg-slate-50 transition-colors">
                  <input
                    type="file"
                    id="new-task-file"
                    className="hidden"
                    onChange={e => setNewTaskFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="new-task-file" className="cursor-pointer flex items-center justify-center gap-2 text-slate-600">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold">
                      {newTaskFile ? newTaskFile.name : 'انتخاب فایل سند یا نقشه پروژه'}
                    </span>
                  </label>
                </div>
              </div>

              {/* اطلاع‌رسانی نوتیفیکیشن */}
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>با ثبت این وظیفه، بلافاصله اعلان مرورگری (Browser Notification) با صدای زنگ برای کارشناس ارسال خواهد شد.</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#800000] hover:bg-[#660000] text-white font-bold cursor-pointer shadow-xs"
                >
                  ثبت وظیفه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: اقدام و ارجاع به نفر جدید (زنجیره اقدام و ارجاع) */}
      {referralModalTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-indigo-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CornerDownLeft className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-bold text-sm">اقدام و ارجاع وظیفه به همکار بعدی</h3>
                  <span className="text-[11px] text-indigo-200">{referralModalTask.id}: {referralModalTask.title}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReferralModalTask(null)}
                className="text-white/70 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteReferral} className="p-5 space-y-3.5 text-xs">
              <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-200 text-indigo-900">
                <div className="font-bold">ارجاع‌دهنده: {currentUser.name} ({currentUser.role})</div>
                <div className="text-[11px] text-indigo-700 mt-0.5">مسئول فعلی: {referralModalTask.assigneeName}</div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  ارجاع به همکار جدید (نفر بعدی اقدام) *
                </label>
                <select
                  value={referralTargetUser}
                  onChange={e => setReferralTargetUser(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none bg-white font-bold text-slate-800"
                >
                  {personnelList.map(p => (
                    <option key={p.id} value={p.name}>{p.name} - {p.role} ({p.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  شرح اقدام انجام‌شده و دستور ارجاع به نفر جدید *
                </label>
                <textarea
                  rows={3}
                  required
                  value={referralActionNote}
                  onChange={e => setReferralActionNote(e.target.value)}
                  placeholder="مثال: نقشه‌های زون ۳ بازنگری شد و اصلاحات معماری لحاظ گردید. جهت محاسبات هیدرولیک و استعلام تاییدیه‌ها به مهندس کاظمی ارجاع می‌شود."
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              {/* الصاق مدارک اقدام */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  ضمیمه مدارک و فایل‌های حاصل از اقدام (اختیاری)
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 text-center hover:bg-slate-50 transition-colors">
                  <input
                    type="file"
                    id="referral-file"
                    className="hidden"
                    onChange={e => setReferralFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="referral-file" className="cursor-pointer flex items-center justify-center gap-1.5 text-slate-600">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold">
                      {referralFile ? referralFile.name : 'انتخاب فایل گزارش، نقشه یا چک‌لیست امضاشده'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReferralModalTask(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <CornerDownLeft className="w-4 h-4" />
                  <span>ثبت اقدام و ابلاغ به نفر جدید</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: مشاهده کامل جزئیات و تاریخچه زنجیره ارجاع */}
      {viewDetailTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="bg-[#13213c] text-white p-4 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-sm">{viewDetailTask.id}: {viewDetailTask.title}</h3>
                <span className="text-[11px] text-amber-300">{viewDetailTask.projectName}</span>
              </div>
              <button
                type="button"
                onClick={() => setViewDetailTask(null)}
                className="text-white/70 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div><strong>مسئول فعلی:</strong> {viewDetailTask.assigneeName}</div>
                <div><strong>مهلت اقدام:</strong> {viewDetailTask.dueDate}</div>
                <div><strong>سطح اولویت:</strong> {viewDetailTask.priority}</div>
                <div><strong>وضعیت:</strong> {viewDetailTask.status}</div>
              </div>

              {/* زنجیره ارجاع و تایم‌لاین اقدامات */}
              <div>
                <h4 className="font-black text-slate-800 mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>زنجیره ارجاع و مسیر اقدامات ثبت‌شده:</span>
                </h4>

                <div className="space-y-3 border-r-2 border-indigo-200 pr-3 mr-2">
                  {viewDetailTask.referralChain?.map((step, idx) => (
                    <div key={step.id || idx} className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-200/80 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-indigo-950">
                          {step.fromUser} ➔ {step.toUser}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">{step.date}</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed text-justify">
                        "{step.actionNote}"
                      </p>
                      {step.attachmentName && (
                        <div className="text-[10.5px] text-blue-700 font-bold flex items-center gap-1 pt-1 border-t border-indigo-100">
                          <Paperclip className="w-3 h-3" />
                          <span>سند ضمیمه‌شده: {step.attachmentName}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* مدارک ضمیمه تسک */}
              {viewDetailTask.attachments && viewDetailTask.attachments.length > 0 && (
                <div>
                  <h4 className="font-black text-slate-800 mb-2 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-amber-600" />
                    <span>اسناد و نقشه‌های پیوست:</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {viewDetailTask.attachments.map(att => (
                      <div key={att.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                        <div className="truncate">
                          <div className="font-bold text-slate-800 truncate text-[11px]">{att.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{att.date}</div>
                        </div>
                        <Download className="w-4 h-4 text-blue-600 cursor-pointer shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewDetailTask(null)}
                className="px-4 py-2 bg-[#13213c] text-white font-bold rounded-xl cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: چت با کاربر جدید */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#13213c] text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">انتخاب همکار جهت گفتگوی مستقیم</h3>
              <button type="button" onClick={() => setShowNewChatModal(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
              {personnelList.filter(p => p.id !== currentUser.id).map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleStartDirectChat(user)}
                  className="w-full p-2.5 flex items-center gap-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer text-right"
                >
                  <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                  <div>
                    <div className="font-bold text-slate-900">{user.name}</div>
                    <div className="text-[11px] text-slate-500">{user.role} ({user.unit})</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: ایجاد گروه جدید */}
      {showNewGroupModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#13213c] text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">ایجاد گروه کاری جدید</h3>
              <button type="button" onClick={() => setShowNewGroupModal(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">نام گروه *</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="مثال: تیم نظارت کارگاهی برج آفتاب"
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">شرح و اهداف گروه</label>
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                  placeholder="هماهنگی‌های اجرایی، گزارشات روزانه..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowNewGroupModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 font-bold cursor-pointer">انصراف</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#800000] text-white font-bold cursor-pointer">ایجاد گروه</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: ایجاد کانال جدید */}
      {showNewChannelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#13213c] text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">ایجاد کانال اطلاع‌رسانی جدید</h3>
              <button type="button" onClick={() => setShowNewChannelModal(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateChannel} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">نام کانال *</label>
                <input
                  type="text"
                  required
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  placeholder="مثال: بخشنامه‌ها و آموزش‌های تخصصی HSE"
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">توضیحات کانال</label>
                <input
                  type="text"
                  value={newChannelDesc}
                  onChange={e => setNewChannelDesc(e.target.value)}
                  placeholder="اطلاع‌رسانی یک‌طرفه آخرین الزامات..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowNewChannelModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 font-bold cursor-pointer">انصراف</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#13213c] text-white font-bold cursor-pointer">ایجاد کانال</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ویرایش تسک / وظیفه */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#13213c] text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">ویرایش وظیفه ({editingTask.id})</h3>
              <button type="button" onClick={() => setEditingTask(null)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveEditTask} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">عنوان وظیفه *</label>
                <input
                  type="text"
                  required
                  value={editTaskForm.title}
                  onChange={e => setEditTaskForm({ ...editTaskForm, title: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">مسئول اقدام</label>
                  <select
                    value={editTaskForm.assigneeName}
                    onChange={e => setEditTaskForm({ ...editTaskForm, assigneeName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none bg-white font-bold"
                  >
                    {personnelList.map(p => (
                      <option key={p.id} value={p.name}>{p.name} ({p.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">مهلت اقدام (سررسید)</label>
                  <input
                    type="text"
                    value={editTaskForm.dueDate}
                    onChange={e => setEditTaskForm({ ...editTaskForm, dueDate: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">سطح اولویت</label>
                <select
                  value={editTaskForm.priority}
                  onChange={e => setEditTaskForm({ ...editTaskForm, priority: e.target.value as any })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none bg-white"
                >
                  <option value="عادی">عادی</option>
                  <option value="بالا">بالا</option>
                  <option value="فوری">فوری</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">توضیحات و یادداشت</label>
                <textarea
                  rows={2}
                  value={editTaskForm.notes}
                  onChange={e => setEditTaskForm({ ...editTaskForm, notes: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setEditingTask(null)} className="px-4 py-2 rounded-xl bg-slate-100 font-bold cursor-pointer">انصراف</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#13213c] text-white font-bold cursor-pointer">ذخیره تغییرات</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
