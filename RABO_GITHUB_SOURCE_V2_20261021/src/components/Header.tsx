import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { 
  Calendar, 
  Compass, 
  LogOut, 
  Download, 
  Menu, 
  Bell, 
  BellRing, 
  CheckCircle2, 
  CheckSquare, 
  Mail, 
  RefreshCw,
  CheckCheck,
  Trash2,
  ExternalLink,
  Clock,
  DollarSign,
  PhoneCall,
  Maximize2,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react';
import { 
  getBrowserNotificationPermission, 
  requestBrowserNotificationPermission, 
  sendBrowserNotification,
  notifyTaskAssigned,
  notifyLetterDueDate
} from '../utils/browserNotifications';
import {
  NotificationHistoryItem,
  getStoredNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotificationFromHistory,
  subscribeToNotifications
} from '../utils/notificationStore';

interface HeaderProps {
  currentView: string;
  currentUser: Employee;
  todayStr: string;
  onBackup?: () => void;
  onLogout?: () => void;
  onToggleMenu: () => void;
  notificationsCount?: number;
  onCheckDueLetters?: () => void;
  onNavigate?: (view: string) => void;
  onOpenNotificationCenter?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  currentUser,
  todayStr,
  onBackup,
  onLogout,
  onToggleMenu,
  notificationsCount = 0,
  onCheckDueLetters,
  onNavigate,
  onOpenNotificationCenter
}) => {
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>(getStoredNotifications);
  const [filter, setFilter] = useState<'all' | 'unread' | 'letter' | 'task'>('all');
  const [showTools, setShowTools] = useState(false);

  useEffect(() => {
    setNotifPermission(getBrowserNotificationPermission());

    const handlePermissionChange = () => {
      setNotifPermission(getBrowserNotificationPermission());
    };
    window.addEventListener('rabo-permission-changed', handlePermissionChange);

    setNotifications(getStoredNotifications());
    const unsub = subscribeToNotifications(items => {
      setNotifications(items);
    });

    return () => {
      window.removeEventListener('rabo-permission-changed', handlePermissionChange);
      unsub();
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  // مجموع کل اعلان‌های نیازمند اقدام شامل موعد سررسید و نوتیفیکیشن‌های خوانده نشده
  const displayBadgeCount = Math.max(notificationsCount, unreadCount);

  const handleToggleNotifications = async () => {
    // باز کردن منوی کشویی تاریخچه اعلان‌ها
    setShowNotifMenu(prev => !prev);
  };

  const handleEnablePermission = async () => {
    const granted = await requestBrowserNotificationPermission();
    setNotifPermission(granted ? 'granted' : 'denied');
    if (granted) {
      sendBrowserNotification({
        title: '🔔 اعلان‌های مرورگر رابو فعال شد',
        body: 'از این پس انتصاب وظایف جدید و موعد سررسید نامه‌ها به صورت اعلان مرورگری به اطلاع شما می‌رسد.'
      });
    }
  };

  const handleTestTaskNotification = () => {
    notifyTaskAssigned({
      taskTitle: 'تست سیستم: بررسی نهایی نقشه‌های تاسیسات مکانیکی و اطفا حریق',
      assigneeName: currentUser.name,
      projectName: 'پروژه برج آفتاب',
      dueDate: todayStr,
      priority: 'فوری'
    });
  };

  const handleTestLetterDueDateNotification = () => {
    notifyLetterDueDate({
      letterId: 'RABO-IN-1405-1082',
      subject: 'ابلاغیه نقص نقشه‌های تهویه و اطفا حریق برج آفتاب',
      senderOrg: 'سازمان آتش‌نشانی و خدمات ایمنی تهران',
      dueDate: todayStr,
      isUrgent: true
    });
  };

  const handleItemClick = (item: NotificationHistoryItem) => {
    markNotificationAsRead(item.id);
    if (item.actionView && onNavigate) {
      onNavigate(item.actionView);
      setShowNotifMenu(false);
    }
  };

  const handleDeleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotificationFromHistory(id);
  };

  const filteredNotifications = notifications.filter(item => {
    if (filter === 'unread') return !item.isRead;
    if (filter === 'letter') return item.type === 'letter';
    if (filter === 'task') return item.type === 'task';
    return true;
  });

  const getTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'داشبورد جامع مدیریت رابو';
      case 'letters-inbox':
        return 'کارتابل نامه‌های دریافتی و دستورات اداری';
      case 'letters-outbox-create':
        return 'ایجاد و صدور نامه ارسالی رسمی';
      case 'letters-outbox-archive':
        return 'بایگانی نامه‌های ارسالی و مدارک تحویل';
      case 'crm-leads':
        return 'بانک اطلاعات حریق';
      case 'crm-leads-energy':
        return 'بانک اطلاعات انرژی';
      case 'crm-leads-management':
        return 'بانک اطلاعات سیستم مدیریت';
      case 'crm-customers':
        return 'مشتریان و کارفرمایان رابو';
      case 'crm-due-today':
        return 'کارتابل پیگیری‌ها';
      case 'crm-meetings':
        return 'جلسات حضوری هماهنگ‌شده با کارفرمایان';
      case 'projects':
        return 'مدیریت یکپارچه پروژه‌ها (ستون فقرات سازمان)';
      case 'tasks':
        return 'مدیریت وظایف، تسک‌ها و گفتگوی تیمی';
      case 'petty-cash':
        return 'سامانه تنخواه‌گردان و فیش‌های پرداختی';
      case 'hr-attendance':
        return 'تقویم تردد، مأموریت و مرخصی';
      case 'hr-employees':
        return 'بانک اطلاعات و پرونده‌های پرسنلی';
      case 'hr-payroll':
        return 'حقوق و دستمزد قانون کار و صدور فیش‌ها';
      case 'hr-kpi':
        return 'پایش شاخص‌های عملکرد کلیدی (KPI)';
      case 'hr-training':
        return 'ماتریس آموزش و شایستگی‌های پرسنل';
      default:
        return 'اتوماسیون سازمانی شرکت مهندسی رابو';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md rounded-lg border border-slate-200/90 shadow-2xs px-4 md:px-5 py-2.5 mb-5 flex items-center justify-between gap-3">
      {/* سمت راست: دکمه منوی اصلی با دسترسی در تمامی دستگاه‌ها + عنوان صفحه */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onToggleMenu}
          className="flex items-center gap-1.5 bg-[#13213c] hover:bg-[#1c3058] text-white px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
          title="باز کردن منوی ناوبری سامانه"
        >
          <Menu className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">منوی سامانه</span>
        </button>

        <div className="w-8 h-8 rounded-lg bg-[#13213c]/5 border border-[#13213c]/10 text-[#13213c] flex items-center justify-center shrink-0">
          <Compass className="w-4 h-4 text-[#13213c]" />
        </div>

        <div className="min-w-0">
          <h1 className="text-sm md:text-base font-black text-[#13213c] tracking-tight truncate">
            {getTitle()}
          </h1>
          <p className="hidden md:block text-[11px] text-slate-400 truncate mt-0.5 font-medium">
            شرکت مهندسی رهنمون کیفیت رابو | اتوماسیون یکپارچه سازمانی
          </p>
        </div>
      </div>

      {/* سمت چپ هدر: منوی کشویی اعلان‌ها، تاریخ، مشخصات کاربر و خروج */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 relative">
        {/* دکمه سیستم اعلان‌های دریافتی (Notification Center) */}
        <div className="relative">
          <button
            type="button"
            onClick={handleToggleNotifications}
            className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
              displayBadgeCount > 0
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-300'
                : notifPermission === 'granted'
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title="مرکز اعلان‌ها و تاریخچه پیام‌ها (کلیک برای مشاهده)"
          >
            {displayBadgeCount > 0 ? (
              <BellRing className="w-4 h-4 text-rose-600 animate-bounce" />
            ) : notifPermission === 'granted' ? (
              <Bell className="w-4 h-4 text-emerald-600" />
            ) : (
              <Bell className="w-4 h-4 text-slate-600" />
            )}
            <span className="hidden md:inline text-[11px]">
              مرکز اعلان‌ها
            </span>
            {displayBadgeCount > 0 ? (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-600 text-white font-black shrink-0 animate-pulse">
                {displayBadgeCount}
              </span>
            ) : notifPermission === 'granted' ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="اعلان مرورگر فعال است" />
            ) : null}
          </button>

          {/* منوی کشویی تاریخچه اعلان‌ها (Notification Center Dropdown) */}
          {showNotifMenu && (
            <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-0 z-50 animate-in fade-in zoom-in-95 duration-150 text-right overflow-hidden flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="bg-[#13213c] text-white p-3.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-black text-xs text-white flex items-center gap-1.5">
                      <span>مرکز تاریخچه اعلان‌ها</span>
                      {unreadCount > 0 && (
                        <span className="bg-rose-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                          {unreadCount} جدید
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-300">اعلان‌های وظایف، سررسیدها و مکاتبات</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {onOpenNotificationCenter && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowNotifMenu(false);
                        onOpenNotificationCenter();
                      }}
                      className="text-white/70 hover:text-white p-1 rounded-md hover:bg-white/10 cursor-pointer text-xs flex items-center gap-0.5"
                      title="مشاهده تمام صفحه تاریخچه"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowNotifMenu(false)}
                    className="text-white/70 hover:text-white p-1 rounded-md hover:bg-white/10 cursor-pointer text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Banner مجوز مرورگر اگر هنوز فعال نشده */}
              {notifPermission !== 'granted' && (
                <div className="bg-amber-50 border-b border-amber-200 p-2.5 flex items-center justify-between gap-2 text-xs shrink-0">
                  <div className="text-[11px] text-amber-900 leading-tight">
                    جهت دریافت نوتیفیکیشن دسکتاپ هنگام بسته بودن پنجره:
                  </div>
                  <button
                    type="button"
                    onClick={handleEnablePermission}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer shrink-0 transition-colors shadow-2xs"
                  >
                    فعال‌سازی
                  </button>
                </div>
              )}

              {/* تب‌های فیلتر و دکمه‌های کنترلی */}
              <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-1 flex-wrap shrink-0 text-xs">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      filter === 'all'
                        ? 'bg-[#13213c] text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    همه ({notifications.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('unread')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      filter === 'unread'
                        ? 'bg-rose-600 text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    خوانده‌نشده ({unreadCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('letter')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      filter === 'letter'
                        ? 'bg-[#800000] text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    نامه‌ها
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('task')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      filter === 'task'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    وظایف
                  </button>
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotificationsAsRead}
                    className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>خواندن همه</span>
                  </button>
                )}
              </div>

              {/* لیست تاریخچه اعلان‌ها */}
              <div className="overflow-y-auto max-h-72 p-2.5 space-y-2 flex-1">
                {filteredNotifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 space-y-1.5">
                    <Bell className="w-7 h-7 mx-auto text-slate-300" />
                    <div className="text-xs font-bold text-slate-600">اعلانی در این دسته یافت نشد.</div>
                    <div className="text-[10px] text-slate-400">تمام هشدارها و پیام‌ها به‌صورت خودکار در اینجا آرشیو می‌شوند.</div>
                  </div>
                ) : (
                  filteredNotifications.map(item => {
                    const isTask = item.type === 'task';
                    const isLetter = item.type === 'letter';
                    const isCrm = item.type === 'crm';
                    const isFinance = item.type === 'finance';

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer group relative ${
                          item.isRead
                            ? 'bg-white hover:bg-slate-50 border-slate-200 opacity-85'
                            : 'bg-amber-50/50 hover:bg-amber-50/80 border-amber-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                                isTask
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : isLetter
                                  ? 'bg-rose-100 text-[#800000]'
                                  : isCrm
                                  ? 'bg-amber-100 text-amber-800'
                                  : isFinance
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {isTask ? (
                                <CheckSquare className="w-3.5 h-3.5" />
                              ) : isLetter ? (
                                <Mail className="w-3.5 h-3.5" />
                              ) : isCrm ? (
                                <PhoneCall className="w-3.5 h-3.5" />
                              ) : isFinance ? (
                                <DollarSign className="w-3.5 h-3.5" />
                              ) : (
                                <Bell className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <span className={`text-[11px] font-bold truncate ${item.isRead ? 'text-slate-800' : 'text-slate-900 font-black'}`}>
                              {item.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {item.timestamp}
                            </span>
                            {!item.isRead && (
                              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteItem(e, item.id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-0.5 rounded transition-opacity"
                              title="حذف این اعلان"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-relaxed pr-7 line-clamp-2">
                          {item.body}
                        </p>

                        {item.actionView && (
                          <div className="pr-7 mt-1.5 flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:underline">
                            <span>{item.actionTitle || 'مشاهده و رسیدگی در سامانه'}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* ابزارهای تست و دسترسی‌های سریع (قابلیت باز و بسته شدن) */}
              <div className="border-t border-slate-100 bg-slate-50 p-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowTools(prev => !prev)}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تست اعلان مرورگر و ابزارهای پایش</span>
                  </span>
                  {showTools ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showTools && (
                  <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        handleTestTaskNotification();
                        setShowNotifMenu(false);
                      }}
                      className="w-full text-right py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border border-indigo-200"
                    >
                      <CheckSquare className="w-3 h-3 text-indigo-600 shrink-0" />
                      <span>تست ارسال اعلان: انتصاب وظیفه جدید</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleTestLetterDueDateNotification();
                        setShowNotifMenu(false);
                      }}
                      className="w-full text-right py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-950 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border border-rose-200"
                    >
                      <Mail className="w-3 h-3 text-[#800000] shrink-0" />
                      <span>تست ارسال اعلان: فرارسیدن سررسید نامه</span>
                    </button>

                    {onCheckDueLetters && (
                      <button
                        type="button"
                        onClick={() => {
                          onCheckDueLetters();
                          setShowNotifMenu(false);
                        }}
                        className="w-full text-right py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-800 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200"
                      >
                        <RefreshCw className="w-3 h-3 text-slate-600 shrink-0" />
                        <span>پایش فوری سررسید کلیه نامه‌ها</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Footer links */}
                <div className="pt-2 mt-2 border-t border-slate-200 flex items-center justify-between text-[10px]">
                  {onNavigate && (currentUser.isManager || currentUser.permissions?.dashboard_personal || currentUser.permissions?.dashboard_executive) && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('dashboard');
                        setShowNotifMenu(false);
                      }}
                      className="text-[#13213c] hover:underline font-bold cursor-pointer"
                    >
                      مشاهده در داشبورد
                    </button>
                  )}
                  {onOpenNotificationCenter ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowNotifMenu(false);
                        onOpenNotificationCenter();
                      }}
                      className="text-indigo-700 hover:underline font-bold cursor-pointer flex items-center gap-0.5"
                    >
                      <span>نمایش تمام‌صفحه تاریخچه</span>
                      <Maximize2 className="w-2.5 h-2.5" />
                    </button>
                  ) : onNavigate && (currentUser.isManager || currentUser.permissions?.letters_inbox) ? (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('letters-inbox');
                        setShowNotifMenu(false);
                      }}
                      className="text-[#800000] hover:underline font-bold cursor-pointer"
                    >
                      کارتابل نامه‌ها
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* تاریخ روز - مینیمال و تمیز */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200/70 px-2.5 py-1.5 rounded-lg">
          <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{todayStr}</span>
        </div>

        {/* دکمه دسترسی سریع به تقویم، تردد و کارهای روزانه (دسترسی همگانی برای تمامی پرسنل) */}
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('hr-attendance')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs ${
              currentView === 'hr-attendance'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300'
            }`}
            title="تقویم جامع، مرخصی‌ها، مأموریت و چک‌لیست کارهای روزانه پرسنل"
          >
            <Calendar className={`w-4 h-4 shrink-0 ${currentView === 'hr-attendance' ? 'text-white' : 'text-amber-600'}`} />
            <span className="hidden sm:inline">تقویم و کارها</span>
          </button>
        )}

        {/* دکمه پیام‌رسان و چت تیمی سریع */}
        {onNavigate && (currentUser.isManager || currentUser.permissions?.tasks_chat) && (
          <button
            type="button"
            onClick={() => onNavigate('tasks-chat')}
            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs"
            title="گفتگو و چت تیمی رابو"
          >
            <MessageSquare className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="hidden sm:inline">چت تیمی</span>
          </button>
        )}

        {/* دکمه دانلود پشتیبان برای مدیران */}
        {currentUser.isManager && onBackup && (
          <button
            type="button"
            onClick={onBackup}
            className="text-slate-400 hover:text-[#13213c] p-2 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
            title="دانلود پشتیبان سیستم"
          >
            <Download className="w-4 h-4" />
          </button>
        )}

        {/* مشخصات کاربر و دکمه خروج */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          {currentUser.avatar ? (
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
                if (e.currentTarget.nextElementSibling) {
                  (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                }
              }}
              className="w-8 h-8 rounded-full object-cover border border-amber-400/50 shadow-2xs shrink-0"
            />
          ) : null}
          <div 
            style={{ display: currentUser.avatar ? 'none' : 'flex' }}
            className="w-8 h-8 rounded-full bg-[#13213c] text-amber-400 font-bold items-center justify-center text-xs shadow-2xs shrink-0"
          >
            {currentUser.name ? currentUser.name.slice(0, 1) : 'ر'}
          </div>
          <div className="hidden sm:block text-right">
            <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[110px]">
              {currentUser.name}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              {currentUser.role}
            </div>
          </div>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer mr-1"
              title="خروج از حساب کاربری"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
